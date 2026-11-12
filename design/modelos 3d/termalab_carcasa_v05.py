"""TermaLab - carcasa v0.5 (ESP32 USB-C 38 pines + MAX6675 + termocupla K).

Modelo paramétrico por campos de distancia (SDF) mallado con marching
tetrahedra. Solo necesita numpy. Genera STL binarios cerrados.

Cambios respecto de la v0.4 (solo la tapa; la base es la misma):
  - Pulsador táctil 12 x 12 mm (4 patas, capuchón cuadrado) en lugar del
    pulsador de panel de 7 mm: agujero cuadrado para el capuchón y alojamiento
    con trabas por debajo de la tapa.
  - Logo de TermaLab grabado 0,6 mm en la cara de arriba (logo-tapa.npz).

Uso:
    python3 termalab_carcasa_v05.py            # base, tapa y pruebas
    python3 termalab_carcasa_v05.py --h 0.2    # malla más fina

Coordenadas: origen en el centro de la caja, Z=0 en el piso exterior.
Eje X: -X pared del USB-C, +X pared de la sonda.

Medidas reales tomadas con calibre (01/10/2026):
  ESP32 PCB 48,2 x 25,8 mm, pines 10 mm por debajo, componentes ~3,5 mm.
  MAX6675 (HW-550) 32,25 x 15,88 mm, alto con bornera 13,57 mm.
"""
import argparse
import json
import os
import struct
import numpy as np
from decimate import decimate

AQUI = os.path.dirname(os.path.abspath(__file__))
VERSION = "v0.5"

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
    ledD=5.1, buzzerD=12.4, buzzerRingH=5.0,
    buttonX=12.0, ledX=24.0, buzzerX=42.0,
    # pulsador táctil 12 x 12 con capuchón cuadrado (patas en las caras ±X).
    # swTotalH = de la base del cuerpo a la punta del capuchón, sin apretar.
    swW=12.0, swBodyH=3.6, swTotalH=8.3, swFit=0.2,
    capW=11.5, capH=3.0, capFit=0.3, capProtrude=1.2, swTravel=0.3,
    sockWall=1.6, clipW=6.0, clipT=1.0, clipHook=0.4, clipHookH=1.0,
    actOpen=9.0,
    # logo grabado en la cara de arriba
    logoW=48.0, logoCX=-23.0, logoCY=0.0, logoDepth=0.6,
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
    # pulsador: alturas en posición de armado
    g["capTop"] = P["totalH"] + P["capProtrude"]
    g["swBot"] = g["capTop"] - P["swTotalH"]          # base del cuerpo
    g["swTop"] = g["swBot"] + P["swBodyH"]            # cara de arriba del cuerpo
    g["capBot"] = g["capTop"] - P["capH"]
    g["sockA"] = P["swW"] / 2 + P["swFit"]            # media luz interior
    return g


G = derived()


def check_pulsador():
    """Avisos si las medidas del pulsador no cierran con la tapa."""
    msgs = []
    if G["swTop"] > G["innerTop"] - 0.4:
        msgs.append("el cuerpo del pulsador choca con el techo: bajar capProtrude "
                    "o revisar swTotalH")
    if G["capBot"] - P["swTravel"] < G["innerTop"]:
        msgs.append("el capuchón apretado toca el tope interior: revisar capH")
    if G["capBot"] > P["totalH"] - 0.6:
        msgs.append("el capuchón casi no entra en el agujero: subir capProtrude")
    return msgs


# ------------------------------------------------------------------ logo
# El logo no se hace con el campo de distancia (haría falta una malla muy fina
# en toda la tapa). Se arma aparte una "piel" exacta: un bloque rectangular de
# `logoSkin` mm de espesor con el logo grabado, triangulado desde
# logo-tapa.npz. La tapa lleva un hueco un poco más chico donde va esa piel:
# las dos piezas se superponen 0,2 mm y el slicer las une al laminar.
P["logoSkin"] = 1.3
_LOGO = None


