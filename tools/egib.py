#!/usr/bin/env python3
"""Dane z ewidencji gruntów i budynków (EGiB, usługa WFS GUGiK) -> src/data_cad.js.

Wejście (tools/raw):
  egib_dzialki.txt   - działki: "klasoużytki|x,z,x,z,..." (dm, układ gry), rozdzielone średnikami
  egib_budynki.json  - budynki: [{p:[[x,z],...], r:rodzaj, k:kondygnacje}]
Wyjście: DATA_CAD (działki z klasoużytkiem), DATA_CADB (budynki z EGiB, których nie ma w DATA_B)
"""
import json, math, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_buildings import in_poly, area, mar
ROOT = Path(__file__).resolve().parent.parent; RAW = ROOT / "tools" / "raw"; SRC = ROOT / "src"
WX0, WX1, WZ0, WZ1 = -3100, 2560, -2860, 3400

def simplify(p, tol=0.12):
    out = list(p); ch = True
    while ch and len(out) > 3:
        ch = False
        for i in range(len(out)):
            a, b, c = out[i-1], out[i], out[(i+1) % len(out)]
            dx, dz = c[0]-a[0], c[1]-a[1]; l = math.hypot(dx, dz)
            d = abs((b[0]-a[0])*dz - (b[1]-a[1])*dx) / l if l > 1e-6 else math.hypot(b[0]-a[0], b[1]-a[1])
            if d < tol: out.pop(i); ch = True; break
    return out

def main():
    recs = []
    for r in (RAW / "egib_dzialki.txt").read_text(encoding="utf8").split(";"):
        k, c = r.split("|"); v = list(map(int, c.split(",")))
        p = [(v[i], v[i+1]) for i in range(0, len(v), 2)]
        if p[0] == p[-1]: p = p[:-1]
        if len(p) < 3: continue
        xs = [q[0]/10 for q in p]; zs = [q[1]/10 for q in p]
        if max(xs) < WX0 or min(xs) > WX1 or max(zs) < WZ0 or min(zs) > WZ1: continue
        p = simplify(p, 1.2)                                   # dm
        if len(p) < 3 or abs(area(p)) < 400: continue          # < 4 m2
        d = [p[0][0], p[0][1]] + [w for i in range(1, len(p)) for w in (p[i][0]-p[i-1][0], p[i][1]-p[i-1][1])]
        recs.append(k.replace(";", ",").replace('"', "") + "|" + ",".join(map(str, d)))
    # budynki z EGiB, których brakuje w DATA_B
    s = (SRC / "data_b.js").read_text(encoding="utf8")
    db = re.search(r"const DATA_B=`([^`]*)`", s).group(1).split(";"); G = []
    for r in db:
        v = r.split(","); G.append((float(v[0]), float(v[1]), float(v[2]), float(v[3]), math.radians(float(v[4]))))
    def in_rect(x, z, g, m=0.6):
        dx, dz = x-g[0], z-g[1]; c, sn = math.cos(g[4]), math.sin(g[4]); u = dx*c+dz*sn; w = -dx*sn+dz*c
        return abs(u) <= g[2]/2+m and abs(w) <= g[3]/2+m
    extra = []
    for b in json.load(open(RAW / "egib_budynki.json", encoding="utf8")):
        p = b["p"]; a = abs(area(p))
        if a < 8: continue
        cx = sum(q[0] for q in p)/len(p); cz = sum(q[1] for q in p)/len(p)
        if not (WX0 < cx < WX1 and WZ0 < cz < WZ1): continue
        near = [g for g in G if abs(g[0]-cx) < 80 and abs(g[1]-cz) < 80]
        if any(in_rect(cx, cz, g) or in_poly(g[0], g[1], p) or any(in_rect(q[0], q[1], g, 0) for q in p) for g in near): continue
        _, mx, mz, w, d, an = mar(p)
        extra.append(f"{mx:.1f},{mz:.1f},{w:.1f},{d:.1f},{math.degrees(an)%360:.0f},{b['r'] or 'x'},{b['k'] or 0}")
    # poprawki obrysów istniejących budynków wg EGiB: "indeks:x,z,w,d,kąt:części:indeksy do pominięcia"
    from osm_buildings import decompose
    EG = []
    for b in json.load(open(RAW / "egib_budynki.json", encoding="utf8")):
        p = b["p"]; a = abs(area(p))
        if a < 8: continue
        EG.append((p, a, sum(q[0] for q in p)/len(p), sum(q[1] for q in p)/len(p), b))
    S = {}; T = {}
    for ei, (p, a, cx, cz, b) in enumerate(EG):
        for gi, g in enumerate(G):
            if abs(g[0]-cx) > 60 or abs(g[1]-cz) > 60: continue
            if in_poly(g[0], g[1], p): S.setdefault(ei, []).append(gi)
            if in_rect(cx, cz, g, 0.3): T.setdefault(gi, []).append(ei)
    fixes = {}; stats = {"1:1": 0, "E>g": 0, "g>E": 0, "pominięte": 0}
    for ei, (p, a, cx, cz, b) in enumerate(EG):
        gs = S.get(ei, [])
        if not gs:
            cand = [gi for gi, es in T.items() if ei in es]
            if len(cand) != 1: continue
            gi = cand[0]; es = T[gi]
            if max(es, key=lambda e: EG[e][1]) != ei: continue          # mniejsze części dużego budynku z gry
            ga = G[gi][2]*G[gi][3]
            if not (0.4 < a/ga < 2.5): stats["pominięte"] += 1; continue
            tgt = gi; skip = []; stats["g>E" if len(es) > 1 else "1:1"] += 1
        else:
            tgt = max(gs, key=lambda gi: G[gi][2]*G[gi][3]); skip = [gi for gi in gs if gi != tgt]
            ga = sum(G[gi][2]*G[gi][3] for gi in gs)
            if not (0.4 < a/ga < 2.5): stats["pominięte"] += 1; continue
            stats["E>g" if skip else "1:1"] += 1
        if tgt in fixes: continue
        m = mar(p); _, mx, mz, w, d, an = m; parts = ""
        if a/max(1e-6, w*d) < 0.93 and len(p) > 4:
            r = decompose(p, m)
            if r and len(r) > 1: parts = "|".join(f"{x:.1f},{z:.1f},{rw:.1f},{rd:.1f}" for x, z, rw, rd in r)
        fixes[tgt] = f"{tgt}:{mx:.1f},{mz:.1f},{w:.1f},{d:.1f},{math.degrees(an)%360:.1f}:{parts}:{','.join(map(str, skip))}"
    print("poprawki obrysów", len(fixes), stats)
    (SRC / "data_cad.js").write_text("/* ewidencja gruntów i budynków (EGiB, GUGiK): działki z klasoużytkiem (dm, delty) i budynki, których brakowało */\nconst DATA_CAD=\"" + ";".join(recs) + "\";\nconst DATA_CADB=\"" + ";".join(extra) + "\";\nconst DATA_CADFIX=\"" + ";".join(fixes.values()) + "\";\n", encoding="utf8")
    print("dzialki", len(recs), "budynki dodatkowe", len(extra), "rozmiar", (SRC / "data_cad.js").stat().st_size)

if __name__ == "__main__": main()
