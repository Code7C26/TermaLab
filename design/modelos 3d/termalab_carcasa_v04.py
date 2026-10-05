"""TermaLab - carcasa v0.4 (ESP32 USB-C 38 pines + MAX6675 + termocupla K).

Modelo paramétrico por campos de distancia (SDF) mallado con marching
tetrahedra. Solo necesita numpy. Genera STL binarios cerrados.

Uso:
    python3 termalab_carcasa_v04.py            # base, tapa y prueba
    python3 termalab_carcasa_v04.py --h 0.2    # malla más fina

Coordenadas: origen en el centro de la caja, Z=0 en el piso exterior.
Eje X: -X pared del USB-C, +X pared de la sonda.

Medidas reales tomadas con calibre (01/10/2026):
  ESP32 PCB 48,2 x 25,8 mm, pines 10 mm por debajo, componentes ~3,5 mm.
  MAX6675 (HW-550) 32,25 x 15,88 mm, alto con bornera 13,57 mm.
"""
import argparse
import json
import struct
import numpy as np
from decimate import decimate

# ---------------------------------------------------------------- parámetros
P = dict(
    # caja
    innerX=102.0, innerY=36.0, wall=2.4, floorT=2.4, topT=2.4,
    cornerR=5.0, partZ=25.6, totalH=32.8,
    fit=0.3, lipH=1.8, lipT=1.2,
    # ESP32
    pcbL=48.2, pcbW=25.8, pcbT=1.6, pcbUsbGap=0.5, underClear=20.0,
    pcbClear=0.4, compH=3.5,
    usbW=12.4, usbH=6.8, usbR=2.2,
    # MAX6675
    maxL=32.25, maxW=15.88, maxGapFromEsp=3.3, maxStandoff=3.0,
    maxHoleFromPins=16.1, maxPegD=2.6,
    # sonda
    probeCableD=4.0, probeZ=12.0,
    # tapa
    buttonD=7.2, ledD=5.1, buzzerD=12.4, buzzerRingH=5.0,
    buttonX=12.0, ledX=24.0, buzzerX=42.0,
    # tornillos M2 x 16 autorroscantes desde la tapa
    bossD=6.4, bossX=47.4, bossY=16.6,
    pilotD=1.8, pilotDepth=12.0, clearD=2.4, headD=4.6, headDepth=1.6,
)

# ------------------------------------------------------------ primitivas SDF
def box(p, c, s):
    q = np.abs(p - np.asarray(c)) - np.asarray(s) / 2
    return (np.linalg.norm(np.maximum(q, 0), axis=-1)
            + np.minimum(q.max(axis=-1), 0))


def rrect_prism(p, cx, cy, sx, sy, r, z0, z1):
    """Prisma de planta rectangular con esquinas redondeadas (eje Z)."""
    qx = np.abs(p[..., 0] - cx) - (sx / 2 - r)
    qy = np.abs(p[..., 1] - cy) - (sy / 2 - r)
    d2 = (np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
          + np.minimum(np.maximum(qx, qy), 0) - r)
    dz = np.maximum(z0 - p[..., 2], p[..., 2] - z1)
    return np.maximum(d2, dz)


def cyl_z(p, cx, cy, d, z0, z1):
    d2 = np.hypot(p[..., 0] - cx, p[..., 1] - cy) - d / 2
    return np.maximum(d2, np.maximum(z0 - p[..., 2], p[..., 2] - z1))


def cyl_x(p, cy, cz, d, x0, x1):
    d2 = np.hypot(p[..., 1] - cy, p[..., 2] - cz) - d / 2
    return np.maximum(d2, np.maximum(x0 - p[..., 0], p[..., 0] - x1))


