#!/usr/bin/env python3
"""Wyciąga z surowych danych OSM (tools/raw/osm_area.json.gz) drzewa, szpalery, ścieżki piesze, ławki i boiska
i zapisuje je jako src/data_osm.js (DATA_OSM). Współrzędne w metrach gry (x, z), zaokrąglone do 0,1 m."""
import gzip, json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from geo import LAT0, LON0, KX, KZ
root = pathlib.Path(__file__).resolve().parent
d = json.load(gzip.open(root / "raw" / "osm_area.json.gz"))
N = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
W = [e for e in d["elements"] if e["type"] == "way"]
xz = lambda e: (round((e["lon"] - LON0) * KX, 1), round(-(e["lat"] - LAT0) * KZ, 1))
line = lambda w: [xz(N[n]) for n in w["nodes"] if n in N]
flat = lambda pts: [round(v, 1) for p in pts for v in p]
T, B, TR, F, P = [], [], [], [], []
for e in d["elements"]:
    t = e.get("tags", {})
    if e["type"] != "node": continue
    if t.get("natural") == "tree":
        x, z = xz(e); lt = t.get("leaf_type", ""); T += [x, z, 1 if lt == "needleleaved" else 0]
    elif t.get("amenity") == "bench":
        B += list(xz(e))
for w in W:
    t = w.get("tags", {}); pts = line(w)
    if len(pts) < 2: continue
    if t.get("natural") == "tree_row": TR.append(flat(pts))
    elif t.get("highway") in ("footway", "path", "pedestrian") and t.get("footway") not in ("crossing", "traffic_island") and t.get("highway") != "steps":
        F.append([1 if t.get("surface") in ("paving_stones", "paved", "concrete", "asphalt") else 0, flat(pts)])
    elif t.get("leisure") == "pitch" and len(pts) > 3:
        P.append([t.get("sport", ""), t.get("surface", ""), flat(pts)])
out = {"T": T, "B": B, "TR": TR, "F": F, "P": P}
(root.parent / "src" / "data_osm.js").write_text("const DATA_OSM=" + json.dumps(out, separators=(",", ":")) + ";\n", encoding="utf-8")
print({k: len(v) for k, v in out.items()})
