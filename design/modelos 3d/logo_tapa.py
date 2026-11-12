"""Prepara el logo de TermaLab para grabarlo en la tapa (logo-tapa.npz).

Lee assets/images/branding/logo.png, recorta el isotipo + "TermaLab", saca el
contorno del logo y arma una triangulación plana de un rectángulo alrededor del
logo en la que cada triángulo es "logo" (se graba) o "fondo". La carcasa solo
lee el .npz (numpy). Este script necesita además Pillow, scipy y scikit-image,
y solo hay que volver a correrlo si cambia el logo.

Uso:
    python3 logo_tapa.py ../../assets/images/branding/logo.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.spatial import Delaunay
from skimage import measure

src = sys.argv[1] if len(sys.argv) > 1 else "../../assets/images/branding/logo.png"
im = np.asarray(Image.open(src).convert("RGB")).astype(float)

# zona del logo (deja afuera la etiqueta "Concepto 1")
crop = im[440:810, 130:1160]
ink = np.clip(np.sqrt(((255 - crop) ** 2).sum(-1)) / 180, 0, 1)

# máscara supermuestreada x4 -> campo de distancia (px del original)
k = 4
big = ndi.zoom(ink, k, order=1) > 0.5
big = ndi.binary_opening(big, iterations=2)
lab, n = ndi.label(big)
sizes = ndi.sum(big, lab, range(1, n + 1))
big = np.isin(lab, 1 + np.where(sizes > 400 * k * k)[0])
ys, xs = np.where(big)
pad = 40 * k
y0, x0 = max(ys.min() - pad, 0), max(xs.min() - pad, 0)
big = big[y0:ys.max() + pad, x0:xs.max() + pad]
sdf = (ndi.distance_transform_edt(~big) - ndi.distance_transform_edt(big)) / k
sdf = ndi.zoom(sdf, 1 / k, order=1)
ink_w = (xs.max() - xs.min()) / k
ink_h = (ys.max() - ys.min()) / k
cx = ((xs.min() + xs.max()) / 2 - x0) / k
cy = ((ys.min() + ys.max()) / 2 - y0) / k


def sample(f, r, c):
    r = np.clip(r, 0, f.shape[0] - 1.001); c = np.clip(c, 0, f.shape[1] - 1.001)
    i, j = r.astype(int), c.astype(int); fr, fc = r - i, c - j
    return (f[i, j] * (1 - fr) * (1 - fc) + f[i, j + 1] * (1 - fr) * fc
            + f[i + 1, j] * fr * (1 - fc) + f[i + 1, j + 1] * fr * fc)


# contornos (fila, columna) simplificados a ~0,2 px
loops = []
for c in measure.find_contours(sdf, 0.0):
    if len(c) < 8:
        continue
    c = measure.approximate_polygon(c, tolerance=0.2)
    if np.allclose(c[0], c[-1]):
        c = c[:-1]
    # densificar tramos largos (paso máx. 4 px) para que la triangulación respete el borde
    out = []
    for a, b in zip(c, np.roll(c, -1, 0)):
        m = max(int(np.ceil(np.linalg.norm(b - a) / 4.0)), 1)
        out += [a + (b - a) * t for t in np.arange(m) / m]
    loops.append(np.array(out))

# rectángulo alrededor del logo: margen de 30 px (~1,5 mm)
m = 30
r0, r1 = cy - ink_h / 2 - m, cy + ink_h / 2 + m
c0, c1 = cx - ink_w / 2 - m, cx + ink_w / 2 + m
step = 12
edge = []
for c in np.linspace(c0, c1, int((c1 - c0) / step) + 1):
    edge += [(r0, c), (r1, c)]
for r in np.linspace(r0, r1, int((r1 - r0) / step) + 1)[1:-1]:
    edge += [(r, c0), (r, c1)]
# puntos interiores sueltos, lejos del borde del logo
gr, gc = np.meshgrid(np.arange(r0 + 20, r1 - 10, 24), np.arange(c0 + 20, c1 - 10, 24), indexing="ij")
g = np.stack([gr.ravel(), gc.ravel()], 1)
g = g[np.abs(sample(sdf, g[:, 0], g[:, 1])) > 8]

pts = [np.array(edge), g] + loops
segs = []
off = len(edge) + len(g)
for L in loops:
    idx = off + np.arange(len(L))
    segs += list(zip(idx, np.roll(idx, -1)))
    off += len(L)
pts = np.concatenate(pts)

# Delaunay "conforme": si un tramo del contorno no quedó como arista, se parte
for it in range(30):
    tri = Delaunay(pts[:, ::-1])
    T = tri.simplices
    E = set()
    for a, b, c in T:
        E |= {(min(a, b), max(a, b)), (min(b, c), max(b, c)), (min(a, c), max(a, c))}
    miss = [(a, b) for a, b in segs if (min(a, b), max(a, b)) not in E]
    if not miss:
        break
    new = []
    keep = [s for s in segs if (min(s), max(s)) in E]
    for a, b in miss:
        j = len(pts) + len(new)
        new.append((pts[a] + pts[b]) / 2)
        keep += [(a, j), (j, b)]
    pts = np.concatenate([pts, np.array(new)])
    segs = keep
else:
    raise SystemExit("no se pudo respetar el contorno")

from collections import defaultdict
segset = {(min(a, b), max(a, b)) for a, b in segs}
own = defaultdict(list)
for t, (a, b, c) in enumerate(T):
    for e in ((a, b), (b, c), (a, c)):
        own[(min(e), max(e))].append(t)
# regiones: triángulos unidos por aristas que NO son contorno
parent = list(range(len(T)))
def find(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]; a = parent[a]
    return a
for e, ts in own.items():
    if len(ts) == 2 and e not in segset:
        parent[find(ts[0])] = find(ts[1])
reg = np.array([find(t) for t in range(len(T))])
# cada región se decide por mayoría (pesada por área) del signo de la distancia
cen = pts[T].mean(1)
P3 = pts[T]
area = 0.5 * np.abs((P3[:, 1, 0] - P3[:, 0, 0]) * (P3[:, 2, 1] - P3[:, 0, 1])
                    - (P3[:, 2, 0] - P3[:, 0, 0]) * (P3[:, 1, 1] - P3[:, 0, 1]))
vote = defaultdict(float)
for r, s, a_ in zip(reg, sample(sdf, cen[:, 0], cen[:, 1]), area):
    vote[r] += a_ * (1 if s < 0 else -1)
is_logo = np.array([vote[r] > 0 for r in reg])
# control: toda arista entre "logo" y "fondo" tiene que ser un tramo del contorno
bad = [e for e, ts in own.items() if len(ts) == 2 and is_logo[ts[0]] != is_logo[ts[1]] and e not in segset]
loose = [e for e in segset if len(own[e]) == 2 and is_logo[own[e][0]] == is_logo[own[e][1]]]
print(f"regiones {len(set(reg))}, tramos de contorno sin cambio de color {len(loose)}")
print(f"iteraciones {it}, puntos {len(pts)}, triángulos {len(T)}, "
      f"logo {is_logo.sum()}, bordes sin contorno {len(bad)}")
np.savez_compressed("logo-tapa.npz", pts=pts.astype(np.float32), tris=T.astype(np.int32),
                    is_logo=is_logo, ink_w=ink_w, ink_h=ink_h, cx=cx, cy=cy,
                    rect=np.array([r0, r1, c0, c1]))
