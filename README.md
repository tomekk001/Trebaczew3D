# Symulator życia w Trębaczewie

Gra 3D w stylu GTA (dawniej „Trębaczew 3D”), w której można chodzić i jeździć po prawdziwym Trębaczewie (gm. Działoszyn, pow. pajęczański). Ulice, budynki, działki i rzeźba terenu pochodzą z otwartych danych, a charakterystyczne miejsca (Lewiatan, Żabka, kościół, apteka, park, przedszkole, OSP, cmentarz) odwzorowano ze zdjęć.

Całość działa w przeglądarce, bez instalacji: wystarczy otworzyć `index.html`.

## Rozgrywka

- **Menu główne**: tryb jednoosobowy, tryb wieloosobowy (wkrótce), opcje (przypisywanie klawiszy, grafika, czułość myszy), kreator postaci (płeć, imię, fryzura, kolory, ubranie) i przycisk „Zgłoś błąd”, który otwiera gotowe zgłoszenie w Issues tego repozytorium.
- **Kampania**: 20 misji fabularnych odblokowywanych poziomami (1–10). Na początku awans jest szybki, później wolniejszy. Ostatnia misja to kupno domu za 450 000 zł, co kończy grę.
- **Misje poboczne** (niebieskie znaczniki) dają pieniądze i trochę doświadczenia. Po ukończeniu wracają po 5 minutach.
- **Dziennik misji** (Q): ukończone, dostępne i zablokowane misje z opisami; można zaznaczyć cel na radarze. Osobna sekcja „Postacie” pokazuje zadania wszystkich 9 rozmawiających postaci (co teraz zrobić, gdzie stoją, nagroda), a „Kolekcja” – zebrane historyjki z gum Turbo.
- Nad postaciami z zadaniem świeci **„!”** (zadanie do wzięcia) albo **„?”** (można je oddać). Cele trwających zadań postaci są na radarze: żółte kropki (gdzie iść) i zielone (komu oddać).
- Do Lewiatana można wejść (E przy drzwiach). W środku są regały, lodówki, kasy z kasjerkami, kolejka i klienci.
- Na Orlenie w Działoszynie (przy DK42) można zatankować.
- Każdy dom ma płot z furtką, a przy podjazdach są bramy, które otwiera się klawiszem E.

- Można wejść do środka: Lewiatan, Żabka, Delikatesy, apteka, pizzeria Euforia, kościół, biblioteka (wypożyczanie książek), a w Działoszynie ORLEN, Biedronka i Lidl. W środku chodzą ludzie, są kasjerki i klienci.
- Auta mają bak i wskaźnik paliwa. Gdy paliwo się skończy, auto nie pojedzie. Tankuje się na ORLENIE w Działoszynie (ul. Piłsudskiego), a na stacji można też kupić kanister.
- Ceny paliw na pylonie i przy dystrybutorze pochodzą z pliku `ceny_paliw.json`, który codziennie aktualizuje GitHub Action (`.github/workflows/ceny-paliw.yml`, skrypt `tools/ceny_paliw.py`). Gdy pliku nie da się pobrać, gra używa cen wpisanych w kod.
- Przejazd kolejowy na DK42: przed pociągiem migają czerwone światła i dzwoni sygnalizator, potem opuszczają się rogatki, a auta czekają w kolejce. Po przejeździe pociągu rogatki się podnoszą.

## Sterowanie (domyślne, można zmienić w Opcjach)

| Klawisz | Akcja |
|---|---|
| W A S D / strzałki | ruch, w aucie gaz/hamulec/skręt |
| Shift | sprint |
| Spacja | skok, w aucie hamulec ręczny |
| Mysz (przeciąganie), kółko | rozglądanie się, przybliżanie |
| F | wsiądź / wysiądź (auto, motor, rower, ciągnik, wóz strażacki) |
| E | akcja: misja, sklep, wejście do Lewiatana, brama, furtka |
| Q | dziennik misji |
| M | mapa (kółko lub dwa palce: przybliżanie, przeciąganie: przesuwanie) |
| C | widok kamery |
| R | radio w aucie |
| N | pora dnia |
| Esc | pauza / menu |

