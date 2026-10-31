#!/usr/bin/env python3
"""Przetwarza budynki z OSM (API 0.6 /map) na dane gry.

Wejście: zakodowany zrzut budynków (osm_buildings.txt), format:
  ulice~...#poly|typ|piętra|nazwa|sklep|ulica_idx|numer;...
  poly = delta-kodowane wierzchołki w jednostkach 0,2 m w układzie lokalnym gry.
Wyjście: src/data_b.js z DATA_B (prostokąt MAR), DATA_PARTS (rozkład brył) i DATA_ADDR,
oraz src/data_r.js z kolorami dachów przemapowanymi na nową kolejność budynków.
"""
import math, re, sys, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

def load_old():
    s = (ROOT / "tools" / "legacy_buildings.js").read_text(encoding="utf-8")
    i = s.index("DATA_B=`") + 8; j = s.index("`", i)
    old = []
    for e in s[i:j].split(";"):
        q = e.find('"'); name = e[q+1:e.rindex('"')] if q >= 0 else ""
        nums = [float(x) for x in (e[:q] if q >= 0 else e).split(",") if x != ""]
        old.append(dict(x=nums[0], z=nums[1], w=nums[2], d=nums[3], deg=nums[4], code=int(nums[5]), lv=int(nums[6]) if len(nums) > 6 else 0, name=name))
    roof = re.search(r'DATA_ROOF="([0-9a-f]*)"', (ROOT / "tools" / "legacy_roof.js").read_text()).group(1)
    s = (SRC / "data.js").read_text(encoding="utf-8")
    bp = []
    for m in re.finditer(r'\[(\d+),(\d+),"([^"]*)",\[([-\d,]+)\]\]', s):
        d = [int(v) for v in m.group(4).split(",")]
        pts = [[d[0], d[1]]] + [[d[0] + d[k], d[1] + d[k+1]] for k in range(2, len(d), 2)]
        bp.append(pts)
    return old, roof, bp

def in_poly(x, y, p):
    c = False; j = len(p) - 1
    for i in range(len(p)):
        a, b = p[i], p[j]
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1]) + a[0]: c = not c
        j = i
    return c

def area(p):
    return sum(p[i][0]*p[(i+1)%len(p)][1] - p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p))) / 2

def mar(p):
    best = None
    for i in range(len(p)):
        q = p[(i+1) % len(p)]; an = math.atan2(q[1]-p[i][1], q[0]-p[i][0]); c, s = math.cos(an), math.sin(an)
        us = [v[0]*c + v[1]*s for v in p]; ws = [-v[0]*s + v[1]*c for v in p]
        A = (max(us)-min(us)) * (max(ws)-min(ws))
        if best is None or A < best[0]:
            mu, mw = (max(us)+min(us))/2, (max(ws)+min(ws))/2
            best = (A, mu*c - mw*s, mu*s + mw*c, max(us)-min(us), max(ws)-min(ws), an)
    return best

def decompose(p, m):
    """Rozkład wielokąta (prawie) prostokątnego na prostokąty w układzie MAR."""
    _, cx, cz, w, d, an = m
    c, s = math.cos(an), math.sin(an)
    loc = [((v[0]-cx)*c + (v[1]-cz)*s, -(v[0]-cx)*s + (v[1]-cz)*c) for v in p]
    # krawędzie muszą być bliskie osiom (±12°)
    for i in range(len(loc)):
        a, b = loc[i], loc[(i+1) % len(loc)]; L = math.hypot(b[0]-a[0], b[1]-a[1])
        if L < 0.6: continue
        ang = abs(math.degrees(math.atan2(b[1]-a[1], b[0]-a[0]))) % 90
        if 12 < ang < 78: return None
    def clus(vals):
        vals = sorted(vals); out = [vals[0]]
        for v in vals[1:]:
            if v - out[-1] > 0.5: out.append(v)
        return out
    us = clus([v[0] for v in loc] + [-w/2, w/2]); vs = clus([v[1] for v in loc] + [-d/2, d/2])
    us = [u for u in us if -w/2 - .01 <= u <= w/2 + .01]; vs = [v for v in vs if -d/2 - .01 <= v <= d/2 + .01]
    if len(us) > 9 or len(vs) > 9: return None
    nu, nv = len(us)-1, len(vs)-1
    cell = [[in_poly((us[i]+us[i+1])/2, (vs[j]+vs[j+1])/2, loc) for j in range(nv)] for i in range(nu)]
    used = [[False]*nv for _ in range(nu)]; rects = []
    # zachłannie: największe prostokąty najpierw
    while True:
        best = None
        for i0 in range(nu):
            for j0 in range(nv):
                if not cell[i0][j0] or used[i0][j0]: continue
                for i1 in range(i0, nu):
                    if not cell[i1][j0] or used[i1][j0]: break
                    for j1 in range(j0, nv):
                        if not all(cell[i][j] and not used[i][j] for i in range(i0, i1+1) for j in range(j0, j1+1)): break
                        A = (us[i1+1]-us[i0]) * (vs[j1+1]-vs[j0])
                        if best is None or A > best[0]: best = (A, i0, i1, j0, j1)
        if best is None: break
        A, i0, i1, j0, j1 = best
        for i in range(i0, i1+1):
            for j in range(j0, j1+1): used[i][j] = True
        u0, u1, v0, v1 = us[i0], us[i1+1], vs[j0], vs[j1+1]
        if (u1-u0) < 1.2 or (v1-v0) < 1.2: continue
        rects.append(((u0+u1)/2, (v0+v1)/2, u1-u0, v1-v0))
    if not rects or len(rects) > 8: return None
    out = []
    for (u, v, rw, rd) in rects:
        out.append((cx + u*c - v*s, cz + u*s + v*c, rw, rd))
    return out