def logo_data():
    global _LOGO
    if _LOGO is None:
        d = np.load(os.path.join(AQUI, "logo-tapa.npz"))
        s = float(d["ink_w"]) / P["logoW"]              # px por mm
        cx, cy = float(d["cx"]), float(d["cy"])
        pts = d["pts"].astype(float)                     # (fila, columna)
        xy = np.stack([P["logoCX"] + (pts[:, 1] - cx) / s,
                       P["logoCY"] - (pts[:, 0] - cy) / s], 1)
        r0, r1, c0, c1 = d["rect"]
        rect = (P["logoCX"] + (c0 - cx) / s, P["logoCX"] + (c1 - cx) / s,
                P["logoCY"] - (r1 - cy) / s, P["logoCY"] - (r0 - cy) / s)
        _LOGO = (xy, d["tris"].astype(np.int64), d["is_logo"].astype(bool), rect)
    return _LOGO


def logo_pocket(p):
    """Hueco de la tapa donde va la piel con el logo (0,2 mm más chico)."""
    _, _, _, (x0, x1, y0, y1) = logo_data()
    H = P["totalH"]
    z0 = H - P["logoSkin"] + 0.1
    return box(p, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + H + 1) / 2),
               (x1 - x0 - 0.4, y1 - y0 - 0.4, H + 1 - z0))


def logo_skin_mesh():
    """Malla cerrada de la piel con el logo, en posición de armado."""
    xy, T, is_logo, _ = logo_data()
    H, d, t = P["totalH"], P["logoDepth"], P["logoSkin"]
    # orientar los triángulos en sentido antihorario visto desde +Z
    A = xy[T]
    cr = ((A[:, 1, 0] - A[:, 0, 0]) * (A[:, 2, 1] - A[:, 0, 1])
          - (A[:, 2, 0] - A[:, 0, 0]) * (A[:, 1, 1] - A[:, 0, 1]))
    T = np.where((cr < 0)[:, None], T[:, [0, 2, 1]], T)
    n = len(xy)
    # vértices: arriba (H), fondo del grabado (H-d), abajo (H-t)
    V = np.concatenate([np.c_[xy, np.full(n, H)],
                        np.c_[xy, np.full(n, H - d)],
                        np.c_[xy, np.full(n, H - t)]])
    up, dn, bt = 0, n, 2 * n
    F = [T[~is_logo] + up, T[is_logo] + dn, T[:, ::-1] + bt]
    # aristas con un solo triángulo de cada lado (borde) o que separan logo/fondo
    E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    L = np.concatenate([is_logo] * 3)
    key = np.minimum(E[:, 0], E[:, 1]) * n + np.maximum(E[:, 0], E[:, 1])
    order = np.argsort(key, kind="stable")
    ks = key[order]
    uniq, start, cnt = np.unique(ks, return_index=True, return_counts=True)
    for s, c in zip(start, cnt):
        i = order[s]
        a, b = E[i]
        if c == 1:          # borde del rectángulo: pared de arriba hasta abajo
            F.append(np.array([[a + up, b + bt, b + up], [a + up, a + bt, b + bt]]))
        else:
            j = order[s + 1]
            if L[i] == L[j]:
                continue
            if not L[i]:     # el triángulo i (fondo) recorre a->b; el logo queda del otro lado
                a, b = E[i]
            else:
                a, b = E[j]
            # pared del grabado: de H (fondo) a H-d (logo), mirando hacia el logo
            F.append(np.array([[a + up, a + dn, b + dn], [a + up, b + dn, b + up]]))
    F = np.concatenate(F)
    # quitar vértices sin usar
    used = np.unique(F)
    remap = np.full(len(V), -1); remap[used] = np.arange(len(used))
    return V[used], remap[F]


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