def rrect_x(p, cy, cz, sy, sz, r, x0, x1):
    """Abertura de esquinas redondeadas que atraviesa en X."""
    qy = np.abs(p[..., 1] - cy) - (sy / 2 - r)
    qz = np.abs(p[..., 2] - cz) - (sz / 2 - r)
    d2 = (np.hypot(np.maximum(qy, 0), np.maximum(qz, 0))
          + np.minimum(np.maximum(qy, qz), 0) - r)
    return np.maximum(d2, np.maximum(x0 - p[..., 0], p[..., 0] - x1))


U = np.minimum
def D(a, *bs):
    for b in bs:
        a = np.maximum(a, -b)
    return a


# --------------------------------------------------------- geometría derivada
def derived():
    g = {}
    g["oX"] = P["innerX"] + 2 * P["wall"]
    g["oY"] = P["innerY"] + 2 * P["wall"]
    g["x0"] = -P["innerX"] / 2            # cara interior pared USB
    g["x1"] = P["innerX"] / 2             # cara interior pared sonda
    g["px0"] = g["x0"] + P["pcbUsbGap"]
    g["px1"] = g["px0"] + P["pcbL"]
    g["pz0"] = P["floorT"] + P["underClear"]
    g["pz1"] = g["pz0"] + P["pcbT"]
    g["usbZ"] = g["pz1"] + 1.6
    g["mx0"] = g["px1"] + P["maxGapFromEsp"]
    g["mx1"] = g["mx0"] + P["maxL"]
    g["mz0"] = P["floorT"] + P["maxStandoff"]
    g["holeX"] = g["mx0"] + P["maxHoleFromPins"]
    g["innerTop"] = P["totalH"] - P["topT"]
    g["bosses"] = [(sx * P["bossX"], sy * P["bossY"])
                   for sx in (-1, 1) for sy in (-1, 1)]
    return g


G = derived()


def usb_cutter(p):
    return rrect_x(p, 0, G["usbZ"], P["usbW"], P["usbH"], P["usbR"],
                   -G["oX"] / 2 - 1, G["x0"] + 1)


def base_sdf(p):
    F, W, zp = P["floorT"], P["wall"], P["partZ"]
    ov = 0.3
    outer = rrect_prism(p, 0, 0, G["oX"], G["oY"], P["cornerR"], 0, zp)
    cav = rrect_prism(p, 0, 0, P["innerX"], P["innerY"],
                      P["cornerR"] - W, F, zp + 1)
    s = D(outer, cav)

    parts = []
    # postes de tornillos
    for bx, by in G["bosses"]:
        parts.append(cyl_z(p, bx, by, P["bossD"], F - ov, zp))
    # columnas bajo la ESP32 (en el centro, entre las filas de pines)
    for dx in (9.0, 24.0):
        parts.append(box(p, (G["px0"] + dx, 0, (F - ov + G["pz0"]) / 2),
                         (6, 6, G["pz0"] - F + ov)))
    # guías laterales de la ESP32 con trabas
    railY = P["pcbW"] / 2 + P["pcbClear"] + 0.75
    rz1 = G["pz1"] + 1.5
    rx0, rx1 = G["px0"] + 8, G["px0"] + 40
    for sy in (-1, 1):
        parts.append(box(p, ((rx0 + rx1) / 2, sy * railY, (F - ov + rz1) / 2),
                         (rx1 - rx0, 1.5, rz1 - F + ov)))
        faceY = P["pcbW"] / 2 + P["pcbClear"]
        for cx in (G["px0"] + 14, G["px0"] + 34):
            # cuña: sobresale 0,8 abajo y 0 arriba (entra a presión)
            zb, zt = G["pz1"] + 0.15, G["pz1"] + 1.35
            blk = box(p, (cx, sy * (faceY - 0.4 + 0.6), (zb + zt) / 2),
                      (3.2, 2.0, zt - zb))
            # plano inclinado
            t = (p[..., 2] - zb) / (zt - zb)
            limit = faceY - 0.8 * (1 - t)
            plane = (limit - np.abs(p[..., 1])) * 0.83
            parts.append(np.maximum(blk, plane))
    # soporte del MAX6675: columna + espiga + guías
    parts.append(cyl_z(p, G["holeX"], 0, 5.8, F - ov, G["mz0"]))
    parts.append(cyl_z(p, G["holeX"], 0, P["maxPegD"], G["mz0"] - 0.1,
                       G["mz0"] + P["pcbT"] + 0.2))
    gy = P["maxW"] / 2 + 0.5 + 0.6
    gz1 = G["mz0"] + P["pcbT"] + 1.5
    for sy in (-1, 1):
        parts.append(box(p, (G["holeX"], sy * gy, (F - ov + gz1) / 2),
                         (20, 1.2, gz1 - F + ov)))

    for q in parts:
        s = U(s, q)

    cut = [usb_cutter(p)]
    # ranura de la sonda (media caña abajo + abierta hacia arriba)
    cd = P["probeCableD"]
    cx0, cx1 = G["x1"] - 1, G["oX"] / 2 + 1
    cut.append(cyl_x(p, 0, P["probeZ"], cd, cx0, cx1))
    cut.append(box(p, ((cx0 + cx1) / 2, 0, (P["probeZ"] + zp + 1) / 2),
                   (cx1 - cx0, cd, zp + 1 - P["probeZ"])))
    for bx, by in G["bosses"]:
        cut.append(cyl_z(p, bx, by, P["pilotD"], zp - P["pilotDepth"], zp + 1))
    return D(s, *cut)