TYPE_CODE = {'h': 1, 'd': 1, 'o': 3, 'g': 2, 'r': 4, 's': 5, 'c': 5, 'f': 5, 'i': 0, 'w': 0, 'k': 0, '': 0}

def main():
    raw = (Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tools" / "osm_buildings.txt").read_text(encoding="utf-8")
    streets_s, body = raw.split("#", 1); streets = streets_s.split("~")
    old, roof, bp = load_old()
    used_old = set(); out_b = []; parts = []; addr = []; roof_new = []
    stats = dict(total=0, skipped_bp=0, matched=0, multipart=0)
    for k, e in enumerate(body.split(";")):
        f = e.split("|"); d = [int(v) for v in f[0].split(",")]
        p = [[d[0]*.2, d[1]*.2]]
        for i in range(2, len(d), 2): p.append([p[-1][0] + d[i]*.2, p[-1][1] + d[i+1]*.2])
        f += [""] * (7 - len(f)); typ, lv, name, shop, st, num = f[1:7]
        if abs(area(p)) < 4: continue
        cxp = sum(v[0] for v in p)/len(p); czp = sum(v[1] for v in p)/len(p)
        if any(in_poly(cxp, czp, q) for q in bp): stats['skipped_bp'] += 1; continue
        stats['total'] += 1
        m = mar(p); _, cx, cz, w, dd, an = m
        # dopasowanie do starego budynku (zachowuje kody, nazwy i kolor dachu)
        oi = None; bd = 1e9
        for i, o in enumerate(old):
            if i in used_old: continue
            dist = math.hypot(o['x']-cx, o['z']-cz)
            if dist < bd and (in_poly(o['x'], o['z'], p) or dist < 3): bd, oi = dist, i
        o = old[oi] if oi is not None else None
        if o: used_old.add(oi); stats['matched'] += 1
        code = o['code'] if o else (4 if shop and typ in ('', 'r') else TYPE_CODE.get(typ, 0))
        levels = int(lv) if lv.isdigit() else (o['lv'] if o else 0)
        nm = o['name'] if o and o['name'] else (name if name else "")
        deg = math.degrees(an) % 360
        rec = f"{round(cx)},{round(cz)},{round(w*2)/2:g},{round(dd*2)/2:g},{round(deg)},{code}"
        if levels or nm: rec += f",{levels}"
        if nm: rec += f',"{nm.replace(chr(34), chr(39))}"'
        bi = len(out_b); out_b.append(rec)
        roof_new.append(roof[oi*3:oi*3+3] if o and len(roof) >= oi*3+3 else "...")
        ratio = abs(area(p)) / max(1e-6, w*dd)
        if ratio < 0.93 and len(p) > 4 and code not in (5,) and nm not in ('Lewiatan', 'Żabka'):
            r = decompose(p, m)
            if r and len(r) > 1:
                stats['multipart'] += 1
                parts.append(f"{bi}:" + "|".join(f"{x:.1f},{z:.1f},{rw:.1f},{rd:.1f}" for x, z, rw, rd in r))
        if num:
            sn = streets[int(st)] if st.isdigit() and int(st) < len(streets) else ""
            sn = {"Generała Władysława Sikorskiego": "Sikorskiego"}.get(sn, sn)
            addr.append(f"{bi}:{sn}|{num}")
    js = "const DATA_B=`" + ";".join(out_b) + "`;\nconst DATA_PARTS=`" + ";".join(parts) + "`;\nconst DATA_ADDR=`" + ";".join(addr) + "`;\n"
    (SRC / "data_b.js").write_text(js, encoding="utf-8")
    (SRC / "data_r.js").write_text('const DATA_ROOF="' + "".join(roof_new) + '";\n', encoding="utf-8")
    stats.update(buildings=len(out_b), parts=len(parts), addresses=len(addr), unmatched_old=len(old)-len(used_old))
    print(json.dumps(stats))

if __name__ == "__main__":
    main()