def switch_socket(p):
    """Alojamiento que cuelga del techo y sostiene el pulsador 12 x 12.

    - Tope arriba: el cuerpo apoya contra él (deja pasar el accionador).
    - Cuatro esquineros en L que centran el cuerpo. Los de las caras ±X son
      cortos para no tocar las patas (salen por el medio de esas caras).
    - Dos trabas flexibles en las caras ±Y con un diente abajo: el pulsador
      entra a presión desde adentro y el diente lo sostiene cuando se aprieta.
    """
    bx, a, w = P["buttonX"], G["sockA"], P["sockWall"]
    top = G["innerTop"]
    z0, z1 = G["swBot"], G["swTop"]
    x = p[..., 0] - bx
    q = p.copy(); q[..., 0] = x
    parts = []
    # tope (placa con agujero; el agujero lo hace el corte del accionador)
    parts.append(box(q, (0, 0, (z1 + top + 0.3) / 2),
                     (2 * (a + w), 2 * (a + w), top + 0.3 - z1)))
    # esquineros
    leg = a + w - 4.0            # en las caras ±X llegan hasta |y| = 4 (patas en ±2,5)
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box(q, (sx * (a + w / 2), sy * (a + w - leg / 2), (z0 + top) / 2),
                             (w, leg, top - z0)))
            lx = a + w - (P["clipW"] / 2 + 0.7)
            parts.append(box(q, (sx * (a + w - lx / 2), sy * (a + w / 2), (z0 + top) / 2),
                             (lx, w, top - z0)))
    # trabas
    t, hk, hh = P["clipT"], P["clipHook"], P["clipHookH"]
    zb = z0 - hh
    for sy in (-1, 1):
        parts.append(box(q, (0, sy * (a + t / 2), (zb + top) / 2),
                         (P["clipW"], t, top - zb)))
        blk = box(q, (0, sy * (a - hk / 2 + 0.1), (zb + z0) / 2),
                  (P["clipW"], hk + 0.2, hh))
        tt = (q[..., 2] - zb) / hh                 # 0 abajo (entrada), 1 en el diente
        limit = a - hk * np.clip(tt, 0, 1)
        plane = (limit - np.abs(q[..., 1])) * 0.9
        parts.append(np.maximum(blk, plane))
    out = parts[0]
    for r in parts[1:]:
        out = U(out, r)
    return out


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
    # reborde que une el labio con las paredes (sin él, el labio queda flotando
    # separado por la holgura `fit`)
    flange = D(
        rrect_prism(p, 0, 0, P["innerX"] + 0.6, P["innerY"] + 0.6, P["cornerR"] - W + 0.3, zp, zp + 0.8),
        rrect_prism(p, 0, 0, lo_x - 2 * P["lipT"], lo_y - 2 * P["lipT"],
                    max(lr - P["lipT"], 0.6), zp - 5, zp + 5),
    )
    s = U(s, D(flange, *lipcuts[4:]))

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
    # alojamiento del pulsador 12 x 12
    s = U(s, switch_socket(p))

    cut = [usb_cutter(p)]
    bx, a = P["buttonX"], G["sockA"]
    # agujero cuadrado del capuchón (solo atraviesa el techo)
    hc = P["capW"] + 2 * P["capFit"]
    cut.append(rrect_prism(p, bx, 0, hc, hc, 0.8, top, H + 1))
    # paso del accionador a través del tope
    cut.append(box(p, (bx, 0, (G["swTop"] - 1 + top + 0.05) / 2),
                   (P["actOpen"], P["actOpen"], top + 0.05 - G["swTop"] + 1)))
    # luz para el cuerpo dentro del alojamiento
    cut.append(box(p, (bx, 0, (G["swBot"] - 0.01 + G["swTop"]) / 2),
                   (2 * a, 2 * a, G["swTop"] - G["swBot"] + 0.01)))
    # hueco para la piel con el logo
    cut.append(logo_pocket(p))
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


def _axis(lo, hi, h, fine, jit):
    """Coordenadas de un eje: paso h, más fino dentro de las ventanas `fine`
    [(a, b, hf), ...]. El desplazamiento `jit` evita que los planos del modelo
    caigan justo sobre la grilla."""
    xs, x = [], lo - 2 * h - jit * h
    while x <= hi + 2 * h:
        xs.append(x)
        st = h
        for a, b, hf in fine:
            if a - h <= x <= b:
                st = min(st, hf)
        x += st
    return np.array(xs)


def mesh_sdf(f, lo, hi, h, wins=()):
    """wins: ventanas de refinamiento [((x0,y0,z0), (x1,y1,z1), hf), ...]
    (la grilla es rectilínea: cada ventana afina las tres franjas de ejes)."""
    jit = (0.3137, 0.2719, 0.4142)
    xs = [_axis(lo[i], hi[i], h,
                [(w0[i], w1[i], hf) for w0, w1, hf in wins], jit[i])
          for i in range(3)]
    n = np.array([len(x) for x in xs])
    V = np.empty(n, np.float32)
    YZ = np.stack(np.meshgrid(xs[1], xs[2], indexing="ij"), -1)
    for i in range(0, n[0], 16):           # por bloques para ahorrar memoria
        xb = xs[0][i:i + 16]
        pts = np.empty((len(xb),) + YZ.shape[:2] + (3,))
        pts[..., 0] = xb[:, None, None]
        pts[..., 1:] = YZ[None]
        V[i:i + 16] = f(pts)
    eps = 1e-4 * h
    small = np.abs(V) < eps
    V[small] = np.where(V[small] < 0, -eps, eps)
    del YZ

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


