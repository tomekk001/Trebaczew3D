# Trębaczew 3D

Gra 3D w stylu GTA, w której można chodzić i jeździć po prawdziwym Trębaczewie (gm. Działoszyn, pow. pajęczański). Ulice, budynki, działki i rzeźba terenu pochodzą z otwartych danych, a charakterystyczne miejsca (Lewiatan, Żabka, kościół, apteka, park, przedszkole, OSP, cmentarz) odwzorowano ze zdjęć.

Całość działa w przeglądarce, bez instalacji: wystarczy otworzyć `index.html`.

## Sterowanie

| Klawisz | Akcja |
|---|---|
| W A S D / strzałki | ruch, w aucie gaz/hamulec/skręt |
| Shift | sprint |
| Mysz (przeciąganie), kółko | rozglądanie się, przybliżanie |
| F | wsiądź / wysiądź (auto, motor, rower, ciągnik, wóz strażacki) |
| Spacja | hamulec ręczny |
| E | misja / zakupy w sklepie |
| R | radio w aucie |
| M | mapa |
| C | widok kamery |
| N | przewiń czas |
| T | czat (gra wieloosobowa) |
| H | klakson słyszany przez innych graczy |

Na telefonie: wirtualny joystick i przyciski na ekranie.

## Gra wieloosobowa

Gdy gra jest otwarta jako artefakt w Claude, wszyscy, którzy mają ją otwartą w tej samej chwili, widzą się nawzajem (pozycja, pojazd, nick, czat). Działa to przez platformową funkcję `room` artefaktów Claude; przy zwykłym otwarciu pliku z dysku gra działa w trybie jednoosobowym.

## Struktura

```
index.html        gotowa, złożona gra (jeden plik)
build.py          składa index.html ze źródeł
src/head.html     HTML, CSS interfejsu, biblioteki (three.js r128 z CDN)
src/game.js       cały kod gry (świat, pojazdy, postacie, misje, multiplayer)
src/data.js       OSM: drogi, obszary, budynki, punkty
src/data_h.js     siatka wysokości terenu (NMT GUGiK, 20 m)
src/data_p.js     granice działek (ULDK GUGiK)
src/data_r.js     kolory dachów odczytane z ortofotomapy
```

Po zmianach w `src/` uruchom:

```
python3 build.py
```

## Układ współrzędnych

Środek układu: 51.1301965 N, 18.9215954 E. Oś X na wschód, oś Z na południe, w metrach:
`x = (lon - lon0) * 111320 * cos(lat0)`, `z = -(lat - lat0) * 110574`.

## Źródła danych

- Ulice, budynki, obszary: © współtwórcy OpenStreetMap, licencja ODbL (https://www.openstreetmap.org/copyright)
- Numeryczny model terenu, działki ewidencyjne (ULDK), ortofotomapa: © GUGiK, geoportal.gov.pl
- Część nazw miejsc: Google Maps

Kod gry korzysta z biblioteki three.js (licencja MIT).
