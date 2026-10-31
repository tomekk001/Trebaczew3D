#!/usr/bin/env python3
"""Składa grę w jeden plik index.html (head + dane + kod gry)."""
from pathlib import Path
src = Path(__file__).parent / "src"
parts = ["data.js", "data_h.js", "data_p.js", "data_r.js", "game.js"]
html = (src / "head.html").read_text(encoding="utf-8") + "<script>\n" + "".join((src / p).read_text(encoding="utf-8") + "\n" for p in parts) + "</script>\n"
(Path(__file__).parent / "index.html").write_text(html, encoding="utf-8")
print("index.html:", len(html), "bajtów")