def count_components(n_verts, faces):
    parent = np.arange(n_verts)
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for a, b, c in faces:
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra
        parent[find(rc)] = ra
    return len({find(v) for v in np.unique(faces)})


def write_stl(path, verts, faces):
    tri = verts[faces].astype(np.float32)
    nrm = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
    rec = np.zeros(len(faces), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    rec["n"] = nrm; rec["v"] = tri
    with open(path, "wb") as fh:
        fh.write(f"TermaLab carcasa {VERSION}".encode().ljust(80, b" "))
        fh.write(struct.pack("<I", len(faces)))
        fh.write(rec.tobytes())


def volume(verts, faces):
    t = verts[faces]
    return float(np.einsum("ij,ij->i", t[:, 0], np.cross(t[:, 1], t[:, 2])).sum() / 6)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--h", type=float, default=0.25)
    ap.add_argument("--out", default=".")
    ap.add_argument("--solo", nargs="*", help="generar solo estas piezas")
    a = ap.parse_args()
    for m in check_pulsador():
        print("AVISO pulsador:", m)
    oX, oY, H, zp = G["oX"], G["oY"], P["totalH"], P["partZ"]
    ztop = H - G["innerTop"]                  # espesor del techo
    # ventanas finas (coordenadas de impresión de la tapa: Y y Z dados vuelta)
    wins_tapa = [
        ((P["buttonX"] - 9, -9.5, ztop - 0.5), (P["buttonX"] + 9, 9.5, H - G["swBot"] + P["clipHookH"] + 0.6), 0.12),
    ]
    pz = (3.0, 22.0)                            # trozo de tapa para la prueba
    jobs = {
        "base": (base_sdf, (-oX / 2, -oY / 2, 0), (oX / 2, oY / 2, zp), []),
        "tapa": (lid_print_sdf, (-oX / 2, -oY / 2, 0),
                 (oX / 2, oY / 2, H - P["probeZ"] + 1), wins_tapa),
        "prueba-usb": (test_sdf, (-oX / 2, -oY / 2, 0), (G["px0"] + 28, oY / 2, zp), []),
        "prueba-pulsador": (lambda q: np.maximum(lid_print_sdf(q), np.maximum(pz[0] - q[..., 0], q[..., 0] - pz[1])),
                            (pz[0], -oY / 2, 0), (pz[1], oY / 2, H - zp + P["lipH"] + 1),
                            wins_tapa),
    }
    stats_fn = f"{a.out}/termalab-carcasa-{VERSION}-stats.json"
    stats = {"version": VERSION, "parametros": P, "piezas": {}}
    if a.solo and os.path.exists(stats_fn):
        stats["piezas"] = json.load(open(stats_fn)).get("piezas", {})
    for name, (f, lo, hi, wins) in jobs.items():
        if a.solo and name not in a.solo:
            continue
        v, fc, _ = mesh_sdf(f, lo, hi, a.h, wins)
        v, fc = decimate(v, fc)
        if name == "tapa":
            # sumar la piel con el logo, dada vuelta igual que la tapa
            sv, sf = logo_skin_mesh()
            sv = sv.copy(); sv[:, 1] *= -1; sv[:, 2] = H - sv[:, 2]
            fc = np.concatenate([fc, sf + len(v)])
            v = np.concatenate([v, sv])
        bad = check_closed(fc)
        fn = f"{a.out}/termalab-carcasa-{VERSION}-{name}.stl"
        write_stl(fn, v, fc)
        stats["piezas"][name] = dict(triangulos=len(fc), aristas_abiertas=bad,
                                     piezas_sueltas=count_components(len(v), fc),
                                     volumen_cm3=round(volume(v, fc) / 1000, 2),
                                     min=v.min(0).round(2).tolist(),
                                     max=v.max(0).round(2).tolist())
        print(name, stats["piezas"][name], flush=True)
    with open(stats_fn, "w") as fh:
        json.dump(stats, fh, indent=2, ensure_ascii=False)
