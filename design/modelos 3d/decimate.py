"""Simplificación por error cuadrático (Garland-Heckbert) con tolerancia baja.

Colapsa aristas cuyo error geométrico es menor que `tol` (mm^2): las caras
planas se simplifican sin cambiar la forma. Mantiene la malla cerrada y
evita invertir triángulos. Bucle en Python puro (sin numpy) por velocidad.
"""
import heapq
import numpy as np


def _plane_q(a, b, c):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
    l = (nx * nx + ny * ny + nz * nz) ** 0.5
    if l < 1e-12:
        return None
    nx, ny, nz = nx / l, ny / l, nz / l
    d = -(nx * a[0] + ny * a[1] + nz * a[2])
    return [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d,
            nz * nz, nz * d, d * d]


def _err(q, x, y, z):
    return (q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x
            + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y
            + q[7] * z * z + 2 * q[8] * z + q[9])


def _cross(a, b, c):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    return (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)


def decimate(verts, faces, tol=1e-3, min_dot=0.3, max_deg=20):
    V = verts.tolist()
    F = faces.tolist()
    nV = len(V)
    alive_f = [True] * len(F)
    Q = [[0.0] * 10 for _ in range(nV)]
    vf = [set() for _ in range(nV)]
    for fi, (a, b, c) in enumerate(F):
        q = _plane_q(V[a], V[b], V[c])
        for x in (a, b, c):
            vf[x].add(fi)
            if q:
                qx = Q[x]
                for i in range(10):
                    qx[i] += q[i]
    ver = [0] * nV
    alive_v = [True] * nV

    def best(u, w):
        qu, qw = Q[u], Q[w]
        q = [qu[i] + qw[i] for i in range(10)]
        pu, pw = V[u], V[w]
        pm = ((pu[0] + pw[0]) / 2, (pu[1] + pw[1]) / 2, (pu[2] + pw[2]) / 2)
        best_e, best_p = None, None
        eu = _err(q, pu[0], pu[1], pu[2])
        ew = _err(q, pw[0], pw[1], pw[2])
        em = _err(q, pm[0], pm[1], pm[2])
        tie = 1e-9
        # en empate, conservar el vértice con menos caras (evita "hubs")
        if abs(eu - ew) <= tie:
            if len(vf[w]) < len(vf[u]):
                best_e, best_p = ew, pw
            else:
                best_e, best_p = eu, pu
        elif eu < ew:
            best_e, best_p = eu, pu
        else:
            best_e, best_p = ew, pw
        if em < best_e - tie:
            best_e, best_p = em, pm
        return best_e, best_p

    def neighbors(u):
        s = set()
        for fi in vf[u]:
            s.update(F[fi])
        s.discard(u)
        return s

    heap = []
    seen = set()
    for a, b, c in F:
        for u, w in ((a, b), (b, c), (c, a)):
            k = (u, w) if u < w else (w, u)
            if k in seen:
                continue
            seen.add(k)
            e, _ = best(*k)
            if e < tol:
                heap.append((e, k[0], k[1], 0, 0))
    del seen
    heapq.heapify(heap)

    while heap:
        e, u, v, vu, vv = heapq.heappop(heap)
        if not (alive_v[u] and alive_v[v]) or ver[u] != vu or ver[v] != vv:
            continue
        e2, p = best(u, v)
        if e2 >= tol:
            continue
        if p is V[v]:
            u, v = v, u
        shared = vf[u] & vf[v]
        if len(shared) != 2:
            continue
        if len(vf[u]) + len(vf[v]) - 4 > max_deg:
            continue
        if len(neighbors(u) & neighbors(v)) != 2:
            continue
        ok = True
        for fi in (vf[u] | vf[v]) - shared:
            tri = F[fi]
            pa, pb, pc = V[tri[0]], V[tri[1]], V[tri[2]]
            n0 = _cross(pa, pb, pc)
            pts = [p if (x == u or x == v) else V[x] for x in tri]
            n1 = _cross(pts[0], pts[1], pts[2])
            l0 = (n0[0] ** 2 + n0[1] ** 2 + n0[2] ** 2) ** 0.5
            l1 = (n1[0] ** 2 + n1[1] ** 2 + n1[2] ** 2) ** 0.5
            if l1 < 1e-9:
                ok = False; break
            if l0 > 1e-9 and (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) < min_dot * l0 * l1:
                ok = False; break
        if not ok:
            continue
        for fi in shared:
            alive_f[fi] = False
            for x in F[fi]:
                if x != u and x != v:
                    vf[x].discard(fi)
        vf[u] -= shared
        for fi in vf[v] - shared:
            tri = F[fi]
            for i in range(3):
                if tri[i] == v:
                    tri[i] = u
            vf[u].add(fi)
        vf[v] = set()
        alive_v[v] = False
        V[u] = list(p)
        qu, qv = Q[u], Q[v]
        for i in range(10):
            qu[i] += qv[i]
        ver[u] += 1
        for w in neighbors(u):
            e3, _ = best(u, w)
            if e3 < tol:
                heapq.heappush(heap, (e3, u, w, ver[u], ver[w]))

    F2 = np.array([F[i] for i in range(len(F)) if alive_f[i]], np.int64)
    Vn = np.array(V)
    used = np.unique(F2)
    remap = -np.ones(nV, np.int64)
    remap[used] = np.arange(len(used))
    return Vn[used], remap[F2]