def lid_sdf(p):
    """Tapa en posición de armado."""
    W, zp, H = P["wall"], P["partZ"], P["totalH"]
    top = G["innerTop"]
    outer = rrect_prism(p, 0, 0, G["oX"], G["oY"], P["cornerR"], zp, H)
    cav = rrect_prism(p, 0, 0, P["innerX"], P["innerY"],
                      P["cornerR"] - W, zp - 1, top)
    s = D(outer, cav)

    lo_x = P["innerX"] - 2 * P["fit"]
    lo_y = P["innerY"] - 2 * P["fit"]
    lr = P["cornerR"] - W - P["fit"]
    lip = D(rrect_prism(p, 0, 0, lo_x, lo_y, lr, zp - P["lipH"], zp + 0.4),
            rrect_prism(p, 0, 0, lo_x - 2 * P["lipT"], lo_y - 2 * P["lipT"],
                        max(lr - P["lipT"], 0.6), zp - 5, zp + 5))
    lipcuts = [cyl_z(p, bx, by, P["bossD"] + 0.8, 0, H)
               for bx, by in G["bosses"]]
    lipcuts.append(box(p, (G["x0"] + 4, 0, zp), (8, 16, 20)))
    lipcuts.append(box(p, (G["x1"] - 3, 0, zp), (6, 8, 20)))
    s = U(s, D(lip, *lipcuts))

    for bx, by in G["bosses"]:
        s = U(s, cyl_z(p, bx, by, P["bossD"], zp, top + 0.3))
    # lengüeta que cierra la ranura de la sonda
    cd = P["probeCableD"]
    tg = box(p, (G["x1"] + W / 2, 0, (P["probeZ"] + zp + 0.4) / 2),
             (W, cd - 0.3, zp + 0.4 - P["probeZ"]))
    tg = D(tg, cyl_x(p, 0, P["probeZ"], cd, G["x1"] - 1, G["oX"] / 2 + 1))
    s = U(s, tg)
    # aro para el buzzer
    bz = P["buzzerX"]
    ring = D(cyl_z(p, bz, 0, P["buzzerD"] + 3.2, top - P["buzzerRingH"], top + 0.3),
             cyl_z(p, bz, 0, P["buzzerD"], top - 10, top + 0.1))
    s = U(s, ring)

    cut = [usb_cutter(p)]
    cut.append(cyl_z(p, P["buttonX"], 0, P["buttonD"], top - 1, H + 1))
    cut.append(cyl_z(p, P["ledX"], 0, P["ledD"], top - 1, H + 1))
    cut.append(cyl_z(p, bz, 0, 3.0, top - 1, H + 1))
    for a in range(6):
        ang = a * np.pi / 3
        cut.append(cyl_z(p, bz + 4 * np.cos(ang), 4 * np.sin(ang), 1.8,
                         top - 1, H + 1))
    for bx, by in G["bosses"]:
        cut.append(cyl_z(p, bx, by, P["clearD"], zp - 1, H + 1))
        cut.append(cyl_z(p, bx, by, P["headD"], H - P["headDepth"], H + 1))
    return D(s, *cut)


