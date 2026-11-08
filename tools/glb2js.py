#!/usr/bin/env python3
"""Pakuje modele GLB z src/models/ do src/data_m.js (skwantyzowane wierzchołki + tekstura JPEG w base64).
Format: pozycje Int16 (mm), normalne Int8, UV Uint16, indeksy Uint16."""
import struct, json, base64, sys
from pathlib import Path
import numpy as np
root = Path(__file__).resolve().parent.parent
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}
def load(p):
    b = p.read_bytes(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl]); bin0 = 20 + jl + 8
    def acc(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; off = bin0 + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(b, CT[a['componentType']], a['count'] * NC[a['type']], off).reshape(a['count'], NC[a['type']])
    pr = j['meshes'][0]['primitives'][0]; at = pr['attributes']
    img = j['images'][0]; v = j['bufferViews'][img['bufferView']]; jpg = b[bin0 + v.get('byteOffset', 0): bin0 + v.get('byteOffset', 0) + v['byteLength']]
    return acc(at['POSITION']), acc(at['NORMAL']), acc(at['TEXCOORD_0']), acc(pr['indices']).ravel(), jpg
OUTSIDE = {'lewiatan', 'kosciol', 'dzwonnica', 'myjnia', 'tir_a', 'tir_b', 'tir_c'}   # potrzebne od startu; reszta (wnętrza) jest doczytywana
out = ['/* modele 3D z Blendera (tools/blender) – wygenerowane przez tools/glb2js.py */', 'const MODELS={};']
out_in = ['/* modele wnętrz – doczytywane osobno (na stronie) albo wklejone (artefakt) */']
for p in sorted((root / 'src' / 'models').glob('*.glb')):
    P, N, U, I, jpg = load(p); n = len(P)
    pad = lambda x: x + b'\0' * (-len(x) % 4)
    q = min(1000, int(32700 // max(1e-6, float(np.abs(P).max()))))   # pozycje w mm; duże bryły (Lidl 67 m, wiatrak 97 m) z mniejszą dokładnością
    blob = pad(np.round(P * q).astype('<i2').tobytes()) + pad(np.round(np.clip(N, -1, 1) * 127).astype('i1').tobytes()) + pad(np.round(np.clip(U, 0, 1) * 65535).astype('<u2').tobytes()) + I.astype('<u2').tobytes()
    line = f"MODELS[{json.dumps(p.stem)}]={{n:{n},i:{len(I)},{'' if q == 1000 else f'q:{q},'}g:'{base64.b64encode(blob).decode()}',t:'{base64.b64encode(jpg).decode()}'}};"
    (out if p.stem in OUTSIDE else out_in).append(line)
    print(p.name, n, 'wierzch.', len(I) // 3, 'trójk.', len(blob) // 1024, 'kB geometrii', len(jpg) // 1024, 'kB tekstury')
(root / 'src' / 'data_m.js').write_text('\n'.join(out) + '\n', encoding='utf-8')
(root / 'src' / 'data_m_in.js').write_text('\n'.join(out_in) + "\nwindow.MODELS_IN=true; window.dispatchEvent(new Event('modele'));\n", encoding='utf-8')