Na telefonie: wirtualny joystick i przyciski na ekranie (akcja, auto, radio, bieg, skok, misje, menu). Na urządzeniach dotykowych gra domyślnie startuje z niską jakością grafiki.

## Zgłoszenia błędów

Przycisk „Zgłoś błąd” w menu otwiera stronę `zglos.html` z formularzem. Formularz wysyła zgłoszenie na e-mail przez Web3Forms, a adres e-mail nie pojawia się na stronie ani w kodzie. Aby formularz działał, trzeba raz wygenerować klucz na https://web3forms.com i wpisać go w `zglos.html` w stałej `ACCESS_KEY`.

## Gra wieloosobowa

Kod gry wieloosobowej (funkcja `room` artefaktów Claude) jest w `src/game.js`, ale na razie jest wyłączony (`MP_ENABLED=false`). W menu ten tryb jest oznaczony jako „wkrótce”.

## Struktura

```
index.html        gotowa, złożona gra (jeden plik)
build.py          składa index.html ze źródeł
src/head.html     HTML, CSS interfejsu, biblioteki (three.js r128 z CDN)
src/game.js       cały kod gry (świat, pojazdy, postacie, misje, multiplayer)
src/data.js       OSM: drogi, obszary, budynki-wielokąty (kościół itp.), punkty
src/data_b.js     budynki: obrysy z OSM, liczba kondygnacji i funkcja z BDOT10k, adresy
src/data_h.js     siatka wysokości terenu (NMT GUGiK, 20 m) dla całego obszaru
src/data_p.js     granice działek we wsi (ULDK GUGiK)
src/data_r.js     kolory dachów odczytane z ortofotomapy
src/data_x.js     rozszerzony świat: DK42, drogi i tory poza wsią, lasy, woda, miejscowości
src/data_o.js     ortofotomapa (GUGiK) – tekstura terenu poza centrum wsi
tools/build_world.py   generuje dane z plików w tools/raw/
tools/raw/        surowe dane: zrzut OSM, budynki BDOT10k, NMT, ortofotomapa
```

Po zmianach w `src/` uruchom:

```
python3 build.py
```

`python3 build.py --fragment plik.html` dodatkowo zapisuje samą zawartość strony (bez `<html>`/`<head>`), np. do wklejenia jako artefakt.

`og.jpg` to grafika gry pokazywana przy udostępnianiu linku do trebaczew.io, a `src/favicon.png` to ikona karty przeglądarki.

## Obszar i aktualizacja danych

Świat obejmuje ok. 5,7 × 2,9 km: Trębaczew, Sadowiec-Wrzosy, Posmykowiznę, Wydrzynów, północną część Działoszyna z dworcem, zakłady przy Przemysłowej, lasy i kopalnię wapienia.

Źródła surowych danych (zapisane w `tools/raw/`):
1. OSM: `https://api.openstreetmap.org/api/0.6/map.json?bbox=18.8780,51.1118,18.9575,51.1381` → `osm_area.json.gz`
2. BDOT10k powiatu pajęczańskiego: `https://opendata.geoportal.gov.pl/bdot10k/schemat2021/10/1009_GML.zip`, klasa `OT_BUBD_A` (budynki z liczbą kondygnacji) → `bdot_area.json`
3. NMT: `services.gugik.gov.pl/nmt/?request=GetHByPointList` w siatce 20 m → `nmt.txt`
4. Ortofotomapa: WMS `mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolutionTime` 2,5 m/piksel → `orto.jpg`

Potem `python3 tools/build_world.py` i `python3 build.py`.

Skrypt przelicza wszystko do układu gry, dzieli budynki w kształcie L, T i U na prostokątne bryły (każda dostaje własny dach), bierze liczbę kondygnacji i funkcję budynku z BDOT10k, dodaje budynki obecne tylko w BDOT10k, a kolory dachów odczytuje z ortofotomapy. Dopracowane ręcznie centrum wsi (sklepy, kościół, przedszkole, OSP) zostaje bez zmian.

