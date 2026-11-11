#!/usr/bin/env python3
"""Buduje dane świata gry z surowych danych w tools/raw/.

Wejście (tools/raw):
  osm_area.json.gz  - zrzut API OSM 0.6 /map dla całego obszaru (budynki, drogi, obszary, nazwy)
  bdot_area.json    - budynki BDOT10k (GUGiK) z liczbą kondygnacji i funkcją, w układzie gry
  nmt.txt           - siatka wysokości NMT (GUGiK) co 20 m
  orto.jpg          - ortofotomapa (GUGiK) 2,5 m/piksel dla całego obszaru
Wyjście (src):
  data_b.js  - budynki (DATA_B, DATA_PARTS, DATA_ADDR)
  data_r.js  - kolory dachów
  data_h.js  - siatka wysokości (HGRID)
  data_x.js  - rozszerzenie świata: drogi, tory, lasy, woda, miejscowości (DATA_X)
  data_o.js  - ortofotomapa jako obraz (ORTO)
"""
import base64, gzip, json, math, re, sys
from pathlib import Path
from collections import defaultdict
sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_buildings import load_old, in_poly, area, mar, decompose
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"; SRC = ROOT / "src"
LAT0, LON0 = 51.1301965, 18.9215954
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110574
WX0, WX1, WZ0, WZ1 = -3100, 2560, -2860, 3400         # granice świata (pas północny z<-860: Sadowiec, tools/raw/*north*)
ZS = -860                                               # południowa granica pasa północnego
OLD = (-1150, 950, -850, 1050)                          # stary obszar (dane ręcznie dopracowane)
ORTO_MPP = 2.5
loc = lambda lat, lon: ((lon - LON0) * KX, -(lat - LAT0) * KZ)

def seg_dist(px, pz, a, b):
    dx, dz = b[0]-a[0], b[1]-a[1]; L = dx*dx + dz*dz
    t = 0 if L == 0 else max(0, min(1, ((px-a[0])*dx + (pz-a[1])*dz) / L))
    return math.hypot(a[0]+dx*t-px, a[1]+dz*t-pz)

def enc_delta(pts):
    p = [[round(v[0]), round(v[1])] for v in pts]
    out = [p[0][0], p[0][1]]
    for i in range(1, len(p)):
        d = [p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]]
        if d == [0, 0]: continue
        out += d
    return out

def in_world(x, z, m=0): return WX0-m < x < WX1+m and WZ0-m < z < WZ1+m
def in_old(x, z): return OLD[0] < x < OLD[1] and OLD[2] < z < OLD[3]

