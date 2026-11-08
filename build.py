#!/usr/bin/env python3
"""Składa grę w jeden plik index.html (head + dane + kod gry).

python3 build.py                  -> gra/index.html (gra; strona opisowa to index.html w katalogu głównym) (pełny dokument HTML, np. dla GitHub Pages)
python3 build.py --fragment PLIK  -> dodatkowo sam fragment strony (bez <html>/<head>), np. do artefaktu Claude
"""
import base64, sys
from pathlib import Path
root = Path(__file__).parent
src = root / "src"
parts = ["data.js", "data_b.js", "data_h.js", "data_p.js", "data_r.js", "data_x.js", "data_osm.js", "data_park.js", "data_hum.js", "data_o.js", "data_m.js", "game.js"]
head = (src / "head.html").read_text(encoding="utf-8")
fav = src / "favicon.png"
if fav.exists():
    head = head.replace("__FAVICON__", "data:image/png;base64," + base64.b64encode(fav.read_bytes()).decode())
import hashlib
code = "".join((src / p).read_text(encoding="utf-8") + "\n" for p in parts)
inner = (src / "data_m_in.js").read_text(encoding="utf-8") if (src / "data_m_in.js").exists() else ""
# strona: wnętrza w osobnym pliku models_in.js (szybsze pierwsze wczytanie); artefakt: wszystko w jednym pliku
(root / "gra").mkdir(exist_ok=True)
(root / "gra" / "models_in.js").write_text(inner, encoding="utf-8")
ver = hashlib.md5(inner.encode()).hexdigest()[:8]
body = head + "<script>\n" + code + "</script>\n"
site = head + "<script>\n" + code + "</script>\n" + (f'<script src="models_in.js?v={ver}" async></script>\n' if inner else "")
doc = ('<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       + site + "</html>\n")
(root / "gra" / "index.html").write_text(doc, encoding="utf-8")
print("gra/index.html:", len(doc), "bajtów")
if "--fragment" in sys.argv:
    out = Path(sys.argv[sys.argv.index("--fragment") + 1])
    out.write_text(head + "<script>\n" + code + inner + "</script>\n", encoding="utf-8")
    print(out, len(body), "bajtów")