## Układ współrzędnych

Środek układu: 51.1301965 N, 18.9215954 E. Oś X na wschód, oś Z na południe, w metrach:
`x = (lon - lon0) * 111320 * cos(lat0)`, `z = -(lat - lat0) * 110574`.

## Źródła danych

- Ulice, budynki, obszary: © współtwórcy OpenStreetMap, licencja ODbL (https://www.openstreetmap.org/copyright)
- Numeryczny model terenu, działki ewidencyjne (ULDK), ortofotomapa, BDOT10k: © GUGiK, geoportal.gov.pl
- Część nazw miejsc: Google Maps

Kod gry korzysta z biblioteki three.js (licencja MIT).

## Tryb wieloosobowy

Serwer znajduje się w folderze `server/` (Cloudflare Worker + Durable Object). Wgrywa się sam przez GitHub Action `Serwer multiplayer` przy każdej zmianie w `server/`. Do wgrania potrzebne są sekrety `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`.

- Status pokoi: `https://trebaczew-mp.kontakt-3e3.workers.dev/status`
- W jednym pokoju gra do 30 osób. Gdy pokój jest pełny, gra sama przechodzi do następnego.
- Serwer przesyła pozycje, pojazdy, czat (z filtrem wulgaryzmów i limitem) i klakson (H).

## Model Lewiatana z Blendera

`tools/blender/lewiatan.py` buduje model sklepu w Blenderze (`pip install bpy`). Bryła, dachy, okna i rynny mają wypalone cienie (AO) w jednej teksturze. Wynik trafia do `src/models/lewiatan.glb`, a `tools/glb2js.py` pakuje go do `src/data_m.js` (skompresowana geometria + JPEG).

```
python3 tools/blender/lewiatan.py && python3 tools/glb2js.py && python3 build.py
```

## Minigry

- **Paczkomat**: nadawanie (gabaryt, kod, skrytka) i odbiór paczki.
- **Flanki w parku**: rzut w puszkę z kątem, siłą i wiatrem, potem szybkie klikanie.
- **Rzuty karne**: na orliku i na stadionie LZS; strzelasz i bronisz.

Minigry są częścią misji (m4, m5, m8, s6–s8). Można też zagrać w nie w świecie przy zielonych kółkach i przy paczkomatach. Rekordy zapisują się w przeglądarce.

## Statystyki

`statystyki.html` pokazuje anonimowe liczniki z serwera (`/stats`): graczy, uruchomienia, czas gry, misje, minigry i rankingi.

## Multiplayer: emotki i wyścigi

- **1–4**: emotki 👋 👍 😂 ⚽ nad głową; na telefonie są przyciski w panelu graczy.
- **G**: wyzwij najbliższego gracza (do 30 m) na wyścig. Wyzwany przyjmuje klawiszem **Y** albo odrzuca klawiszem **N**. Obaj dostają tę samą metę, a zwycięzca zgarnia 200 zł.
- **Enter**: otwiera czat.

## Zgłoszenia błędów

Formularz `zglos.html` wysyła zgłoszenia na serwer gry (`/report`). Autor czyta je na stronie `zgloszenia.html`, po podaniu klucza dostępu. W kodzie jest tylko skrót SHA-256 tego klucza. Jeśli w `zglos.html` ustawisz `ACCESS_KEY` z Web3Forms, zgłoszenia dodatkowo przyjdą e-mailem. Workflow „Pobierz zgłoszenia (zaszyfrowane)” (`.github/workflows/zgloszenia.yml`) pobiera je z adresu `/reports-enc`: treść jest zaszyfrowana kluczem publicznym (RSA-OAEP + AES-GCM), więc w publicznych logach Actions nie widać zgłoszeń, a odczytać je może tylko posiadacz klucza prywatnego.

## Modele z Blendera

`tools/blender/common.py` zawiera wspólne narzędzia: proceduralne materiały, wypalanie koloru i AO oraz eksport GLB. Modele:

- `lewiatan.py`: budynek Lewiatana.
- `kosciol.py`, `dzwonnica.py`: kościół pw. Nawiedzenia NMP z rozetą, kruchtą i tarasem oraz wolnostojąca dzwonnica.
- `kosciol_in.py`: wnętrze kościoła (nawa w kształcie litery A, żebra, prezbiterium, ławki).
- `regal_apteka.py`: regał z lekami.
- `sklep.py`: regał z alkoholem, gondola, lodówka i lada Żabki.
- `pociagi.py`: elektryczny zespół trakcyjny (człony czołowe i środkowe) oraz lokomotywa i węglarki pociągu towarowego.
- `budynki2.py`: kolejne miejsca ze zdjęć: szkoła podstawowa (obrys w kształcie litery L), domy przy Wyzwolenia 159–163 naprzeciw kościoła, kwiaciarnia „Sas-Anka” (Szkolna 9), dom przy Szkolnej 3, OSP, budynek Żabki, trzy bryły przedszkola i elektrownia wiatrowa z obracającym się wirnikiem.
- `budynki.py`: budynki według zdjęć: ośrodek zdrowia z Apteką Magnolia (Szkolna 12, taras ze schodami, ganek z dwojgiem drzwi), Delikatesy Premium, dworzec PKP, Minerał, świetlica, ORLEN (sklep i wiata), Biedronka, Lidl. Można zbudować wybrane, np. `python3 tools/blender/budynki.py lidl orlen_wiata`.

```
for f in tools/blender/{lewiatan,kosciol,dzwonnica,kosciol_in,regal_apteka,sklep,budynki,pociagi}.py; do python3 $f; done
python3 tools/glb2js.py && python3 build.py
```

## Rozmowy z postaciami (AI)

Dziewięć postaci ma własne zadania i rozmawia przez model językowy na serwerze (Cloudflare Workers AI, `server/src/index.js`, adres `/npc`). Każda stoi na wolnym miejscu, z dala od bram, furtek, drzwi, jezdni i alejek, więc nikt nie blokuje przejścia:

- **Mietek** pod Lewiatanem: chce kiełbasę z grilla przy remizie OSP.
- **Seba** w parku, na placu od Zielonej, obok swojego Passata B5 FL. Trzeba docenić furę (obraza kończy rozmowę) i przynieść klucz 10 mm i trytytki ze skrzynki przy garażu.
- **Pani Jadzia** przed domem niedaleko remizy: trzeba podsłuchać strażaków i wrócić z prawdziwą plotką. Kłamstwo kończy się obrazą i zadanie zaczyna się od nowa.
- **Andrzej** przy przystanku przy kościele: wesoły i lekko podchmielony, zgubił klucze od domu na trawniku przy kościele. Po zadaniu idzie do domu na herbatę.
- **Sołtys Zdzisław** przy bibliotece: ogłoszenie o zebraniu wiejskim do przypięcia na tablicy przy Żabce.
- **Babcia Halina**: kot Mruczek uciekł do parku, pod plac zabaw.
- **Rolnik Stasiek** przy ciągniku: kanister ropy do odebrania z TRANS-BUD-u.
- **Kasia** przy orliku: słuchawki zostały na ławce w parku.
- **Listonosz Wiesiek** przy Szkolnej: paczka do skrzynki przy plebanii.

Przebieg zadań i nagrody są zaprogramowane w grze. Model prowadzi tylko swobodną rozmowę i dostaje od gry wyłącznie identyfikator postaci, etap zadania, listę przedmiotów i treść pytania. Osobowości i zasady (bez wulgaryzmów, tylko zmyślone osoby, bez danych prawdziwych mieszkańców) są zapisane na serwerze. Limity: 12 wiadomości na minutę i 80 dziennie z jednego adresu oraz 900 dziennie dla całej gry (pierwsze ~250 rozmów obsługuje lepszy po polsku Mistral Small, potem Llama 8B – razem mieści się w darmowym limicie Cloudflare). Gdy serwer jest niedostępny albo limit się wyczerpie, postacie odpowiadają gotowymi kwestiami.

## Szkoła podstawowa

Szkoła ma płaski dach z attyką (model `szkola` w `tools/blender/budynki2.py`). Głównymi drzwiami w ganku wchodzi się do dużego, dwukondygnacyjnego wnętrza. Na obu piętrach jest długi korytarz z salami po obu stronach: klasy z ławkami, krzesłami, tablicami z tematem lekcji, biurkiem nauczyciela i plakatami, pracownie (biologiczna, chemiczna, komputerowa, geograficzna), świetlica, pokój nauczycielski i gabinet dyrektora. Na piętro prowadzą schody z poręczą z holu. W sklepiku szkolnym u Pani Krysi są gumy Turbo z historyjkami – 30 różnych aut do zebrania, za pełną kolekcję jest 1500 zł i 150 XP –, Prince Polo, drożdżówki, Kubuś i oranżada w proszku. Co jakiś czas dzwoni dzwonek na przerwę. Misja poboczna „Zastępstwo w podstawówce” prowadzi przez pokój nauczycielski na piętrze, sklepik i klasę 1a.

## Postacie

`tools/blender/postac.py` modeluje człowieka z części zgodnych ze szkieletem gry: tułów (mężczyzna i kobieta × kurtka, t-shirt, bluza z kapturem, płaszcz), głowę z twarzą (oczy z tęczówkami i źrenicami, powieki, brwi, nos, usta, uszy), 6 fryzur, ramię, przedramię z dłonią i palcami, udo i łydkę z butem (podeszwa, sznurówki). Każda ściana ma region koloru, a w wierzchołkach zapisane jest zacienienie (AO). Wynik trafia do `src/data_hum.js`.

W grze każda osoba to jedna siatka ze szkieletem (`THREE.SkinnedMesh`, 11 kości: biodra, klatka, głowa, ręce i nogi). Osoby stojące oddychają, rozglądają się i przenoszą ciężar z nogi na nogę, a przy chodzie barki skręcają się przeciwnie do bioder. Przy stawach wagi się przenikają, więc łokcie, kolana i barki zginają się gładko. Kolory ubrań, skóry, oczu i włosów są losowane osobno dla każdej osoby. Do tego dochodzą rumieńce, cienie oczodołów, zarost u części mężczyzn, faktura tkanin i pasm włosów oraz lekko różny wzrost i tusza.

```
python3 tools/blender/postac.py && python3 build.py
```

## Park przy Zielonej

`tools/park.py` wyciąga z OSM (`tools/raw/osm_area.json.gz`) szczegóły parku do `src/data_park.js`: alejki, każde drzewo osobno (liściaste i iglaste), ławki, piaskownicę, rabatę, żwir, betonowe słupki, ściankę wspinaczkową, huśtawki i wejście na orlik. Gra rysuje z tego alejki (asfalt w środku parku, kostka przy ulicach), latarnie, kosze, gabloty przy wejściach i spacerowiczów. Orlik stoi tam, gdzie w OSM i na ortofotomapie, z furtką od strony parku (tam dochodzi alejka) i drugą od Zielonej.

```
python3 tools/park.py && python3 build.py
```

## Szybsze wczytywanie

Na stronie modele wnętrz (kościół, apteka, Żabka, Lewiatan) i budynki z `budynki.py` leżą w osobnym pliku `models_in.js`, doczytywanym w tle. Do czasu wczytania te budynki stoją w prostszej wersji, a potem gra sama podmienia je na modele. Gra startuje z mniejszego `index.html` (około 2,6 MB zamiast 4,2 MB). Przy wejściu do budynku gra czeka na modele najwyżej kilka sekund. Wersja do artefaktu (`--fragment`) ma wszystko w jednym pliku.
