#!/usr/bin/env python3
"""Generuje działki Rodzinnego Ogrodu Działkowego „Borowik” (src/data_rod.js).
Obrys i ścieżki z OSM (tools/raw/osm_area.json.gz, way 351179153). Działki 14x20 m w rzędach po obu stronach alejek (3 m),
obrócone zgodnie z główną ścieżką; odrzucamy te, które wchodzą na istniejące ścieżki lub poza obrys."""
import gzip, json, math, random, sys, pathlib
from shapely.geometry import Polygon, LineString, box
from shapely import affinity
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from geo import LAT0, LON0, KX, KZ
root = pathlib.Path(__file__).resolve().parent
d = json.load(gzip.open(root / "raw" / "osm_area.json.gz"))
N = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
W = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
xz = lambda n: ((n["lon"] - LON0) * KX, -(n["lat"] - LAT0) * KZ)
ROD = Polygon([xz(N[n]) for n in W[351179153]["nodes"] if n in N])
paths = []
for w in W.values():
    t = w.get("tags", {})
    if t.get("highway") in ("footway", "path", "track", "service") and len(w["nodes"]) > 1:
        ls = LineString([xz(N[n]) for n in w["nodes"] if n in N])
        if ls.intersects(ROD): paths.append(ls)
# kąt głównej ścieżki (średnia ważona długością, modulo 90)
sx = sy = 0
for ls in paths:
    c = list(ls.coords)
    for a, b in zip(c, c[1:]):
        L = math.hypot(b[0]-a[0], b[1]-a[1]); th = math.atan2(b[1]-a[1], b[0]-a[0]) * 4
        sx += L * math.cos(th); sy += L * math.sin(th)
ANG = math.atan2(sy, sx) / 4
from shapely.ops import unary_union, nearest_points
from shapely.geometry import MultiPolygon
pb = unary_union([p.buffer(1.8) for p in paths]) if paths else Polygon()
free = ROD.buffer(-1.2).difference(pb)
faces = [g for g in (free.geoms if hasattr(free, "geoms") else [free]) if g.area > 160]
PW, PD = 14.0, 20.0
rng = random.Random(7)
plots = []   # (cx, cz, nx, nz) : środek i wektor w stronę najbliższej alejki
for f in faces:
    mrr = f.minimum_rotated_rectangle; c = list(mrr.exterior.coords)[:4]
    e1 = (c[1][0]-c[0][0], c[1][1]-c[0][1]); e2 = (c[2][0]-c[1][0], c[2][1]-c[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    (La, ea), (Sa, eb) = ((l1, e1), (l2, e2)) if l1 >= l2 else ((l2, e2), (l1, e1))
    ux, uz = ea[0]/La, ea[1]/La; vx, vz = eb[0]/Sa, eb[1]/Sa
    nu = max(1, round(La / PW)); nv = max(1, round(Sa / PD)); cw, cd = La / nu, Sa / nv
    ox, oz = c[0] if l1 >= l2 else c[1]
    if l1 < l2: ox, oz = c[1]
    for i in range(nu):
        for j in range(nv):
            uc, vc = (i + .5) * cw, (j + .5) * cd
            cx, cz = ox + ux * uc + vx * vc, oz + uz * uc + vz * vc
            rect = Polygon([(cx + ux*a*cw/2 + vx*b*cd/2, cz + uz*a*cw/2 + vz*b*cd/2) for a, b in ((-1,-1),(1,-1),(1,1),(-1,1))])
            if rect.intersection(f).area < .93 * rect.area or rect.area < 120 or rect.area > 520: continue
            p0, p1 = nearest_points(rect.centroid, pb) if not pb.is_empty else (rect.centroid, rect.centroid)
            dx, dz = p1.x - cx, p1.y - cz
            cand = [(ux, uz), (-ux, -uz), (vx, vz), (-vx, -vz)]; best = max(cand, key=lambda q: q[0]*dx + q[1]*dz)
            plots.append((cx, cz, best[0], best[1], cw if abs(best[0]*vx + best[1]*vz) > .7 else cd, cd if abs(best[0]*vx + best[1]*vz) > .7 else cw))
print('działek', len(plots))
out = []
for cx, cz, nx, nz, ww, dd in plots:
    rot = math.atan2(nx, nz)   # grupa obrócona o rot ma lokalną oś z skierowaną na (nx, nz)
    sw = rng.choice([2.6, 3.0, 3.0, 3.4, 3.8]); sd = rng.choice([2.4, 2.8, 3.0, 3.2])
    out.append([round(cx, 1), round(cz, 1), round(rot, 3), round(sw, 1), round(sd, 1), rng.randrange(7), rng.randrange(5), rng.randrange(3), round(rng.uniform(-.25, .25) * ww, 1), round(ww, 1), round(dd, 1)])
js = "const DATA_ROD={w:%s,d:%s,poly:%s,p:%s};\n" % (PW, PD, json.dumps([[round(x, 1), round(z, 1)] for x, z in ROD.exterior.coords]), json.dumps(out, separators=(",", ":")))
(root.parent / "src" / "data_rod.js").write_text(js, encoding="utf-8")
if "--plot" in sys.argv:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(12, 12)); ax.plot(*ROD.exterior.xy, "g-")
    for p in paths: ax.plot(*p.xy, "b-", lw=1)
    for cx, cz, rot, sw, sd, _a, _b, _c, _d, PW, PD in out:
        c, s = math.cos(rot), math.sin(rot)
        # grupa: x'=x cos + z sin, z'=-x sin + z cos (jak L2W w grze)
        pts = [(cx + a * c + b * s, cz - a * s + b * c) for a, b in ((-PW/2, -PD/2), (PW/2, -PD/2), (PW/2, PD/2), (-PW/2, PD/2), (-PW/2, -PD/2))]
        ax.plot(*zip(*pts), "r-", lw=.6)
        fx, fz2 = cx + (PD/2) * s, cz + (PD/2) * c
        ax.plot([cx, fx], [cz, fz2], "k-", lw=.4)
    ax.set_aspect("equal"); ax.invert_yaxis(); fig.savefig("/tmp/claude-0/rod.png", dpi=70)
