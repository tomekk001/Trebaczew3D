#!/usr/bin/env python3
"""Szczegóły parku przy Zielonej/Spacerowej z OSM (tools/raw/osm_area.json.gz) -> src/data_park.js.
Alejki, pojedyncze drzewa, ławki, piaskownica, rabata, żwir, słupki, ścianka wspinaczkowa, huśtawki i wejście na orlik."""
import gzip, json, math
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
LAT0, LON0 = 51.1301965, 18.9215954
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110574
loc = lambda lat, lon: [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]
BB = (-130, -300, 175, -195)          # prostokąt obejmujący park i orlik
inb = lambda p: BB[0] < p[0] < BB[2] and BB[1] < p[1] < BB[3]
osm = json.load(gzip.open(ROOT / 'tools' / 'raw' / 'osm_area.json.gz')); E = osm['elements']
nodes = {e['id']: e for e in E if e['type'] == 'node'}
D = {'paths': [], 'trees': [], 'benches': [], 'sand': [], 'flower': [], 'gravel': [], 'bollards': [], 'climb': [], 'swing': [], 'web': [], 'gate': None}
for e in E:
    t = e.get('tags') or {}
    if e['type'] == 'way':
        pts = [loc(nodes[n]['lat'], nodes[n]['lon']) for n in e['nodes'] if n in nodes]
        if not pts or sum(inb(p) for p in pts) < len(pts) * .6: continue
        if t.get('highway') == 'footway': D['paths'].append(pts)
        elif t.get('playground') == 'sandpit': D['sand'].append(pts)
        elif t.get('playground') == 'climbingwall': D['climb'].append(pts)
        elif t.get('landuse') == 'flowerbed': D['flower'].append(pts)
        elif t.get('landuse') == 'gravel': D['gravel'].append(pts)
        elif t.get('barrier') == 'bollard': D['bollards'].append(pts)
    elif e['type'] == 'node' and t:
        p = loc(e['lat'], e['lon'])
        if not inb(p): continue
        if t.get('natural') == 'tree': D['trees'].append(p + [1 if t.get('leaf_type') == 'needleleaved' else 0])
        elif t.get('amenity') == 'bench': D['benches'].append(p)
        elif t.get('playground') == 'swing': D['swing'].append(p)
        elif t.get('playground') == 'basketswing': D['web'].append(p)
        elif t.get('entrance') == 'yes': D['gate'] = p
(ROOT / 'src' / 'data_park.js').write_text('/* park w Trębaczewie – szczegóły z OSM (tools/park.py) */\nconst PARKD=' + json.dumps(D, separators=(',', ':')) + ';\n', encoding='utf-8')
print({k: (len(v) if isinstance(v, list) else v) for k, v in D.items()})