def main():
    osm = json.load(gzip.open(RAW / "osm_area.json.gz"))
    if (RAW / "osm_north.json.gz").exists():                 # pas północny (Sadowiec-Niwy/Wieś/Wrzosy): API OSM 0.6 /map w kafelkach
        have = {(e["type"], e["id"]) for e in osm["elements"]}
        osm["elements"] += [e for e in json.load(gzip.open(RAW / "osm_north.json.gz"))["elements"] if (e["type"], e["id"]) not in have]
    E = osm["elements"]; nodes = {e["id"]: e for e in E if e["type"] == "node"}
    ways = {e["id"]: e for e in E if e["type"] == "way"}
    def wpts(w): return [loc(nodes[n]["lat"], nodes[n]["lon"]) for n in w["nodes"] if n in nodes]
    orto = Image.open(RAW / "orto.jpg").convert("RGB")
    if (RAW / "orto_north_a.jpg").exists():                   # ortofoto pasa północnego (GUGiK WMS) doklejone od góry
        na = Image.open(RAW / "orto_north_a.jpg").convert("RGB"); nb = Image.open(RAW / "orto_north_b.jpg").convert("RGB")
        full = Image.new("RGB", (orto.width, orto.height + na.height)); full.paste(na, (0, 0)); full.paste(nb, (na.width, 0)); full.paste(orto, (0, na.height))
        orto = full; orto.save(RAW / "orto_full.jpg", quality=80)
    OW, OH = orto.size

    # ---------- wysokości ----------
    head, body = (RAW / "nmt.txt").read_text().split("\n", 1)
    hp = dict(kv.split("=") for kv in head.split()); vals = [float(v) for v in body.strip().split(",")]
    base = 175
    if (RAW / "nmt_north.txt").exists():                       # wysokości pasa północnego (GUGiK NMT, 20 m): 100 wierszy z=-2860..-880
        nv = [float(v) for v in (RAW / "nmt_north.txt").read_text().split(",")]; assert len(nv) == 100 * int(hp["nx"])
        vals = nv + vals; hp["nz"] = str(int(hp["nz"]) + 100); hp["z0"] = str(int(hp["z0"]) - 2000)
    # NMT sięga tylko do z=2020: dalej na południe (Cementownia, dolina Warty) wysokości dopełniamy trendem z ostatnich wierszy (bez danych publicznych w tym pliku)
    nx0, nz0 = int(hp["nx"]), int(hp["nz"]); step0 = int(hp["step"]); nzn = int((WZ1 + 40 - int(hp["z0"])) // step0) + 1
    import statistics
    grid = [vals[r*nx0:(r+1)*nx0] for r in range(nz0)]
    # na południe od ostatniego wiersza NMT teren łagodnie schodzi do poziomu równiny zakładu (bez stromych skarp); poziom = mediana ostatniego wiersza
    last = grid[nz0-1]; xs0 = int(hp["x0"]); cols = [c for c in range(nx0) if 0 <= xs0 + c*step0 <= 1500]
    P = min(200.0, statistics.median(last[c] for c in cols)); print("poziom równiny zakładu:", round(P, 1), "m n.p.m.")
    wide = [statistics.mean(last[max(0, c-8):c+9]) for c in range(nx0)]
    NB = 30
    for r in range(nz0, nzn):
        k = r - nz0 + 1; t = min(1.0, k/NB); t = t*t*(3-2*t)
        grid.append([wide[c]*(1-t) + P*t for c in range(nx0)])
    vals = [v for row in grid for v in row]; hp["nz"] = str(nzn)
    s = "".join(_b36(max(0, min(1295, round((v-base)*10)))) for v in vals)
    (SRC / "data_h.js").write_text(f'const HGRID={{x0:{hp["x0"]},z0:{hp["z0"]},step:{hp["step"]},nx:{hp["nx"]},nz:{hp["nz"]},base:{base},s:"{s}"}};\n')
    if (RAW / "nmt_wcs10.txt").exists():   # dokładniejsza siatka 10 m z WCS GUGiK (GRID1) dla całego świata (nx=567, nz=627, z0=-2860): zastępuje powyższą (2 znaki base36 / punkt, 0,1 m)
        (SRC / "data_h.js").write_text('const HGRID={x0:-3100,z0:-2860,step:10,nx:567,nz:627,base:175,s:"%s"};\n' % (RAW / "nmt_wcs10.txt").read_text().strip())

    # ---------- budynki ----------
    old, roof, bp = load_old()
    bdot = json.load(open(RAW / "bdot_area.json", encoding="utf-8"))
    bgrid = defaultdict(list)
    for i, b in enumerate(bdot): bgrid[(int(b["c"][0]//50), int(b["c"][1]//50))].append(i)
    def bdot_near(cx, cz, poly):
        best = None; bd = 1e9
        for gx in range(int(cx//50)-1, int(cx//50)+2):
            for gz in range(int(cz//50)-1, int(cz//50)+2):
                for i in bgrid[(gx, gz)]:
                    b = bdot[i]; d = math.hypot(b["c"][0]-cx, b["c"][1]-cz)
                    if (in_poly(b["c"][0], b["c"][1], poly) or in_poly(cx, cz, b["p"])) and d < bd: bd, best = d, i
        return best
    FS_CODE = {"budynek jednorodzinny": 1, "budynek wielorodzinny": 1, "dom letniskowy": 1, "budynek gospodarczy": 3, "garaż": 2,
               "magazyn": 6, "produkcyjny": 6, "siedziba firmy lub firm": 4, "obiekt handlowo-usługowy": 4, "dom towarowy lub handlowy": 4,
               "hipermarket lub supermarket": 4, "apteka": 4, "stacja transformatorowa": 3, "stacja pomp": 3, "szklarnia lub cieplarnia": 3,
               "elektrociepłownia": 6, "przedszkole": 5, "szkoła podstawowa": 5, "biblioteka": 5, "dom kultury": 5, "kościół": 5,
               "dworzec kolejowy": 5, "klub sportowy": 5, "placówka opiekuńczo-wychowawcza": 5}
    TYPE_CODE = {"house": 1, "detached": 1, "residential": 1, "apartments": 1, "garage": 2, "garages": 2, "shed": 3, "outbuilding": 3,
                 "barn": 3, "farm_auxiliary": 3, "retail": 4, "commercial": 4, "industrial": 6, "warehouse": 6, "school": 5, "church": 5,
                 "fire_station": 5, "kindergarten": 5, "public": 5, "train_station": 5}
    def roof_from_orto(cx, cz):
        px, py = (cx-WX0)/ORTO_MPP, (cz-WZ0)/ORTO_MPP
        if not (1 <= px < OW-1 and 1 <= py < OH-1): return "..."
        r = g = b = 0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                c = orto.getpixel((int(px)+dx, int(py)+dy)); r += c[0]; g += c[1]; b += c[2]
        return "".join(format(min(15, round(v/9/17)), "x") for v in (r, g, b))
    used_old, used_bdot = set(), set(); recs = []
    def add_building(p, typ, lv, name, shop, street, num, src_bdot=None):
        if abs(area(p)) < 6: return
        cxp = sum(v[0] for v in p)/len(p); czp = sum(v[1] for v in p)/len(p)
        if not in_world(cxp, czp, -40): return
        if any(in_poly(cxp, czp, q) for q in bp): return
        m = mar(p); _, cx, cz, w, dd, an = m
        oi = None; bd = 1e9
        if in_old(cx, cz) or True:
            for i, o in enumerate(old):
                if i in used_old or abs(o["x"]-cx) > 30 or abs(o["z"]-cz) > 30: continue
                dist = math.hypot(o["x"]-cx, o["z"]-cz)
                if dist < bd and (in_poly(o["x"], o["z"], p) or dist < 3): bd, oi = dist, i
        o = old[oi] if oi is not None else None
        if o: used_old.add(oi)
        bi = src_bdot if src_bdot is not None else bdot_near(cx, cz, p)
        bdb = None
        if bi is not None and bi not in used_bdot: used_bdot.add(bi); bdb = bdot[bi]
        if bdb is not None and src_bdot is None and bdb["kat"] in ("zniszczony",): bdb = None
        if o: code = o["code"]
        elif bdb and bdb["fs"] in FS_CODE: code = FS_CODE[bdb["fs"]]
        elif shop: code = 4
        else: code = TYPE_CODE.get(typ, 0)
        levels = int(bdb["lk"]) if bdb and bdb["lk"].isdigit() else (int(lv) if str(lv).isdigit() else (o["lv"] if o else 0))
        nm = o["name"] if o and o["name"] else (name or "")
        deg = math.degrees(an) % 360
        rec = f"{round(cx)},{round(cz)},{round(w*2)/2:g},{round(dd*2)/2:g},{round(deg)},{code}"
        if levels or nm: rec += f",{levels}"
        if nm: rec += ',"' + nm.replace('"', "'").replace("`", "'") + '"'
        parts = None
        ratio = abs(area(p)) / max(1e-6, w*dd)
        if ratio < 0.93 and len(p) > 4 and code != 5 and nm not in ("Lewiatan", "Żabka"):
            r = decompose(p, m)
            if r and len(r) > 1: parts = "|".join(f"{x:.1f},{z:.1f},{rw:.1f},{rd:.1f}" for x, z, rw, rd in r)
        rc = roof[oi*3:oi*3+3] if o and len(roof) >= oi*3+3 else roof_from_orto(cx, cz)
        addr = None
        if num: addr = ({"Generała Władysława Sikorskiego": "Sikorskiego", "Jarosława Zdzisława Stodulskiego": "Stodulskiego"}.get(street, street) or "") + "|" + num
        recs.append((rec, parts, addr, rc))
    for e in E:
        if e["type"] != "way" or "building" not in e.get("tags", {}): continue
        t = e["tags"]; p = wpts(e)
        if len(p) < 4: continue
        if p[0] == p[-1]: p = p[:-1]
        nm0 = "shelter" if t.get("amenity") == "shelter" and t.get("shelter_type") == "public_transport" else t.get("name", "")
        add_building(p, t["building"], t.get("building:levels", ""), nm0, t.get("shop") or "",
                     t.get("addr:street") or t.get("addr:place") or "", t.get("addr:housenumber", ""))
    n_osm = len(recs)
    for i, b in enumerate(bdot):
        if i in used_bdot or b["kat"] in ("zniszczony",): continue
        p = b["p"][:-1] if b["p"][0] == b["p"][-1] else b["p"]
        add_building(p, "", "", b["nazwa"], "", "", "", src_bdot=i)
    # zachowaj nazwę "shelter" dla wiat przystankowych (gra ich szuka po nazwie)
    js = ("const DATA_B=`" + ";".join(r[0] for r in recs) + "`;\nconst DATA_PARTS=`" +
          ";".join(f"{i}:{r[1]}" for i, r in enumerate(recs) if r[1]) + "`;\nconst DATA_ADDR=`" +
          ";".join(f"{i}:{r[2]}" for i, r in enumerate(recs) if r[2]) + "`;\n")
    (SRC / "data_b.js").write_text(js, encoding="utf-8")
    (SRC / "data_r.js").write_text('const DATA_ROOF="' + "".join(r[3] for r in recs) + '";\n', encoding="utf-8")

    # ---------- drogi i tory: przedłużenia poza dopracowany obszar ----------
    data = (SRC / "data.js").read_text(encoding="utf-8")
    old_roads = []
    for m_ in re.finditer(r'\["([a-z:]+)","([^"]*)","([^"]*)",\[([-\d,]+)\]\]', data):
        d = [int(v) for v in m_.group(4).split(",")]; pts = [[d[0], d[1]]]
        for k in range(2, len(d), 2): pts.append([pts[-1][0]+d[k], pts[-1][1]+d[k+1]])
        old_roads.append((m_.group(1), pts))
    segs = defaultdict(list)
    for t, pts in old_roads:
        for a, b in zip(pts, pts[1:]):
            for gx in range(int(min(a[0], b[0])//40)-1, int(max(a[0], b[0])//40)+2):
                for gz in range(int(min(a[1], b[1])//40)-1, int(max(a[1], b[1])//40)+2): segs[(gx, gz)].append((a, b))
    def covered(x, z, tol=7):
        return any(seg_dist(x, z, a, b) < tol for a, b in segs[(int(x//40), int(z//40))])
    HW = {"primary": "primary", "trunk": "primary", "secondary": "unc", "tertiary": "unc", "unclassified": "unc", "residential": "res",
          "living_street": "res", "service": "srv", "track": "track"}
    roads = []; dk_ways = []
    for e in E:
        if e["type"] != "way": continue
        t = e.get("tags", {}); hw = t.get("highway"); rw = t.get("railway")
        if hw == "primary" and "42" in t.get("ref", ""): dk_ways.append(e); continue
        if hw in HW: typ = HW[hw]
        elif rw == "rail": typ = "rail:rail"
        else: continue
        if hw == "service" and t.get("service") in ("parking_aisle", "driveway"): continue
        pts = wpts(e)
        if len(pts) < 2: continue
        # dzielimy na odcinki niepokryte przez stare drogi
        run = []
        def flush():
            if len(run) >= 2 and lineLen(run) > 12: roads.append([typ, t.get("name", ""), t.get("ref", ""), enc_delta(run)])
        cov = [covered(*q) for q in pts]
        for i, q in enumerate(pts):
            if not cov[i] and in_world(q[0], q[1], 200):
                if not run and i > 0: run.append(pts[i-1])
                run.append(q)
            else:
                if run: run.append(q); flush(); run = []
        if run: flush()
    # DK42: jedna ciągła linia z zachodu na wschód (zastępuje starą)
    chain = merge_ways([wpts(w) for w in dk_ways])
    chain = [q for q in chain if in_world(q[0], q[1], 300)]
    if chain[0][0] > chain[-1][0]: chain = chain[::-1]
    # ---------- obszary ----------
    AREA_T = {("landuse", "forest"): "nat:wood", ("natural", "wood"): "nat:wood", ("natural", "water"): "nat:water",
              ("landuse", "industrial"): "lu:industrial", ("landuse", "commercial"): "lu:commercial", ("landuse", "retail"): "lu:commercial",
              ("landuse", "cemetery"): "lu:cemetery", ("amenity", "parking"): "am:parking", ("leisure", "pitch"): "lei:pitch",
              ("amenity", "school"): "am:school", ("amenity", "kindergarten"): "am:kindergarten", ("leisure", "park"): "lei:park",
              ("leisure", "stadium"): "lei:stadium", ("landuse", "gravel"): "lu:quarry", ("natural", "sand"): "lu:quarry",
              ("landuse", "quarry"): "lu:quarry", ("natural", "scrub"): "nat:scrub", ("landuse", "allotments"): "lu:allotments"}
    def area_t(t):
        for (k, v), at in AREA_T.items():
            if t.get(k) == v: return at
        return None
    areas = []
    def add_area(at, name, pts):
        if len(pts) < 3: return
        cx = sum(q[0] for q in pts)/len(pts); cz = sum(q[1] for q in pts)/len(pts)
        if not in_world(cx, cz, 300): return
        if at not in ("nat:wood", "nat:water", "lu:quarry", "nat:scrub") and in_old(cx, cz): return
        pts = [[max(WX0-400, min(WX1+400, q[0])), max(WZ0-400, min(WZ1+400, q[1]))] for q in pts]
        pts = simplify(pts, 2.0)
        if abs(area(pts)) < 200: return
        areas.append([at, name, "", "", enc_delta(pts)])
    for e in E:
        t = e.get("tags", {}); at = area_t(t)
        if not at: continue
        if e["type"] == "way":
            p = wpts(e)
            if len(p) >= 4 and e["nodes"][0] == e["nodes"][-1]: add_area(at, t.get("name", ""), p[:-1])
        elif e["type"] == "relation" and t.get("type") == "multipolygon":
            outer = [wpts(ways[m["ref"]]) for m in e["members"] if m["type"] == "way" and m.get("role") == "outer" and m["ref"] in ways]
            for ring in rings(outer): add_area(at, t.get("name", ""), ring)
    # ---------- miejscowości i punkty ----------
    places = []
    for e in E:
        if e["type"] != "node": continue
        t = e.get("tags", {}); x, z = loc(e["lat"], e["lon"])
        if not in_world(x, z): continue
        if t.get("place") in ("village", "hamlet", "town", "suburb", "neighbourhood", "locality") and t.get("name") and t["name"] != "Trębaczew":
            places.append([t["name"], "place:" + t["place"], round(x), round(z)])
        elif t.get("name") and not in_old(x, z) and (t.get("shop") or t.get("amenity") in ("fuel", "restaurant", "pharmacy", "place_of_worship", "animal_shelter", "community_centre")
                                                     or t.get("railway") in ("station", "halt") or t.get("historic") or t.get("tourism") or t.get("leisure") in ("stadium",)):
            kind = t.get("shop") and "shop" or t.get("amenity") or t.get("railway") or t.get("historic") or t.get("tourism") or "poi"
            places.append([t["name"], kind, round(x), round(z)])
    for e in E:   # nazwane obszary/zakłady jako punkty (np. BPT STEEL, kopalnia)
        if e["type"] != "way": continue
        t = e.get("tags", {})
        if not t.get("name") or "highway" in t or "building" in t or "waterway" in t: continue
        if not (t.get("landuse") in ("industrial", "commercial", "quarry") or t.get("leisure") in ("stadium", "pitch") or t.get("amenity")): continue
        p = wpts(e)
        if not p: continue
        x = sum(q[0] for q in p)/len(p); z = sum(q[1] for q in p)/len(p)
        if in_world(x, z) and not in_old(x, z): places.append([t["name"], t.get("landuse") or t.get("leisure") or t.get("amenity"), round(x), round(z)])
    # ---------- maska przejścia w pasie północnym: poza drogami/zabudową/ogrodami teren jest nieprzejezdny (wyszarzony w grze) ----------
    from PIL import ImageDraw, ImageFilter
    CELL = 10; mx0, mz0 = WX0, WZ0; mnx = (WX1 - WX0) // CELL; mnz = (ZS - WZ0) // CELL
    lines = Image.new("L", (mnx, mnz), 0); dl = ImageDraw.Draw(lines); blobs = Image.new("L", (mnx, mnz), 0); db = ImageDraw.Draw(blobs)
    toc = lambda q: ((q[0]-mx0)/CELL, (q[1]-mz0)/CELL)
    for e in E:
        if e["type"] != "way": continue
        t = e.get("tags", {}); w_ = wpts(e)
        if len(w_) < 2: continue
        if t.get("highway") and t.get("highway") not in ("proposed", "construction"):
            dl.line([toc(q) for q in w_], fill=255, width=max(1, round(2 * 26 / CELL)))
        elif "building" in t:
            if len(w_) >= 3: db.polygon([toc(q) for q in w_], fill=255)
        elif t.get("landuse") in ("residential", "allotments", "commercial", "industrial", "retail") or t.get("leisure") in ("park", "pitch", "playground", "garden") or t.get("amenity") in ("school", "parking", "kindergarten"):
            if len(w_) >= 3: db.polygon([toc(q) for q in w_], fill=255)
    blobs = blobs.filter(ImageFilter.MaxFilter(7))         # ~ +30 m wokół zabudowy
    walk = Image.eval(Image.merge("L", [lines])  , lambda v: v)
    from PIL import ImageChops
    walk = ImageChops.lighter(lines, blobs)
    # nad wiaduktem/torami nie wolno chodzić po samej linii kolejowej (przejścia tylko przez drogi)
    wb = walk.tobytes(); bits = bytearray((mnx * mnz + 7) // 8)
    for i, v in enumerate(wb):
        if v > 127: bits[i >> 3] |= 1 << (i & 7)
    NMASK = {"x0": mx0, "z0": mz0, "c": CELL, "nx": mnx, "nz": mnz, "s": base64.b64encode(bytes(bits)).decode()}
    print("maska pasa północnego: przejście", round(sum(1 for v in wb if v > 127) / len(wb) * 100, 1), "% komórek")
    X = {"DK": enc_delta(chain), "R": roads, "A": areas, "P": places, "W": [WX0, WX1, WZ0, WZ1], "N": NMASK}
    (SRC / "data_x.js").write_text("const DATA_X=" + json.dumps(X, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    # ---------- ortofotomapa ----------
    b64 = base64.b64encode(((RAW / "orto_full.jpg") if (RAW / "orto_full.jpg").exists() else (RAW / "orto.jpg")).read_bytes()).decode()
    (SRC / "data_o.js").write_text(f'const ORTO={{src:"data:image/jpeg;base64,{b64}",x0:{WX0},z0:{WZ0},mpp:{ORTO_MPP}}};\n')
    print(json.dumps(dict(buildings=len(recs), from_osm=n_osm, from_bdot_only=len(recs)-n_osm, bdot_matched=len(used_bdot), old_matched=len(used_old),
                          parts=sum(1 for r in recs if r[1]), roads=len(roads), dk_pts=len(chain), areas=len(areas), places=len(places))))

def _b36(n):
    d = "0123456789abcdefghijklmnopqrstuvwxyz"; return d[n//36] + d[n % 36]

def lineLen(p): return sum(math.hypot(b[0]-a[0], b[1]-a[1]) for a, b in zip(p, p[1:]))

def merge_ways(lines):
    lines = [l for l in lines if len(l) > 1]
    if not lines: return []
    chain = lines.pop(0)
    while lines:
        best = None
        for i, l in enumerate(lines):
            for rev in (False, True):
                q = l[::-1] if rev else l
                d1 = math.hypot(chain[-1][0]-q[0][0], chain[-1][1]-q[0][1]); d2 = math.hypot(q[-1][0]-chain[0][0], q[-1][1]-chain[0][1])
                for d, end in ((d1, "tail"), (d2, "head")):
                    if best is None or d < best[0]: best = (d, i, rev, end)
        d, i, rev, end = best; q = lines.pop(i); q = q[::-1] if rev else q
        if d > 60: continue        # równoległa jezdnia/odnoga - pomijamy
        chain = chain + q[1:] if end == "tail" else q[:-1] + chain
    return chain

def rings(parts):
    parts = [p[:] for p in parts if len(p) > 1]; out = []
    while parts:
        r = parts.pop(0)
        changed = True
        while changed and math.hypot(r[0][0]-r[-1][0], r[0][1]-r[-1][1]) > 1:
            changed = False
            for i, q in enumerate(parts):
                if math.hypot(q[0][0]-r[-1][0], q[0][1]-r[-1][1]) < 1: r += q[1:]; parts.pop(i); changed = True; break
                if math.hypot(q[-1][0]-r[-1][0], q[-1][1]-r[-1][1]) < 1: r += q[::-1][1:]; parts.pop(i); changed = True; break
        if len(r) >= 4: out.append(r[:-1] if r[0] == r[-1] else r)
    return out

def simplify(pts, tol):
    if len(pts) < 5: return pts
    def rdp(a, b, sub):
        if not sub: return []
        dm, im = 0, 0
        for i, q in enumerate(sub):
            d = seg_dist(q[0], q[1], a, b)
            if d > dm: dm, im = d, i
        if dm < tol: return []
        return rdp(a, sub[im], sub[:im]) + [sub[im]] + rdp(sub[im], b, sub[im+1:])
    return [pts[0]] + rdp(pts[0], pts[-1], pts[1:-1]) + [pts[-1]]

if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    main()