def lid_print_sdf(p):
    """Tapa dada vuelta (cara superior sobre la cama)."""
    q = p.copy()
    q[..., 1] = -p[..., 1]
    q[..., 2] = P["totalH"] - p[..., 2]
    return lid_sdf(q)


def test_sdf(p):
    """Prueba rápida: extremo del USB de la base (encastre ESP32 + USB-C)."""
    cutX = G["px0"] + 28
    return np.maximum(base_sdf(p), p[..., 0] - cutX)


# ------------------------------------------------------ marching tetrahedra
# Descomposición de Kuhn: 6 tetraedros por cubo, consistente entre vecinos.
_C = np.array([[i, j, k] for i in (0, 1) for j in (0, 1) for k in (0, 1)])
def _ci(v): return v[0] * 4 + v[1] * 2 + v[2]
_TETS = []
for perm in ((0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)):
    v = np.zeros(3, int); path = [_ci(v)]
    for a in perm:
        v = v.copy(); v[a] = 1; path.append(_ci(v))
    _TETS.append(path)
_TETS = np.array(_TETS)


def mesh_sdf(f, lo, hi, h):
    # desplazamiento irregular: evita que planos del modelo caigan en la grilla
    lo = np.asarray(lo, float) - 2 * h - h * np.array([0.3137, 0.2719, 0.4142])
    hi = np.asarray(hi, float) + 2 * h
    n = np.ceil((hi - lo) / h).astype(int) + 1
    xs = [lo[i] + h * np.arange(n[i]) for i in range(3)]
    X, Y, Z = np.meshgrid(*xs, indexing="ij")
    pts = np.stack([X, Y, Z], -1)
    V = np.empty(n, np.float32)
    for i in range(0, n[0], 32):           # por bloques para ahorrar memoria
        V[i:i + 32] = f(pts[i:i + 32])
    eps = 1e-3 * h
    small = np.abs(V) < eps
    V[small] = np.where(V[small] < 0, -eps, eps)
    del pts, X, Y, Z

    neg = V < 0
    c = np.zeros(n - 1, np.int8)
    anyneg = np.zeros(n - 1, bool); allneg = np.ones(n - 1, bool)
    for (i, j, k) in _C:
        s = neg[i:n[0] - 1 + i, j:n[1] - 1 + j, k:n[2] - 1 + k]
        anyneg |= s; allneg &= s
    cubes = np.argwhere(anyneg & ~allneg)

    ny, nz = n[1], n[2]
    def gid(ijk): return (ijk[:, 0] * ny + ijk[:, 1]) * nz + ijk[:, 2]
    Vf = V.ravel()
    corner_ids = np.stack([gid(cubes + _C[m]) for m in range(8)], 1)

    tris_a, tris_b = [], []      # pares de índices de grilla por vértice
    for tet in _TETS:
        ids = corner_ids[:, tet]                     # (N,4)
        val = Vf[ids]
        inside = val < 0
        cnt = inside.sum(1)
        # orden: interiores primero
        order = np.argsort(~inside, axis=1, kind="stable")
        ids_o = np.take_along_axis(ids, order, 1)
        for k in (1, 3):
            sel = cnt == k
            if not sel.any(): continue
            I = ids_o[sel]
            if k == 1:
                a = I[:, [0, 0, 0]]; b = I[:, [1, 2, 3]]
            else:
                a = I[:, [0, 1, 2]]; b = I[:, [3, 3, 3]]
            tris_a.append(a); tris_b.append(b)
        sel = cnt == 2
        if sel.any():
            I = ids_o[sel]
            # interiores 0,1 ; exteriores 2,3 -> quad (0-2,0-3,1-3,1-2)
            qa = I[:, [0, 0, 1, 1]]; qb = I[:, [2, 3, 3, 2]]
            tris_a.append(qa[:, [0, 1, 2]]); tris_b.append(qb[:, [0, 1, 2]])
            tris_a.append(qa[:, [0, 2, 3]]); tris_b.append(qb[:, [0, 2, 3]])
    A = np.concatenate(tris_a); B = np.concatenate(tris_b)

    # vértices únicos por arista de grilla
    key = A.astype(np.int64) * Vf.size + B
    uk, inv = np.unique(key.ravel(), return_inverse=True)
    ea, eb = uk // Vf.size, uk % Vf.size
    def coord(g):
        k = g % nz; j = (g // nz) % ny; i = g // (ny * nz)
        return np.stack([xs[0][i], xs[1][j], xs[2][k]], 1)
    va, vb = Vf[ea].astype(float), Vf[eb].astype(float)
    t = (va / (va - vb))[:, None]
    verts = coord(ea) + t * (coord(eb) - coord(ea))
    faces = inv.reshape(-1, 3)

    # orientar normales hacia afuera (hacia el vértice exterior)
    tri = verts[faces]
    nrm = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    outp = coord(B[:, 0])
    flip = (nrm * (outp - tri[:, 0])).sum(1) < 0
    faces[flip] = faces[flip][:, [0, 2, 1]]
    # eliminar triángulos degenerados
    tri = verts[faces]
    area = np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
    good = (faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])
    return verts, faces[good], area[good]


