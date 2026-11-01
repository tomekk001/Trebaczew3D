#!/usr/bin/env python3
"""Pobiera aktualne ceny paliw i zapisuje ceny_paliw.json (używa go gra, pylon na ORLENIE w Działoszynie).
Źródło: cenycpn.pl (ceny maksymalne brutto z Monitora Polskiego). LPG pozostaje z poprzedniego pliku, jeśli brak w źródle.
Jeśli strona się zmieni i nie da się odczytać cen, plik zostaje bez zmian."""
import json, re, sys, datetime, urllib.request, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "ceny_paliw.json"
old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
req = urllib.request.Request("https://cenycpn.pl/", headers={"User-Agent": "Mozilla/5.0 (trebaczew.io; ceny paliw do gry, 1x dziennie)"})
try:
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
except Exception as e:
    print("Brak dostępu do źródła:", e); sys.exit(0)
text = re.sub(r"<[^>]+>", " ", html); text = re.sub(r"\s+", " ", text)
def find(names, lo=3.0, hi=15.0):
    for n in names:
        for m in re.finditer(n, text, re.I):
            seg = text[m.end():m.end() + 160]
            p = re.search(r"(\d{1,2})[,.](\d{2})", seg)
            if p:
                v = float(p.group(1) + "." + p.group(2))
                if lo <= v <= hi: return v
    return None
new = dict(old)
for key, names in {"pb95": [r"Pb\s*95", r"E\s*95", r"benzyn\w* 95"], "on": [r"\bON\b", r"olej\w* nap\w+", r"diesel"], "pb98": [r"Pb\s*98", r"98"], "lpg": [r"\bLPG\b", r"autogaz"]}.items():
    v = find(names, 2.0 if key == "lpg" else 3.0)
    if v: new[key] = v
if new.get("pb95") and new.get("on"):
    new["date"] = datetime.date.today().isoformat(); new["src"] = "cenycpn.pl (Monitor Polski)"
    OUT.write_text(json.dumps(new, ensure_ascii=False) + "\n", encoding="utf-8"); print("Zapisano", new)
else:
    print("Nie odczytano cen – plik bez zmian")