def check_closed(faces):
    e = np.sort(np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]), 1)
    _, c = np.unique(e, axis=0, return_counts=True)
    return int((c != 2).sum())


def write_stl(path, verts, faces):
    tri = verts[faces].astype(np.float32)
    nrm = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
    rec = np.zeros(len(faces), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    rec["n"] = nrm; rec["v"] = tri
    with open(path, "wb") as fh:
        fh.write(b"TermaLab carcasa v0.4".ljust(80, b" "))
        fh.write(struct.pack("<I", len(faces)))
        fh.write(rec.tobytes())


def volume(verts, faces):
    t = verts[faces]
    return float(np.einsum("ij,ij->i", t[:, 0], np.cross(t[:, 1], t[:, 2])).sum() / 6)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--h", type=float, default=0.25)
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    oX, oY, H, zp = G["oX"], G["oY"], P["totalH"], P["partZ"]
    jobs = {
        "base": (base_sdf, (-oX / 2, -oY / 2, 0), (oX / 2, oY / 2, zp)),
        "tapa": (lid_print_sdf, (-oX / 2, -oY / 2, 0), (oX / 2, oY / 2, H - P["probeZ"] + 1)),
        "prueba-usb": (test_sdf, (-oX / 2, -oY / 2, 0), (G["px0"] + 28, oY / 2, zp)),
    }
    stats = {"version": "v0.4", "parametros": P, "piezas": {}}
    for name, (f, lo, hi) in jobs.items():
        v, fc, _ = mesh_sdf(f, lo, hi, a.h)
        v, fc = decimate(v, fc)
        bad = check_closed(fc)
        fn = f"{a.out}/termalab-carcasa-v0.4-{name}.stl"
        write_stl(fn, v, fc)
        stats["piezas"][name] = dict(triangulos=len(fc), aristas_abiertas=bad,
                                     volumen_cm3=round(volume(v, fc) / 1000, 2),
                                     min=v.min(0).round(2).tolist(),
                                     max=v.max(0).round(2).tolist())
        print(name, stats["piezas"][name])
    with open(f"{a.out}/termalab-carcasa-v0.4-stats.json", "w") as fh:
        json.dump(stats, fh, indent=2, ensure_ascii=False)
