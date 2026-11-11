#!/usr/bin/env python3
# Generuje podstrony tekstowe (SEO): poradnik/, misje/, multiplayer/, faq/ oraz sitemap.xml
import os, json, html
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = 'https://trebaczew.io'
NAV = [('poradnik', 'Poradnik'), ('misje', 'Misje'), ('multiplayer', 'Multiplayer'), ('faq', 'FAQ')]
CSS = """:root{--bg:#f4f1ea;--bg2:#ebe6da;--card:#fbfaf6;--ink:#1c2321;--mut:#5d6964;--grn:#0f5a3c;--acc:#f0c419;--line:#d6d0c1;--dark:#161c1a}
@media (prefers-color-scheme:dark){:root{--bg:#111614;--bg2:#161c1a;--card:#181f1c;--ink:#e9e6dd;--mut:#96a29c;--grn:#49b083;--line:#28312d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 "Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,.logo{font-family:Bahnschrift,"DIN Alternate","Roboto Condensed","Arial Narrow",system-ui,sans-serif;font-stretch:85%}
a{color:var(--grn);text-underline-offset:3px}header{background:var(--dark);color:#fff;padding:0 24px;min-height:60px;display:flex;flex-wrap:wrap;gap:6px 22px;align-items:center}
header .logo{font-weight:700;font-size:19px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;color:#fff;margin-right:auto}
header nav{display:flex;flex-wrap:wrap;gap:4px 22px}header nav a{text-decoration:none;color:rgba(255,255,255,.8);font-size:15px;padding:6px 0;border-bottom:2px solid transparent}header nav a:hover{color:#fff}header nav a.on{color:#fff;border-bottom-color:var(--acc)}
.play{background:var(--acc);color:#16160f;font-weight:700;text-decoration:none;padding:8px 18px;border-radius:4px;font-size:15px}
main{max-width:760px;margin:0 auto;padding:36px 24px 70px}h1{font-size:clamp(32px,5vw,48px);line-height:1.08;margin:.3em 0 .35em}
h2{margin:1.8em 0 .3em;font-size:28px;line-height:1.15}h3{margin:1.3em 0 .2em;font-size:21px}.lead{color:var(--mut);font-size:19px}
table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border-bottom:1px solid var(--line);padding:10px 10px 10px 0;text-align:left}th{color:var(--mut);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em}
kbd{background:var(--card);border:1px solid var(--line);border-bottom-width:2px;border-radius:4px;padding:1px 6px;font-size:.9em}
.cta{margin:48px 0 0;padding:26px 0 0;border-top:1px solid var(--line)}.cta b{font-size:20px}
.cta a.b{display:inline-block;margin-top:14px;background:var(--acc);color:#16160f;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:4px}
details{border-bottom:1px solid var(--line);padding:14px 0}summary{cursor:pointer;font-weight:600}
footer{background:var(--dark);padding:22px 24px 30px;color:rgba(255,255,255,.6);font-size:14px}footer a{color:rgba(255,255,255,.82)}.crumb{font-size:14px;color:var(--mut)}.crumb a{color:var(--mut)}"""

def page(slug, title, desc, h1, lead, body, extra_ld=None):
    url = f'{SITE}/{slug}/'
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Trębaczew", "item": SITE + '/'},
        {"@type": "ListItem", "position": 2, "name": h1, "item": url}]}
    lds = [crumbs] + ([extra_ld] if extra_ld else [])
    nav = ''.join(f'<a href="../{s}/"{" class=on" if s == slug else ""}>{n}</a>' for s, n in NAV)
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    return f"""<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:image" content="{SITE}/og.jpg"><meta property="og:type" content="article"><meta property="og:url" content="{url}">
<link rel="icon" href="../src/icon-192.png">{ld}<style>{CSS}</style></head><body>
<header><a class="logo" href="../">Trębaczew</a><nav>{nav}</nav><a class="play" href="../gra/">Zagraj</a></header>
<main><p class="crumb"><a href="../">Strona główna</a> › {html.escape(h1)}</p><h1>{html.escape(h1)}</h1><p class="lead">{lead}</p>
{body}
<div class="cta"><b>Gra uruchamia się od razu w przeglądarce.</b><br>Bez konta i bez instalacji.<br><a class="b" href="../gra/">Zagraj teraz</a></div></main>
<footer>Symulator życia w Trębaczewie · dane: © OpenStreetMap, © GUGiK<br><a href="../">Strona główna</a> · <a href="../gra/">Zagraj</a> · <a href="../zglos.html">Zgłoś błąd</a></footer></body></html>"""

PAGES = {}

PAGES['poradnik'] = dict(
  title='Poradnik dla początkujących - Symulator życia w Trębaczewie',
  desc='Jak zacząć grę w Symulatorze życia w Trębaczewie: pierwsze kroki, sterowanie, zarabianie pieniędzy i droga do własnego domu za 450 000 zł.',
  h1='Poradnik dla początkujących',
  lead='Wszystko, co trzeba wiedzieć na starcie: od pierwszej misji w Lewiatanie po zbieranie pieniędzy na dom.',
  body="""<h2>Jak zacząć</h2>
<p>Gra działa w przeglądarce, więc wystarczy wejść na stronę i kliknąć „Zagraj”. Konto nie jest potrzebne, a postęp zapisuje się automatycznie w przeglądarce. Zaczynasz z 200 zł i celem: uzbierać <b>450 000 zł</b> na własny dom.</p>
<p>Pierwsze kroki stawiasz przy niebieskim punkcie informacyjnym „i”, gdzie czeka pierwsza misja: zakupy w Lewiatanie. Nowy gracz dostaje też żółtą strzałkę, która prowadzi do pierwszego zadania, a potem do celu każdego kolejnego.</p>
<h2>Sterowanie</h2>
<p>Zalecamy grę na komputerze, bo klawiatura i mysz są najwygodniejsze. Na telefonie gra ma wirtualny joystick i przyciski na ekranie.</p>
<table><tr><th>Klawisz</th><th>Akcja</th></tr>
<tr><td><kbd>W A S D</kbd> / strzałki</td><td>ruch, w aucie gaz, hamulec i skręt</td></tr>
<tr><td><kbd>Shift</kbd></td><td>sprint</td></tr>
<tr><td><kbd>Spacja</kbd></td><td>skok lub hamulec ręczny</td></tr>
<tr><td><kbd>F</kbd></td><td>wsiądź lub wysiądź z pojazdu</td></tr>
<tr><td><kbd>E</kbd></td><td>akcja: misja, rozmowa, sklep, wejście, brama</td></tr>
<tr><td><kbd>Q</kbd></td><td>dziennik misji</td></tr>
<tr><td><kbd>M</kbd></td><td>mapa</td></tr>
<tr><td><kbd>C</kbd> · <kbd>R</kbd> · <kbd>N</kbd></td><td>kamera · radio · pora dnia</td></tr>
<tr><td><kbd>Esc</kbd></td><td>pauza i menu</td></tr></table>
<h2>Jak zarabiać pieniądze</h2>
<ul><li><b>Misje fabularne</b> dają łącznie około 92 000 zł. Nagrody zaczynają się od 250 zł za pierwsze zakupy i rosną do 25 000 zł za wielki wyścig gminny.</li>
<li><b>Misje poboczne</b> płacą 600-2500 zł, zależnie od poziomu postaci. Powtarzanie tej samej misji płaci coraz mniej, ale co 20 minut trzy losowe misje dostają premię ×1,5.</li>
<li><b>Zlecenia dnia</b>: trzy codziennie, a za komplet jest premia, która rośnie za kolejne dni z rzędu (do 7).</li>
<li><b>Banknoty na chodnikach</b> mają od 10 do 150 zł, a rzadko trafia się portfel z 300 zł.</li></ul>
<p>Uważaj na wydatki: mandat kosztuje 10% gotówki (maksymalnie 5000 zł), a pobyt w szpitalu 5% (maksymalnie 2000 zł). Przy rozsądnej grze dojście do domu zajmuje kilka godzin.</p>
<h2>Pojazdy i paliwo</h2>
<p>Pierwsze auto czeka na parkingu pod Lewiatanem. Pamiętaj o paliwie: gdy zabraknie benzyny, auto przestaje jechać, więc zatankuj na stacji ORLEN. Auto możesz też kupić w komisie obok myjni.</p>
<h2>Gdzie dalej</h2>
<p>Szczegóły kampanii znajdziesz w opisie <a href="../misje/">misji</a>, a granie ze znajomymi w opisie <a href="../multiplayer/">trybu wieloosobowego</a>. Najczęstsze pytania zebraliśmy w <a href="../faq/">FAQ</a>.</p>""")

PAGES['misje'] = dict(
  title='Misje i kampania - Symulator życia w Trębaczewie',
  desc='Kampania z 20 misjami fabularnymi, misje poboczne, zlecenia dnia i osiągnięcia w grze Symulator życia w Trębaczewie. Nagrody od 250 do 25 000 zł.',
  h1='Misje i kampania',
  lead='20 misji fabularnych, kilkadziesiąt zadań pobocznych i codzienne zlecenia: tak wygląda droga do własnego domu.',
  body="""<h2>Kampania</h2>
<p>Kampania zaczyna się od misji „Pierwsza jazda”: zaparkowane auto, stacja ORLEN i tankowanie. Dalej jest 20 misji odblokowywanych kolejnymi poziomami postaci (1-10). Nagrody rosną od 250 zł za pierwsze zakupy do 25 000 zł za wielki wyścig gminny. Ostatnia misja to zakup domu za 450 000 zł.</p>
<p>Z każdą misją stajesz się w wiosce coraz bardziej znany: od przysług dla sąsiadów, przez pracę kuriera i kierowcy, po udział w wyścigu gminnym.</p>
<h2>Misje poboczne</h2>
<p>Niebieskie znaczniki na mapie oznaczają zadania poboczne: dostawy, wyścigi, turniej flanek, mecz, grill u rodziny, psa ze schroniska i wiele innych. Każdą trwającą misję możesz anulować. Powtarzanie tej samej misji płaci coraz mniej, a co 20 minut trzy losowe misje dostają premię ×1,5.</p>
<h2>Postacie ze zleceniami</h2>
<p>Postaci w grze rozmawiają z Tobą swobodnie, a nad głową mają „!”, gdy czekają z zadaniem, i „?”, gdy możesz je oddać.</p>
<ul><li><b>Marek</b>: wiejski sportowiec, wyzwie Cię na serię rzutów karnych.</li>
<li><b>Seba</b>: pasjonat motoryzacji, jego czarne BMW E46 330d jest do przejechania.</li>
<li><b>Andrzej</b>: fanatyk motocykli, spotkasz go przy Żabce.</li>
<li><b>Pani Stasia i Pani Grażyna</b>: klientka i kasjerka w Lewiatanie, Pani Stasia da Ci zadanie.</li>
<li><b>Mieszkańcy parku</b>: quizy, worki do zebrania, bułki dla gołębi.</li></ul>
<h2>Zlecenia dnia i osiągnięcia</h2>
<p>Codziennie pojawiają się trzy zlecenia z różnych kategorii. Za komplet jest premia, która rośnie za kolejne dni z rzędu (do 7). Postęp widać w przycisku 📋 w rogu ekranu. Do zdobycia jest 13 osiągnięć.</p>
<p>Nie wiesz, od czego zacząć? Zajrzyj do <a href="../poradnik/">poradnika dla początkujących</a>.</p>""")

PAGES['multiplayer'] = dict(
  title='Tryb wieloosobowy i czat głosowy - Symulator życia w Trębaczewie',
  desc='Graj ze znajomymi w Trębaczewie: pokoje prywatne, wyścigi, wspólny melex i autobus, praca w cementowni, handel, czat tekstowy i głosowy.',
  h1='Tryb wieloosobowy i czat głosowy',
  lead='Wspólny świat, pokoje prywatne dla znajomych, wyścigi, kooperacyjne misje i rozmowa głosowa.',
  body="""<h2>Jak dołączyć</h2>
<p>W menu wybierz „Tryb wieloosobowy” i podaj nazwę gracza. Inni gracze są widoczni w świecie oraz na minimapie i mapie. Przycisk 👥 w pasku gry otwiera listę graczy, a pod nią przycisk „Znajomi i pokoje”.</p>
<h2>Pokoje prywatne i znajomi</h2>
<p>Możesz założyć pokój prywatny z kodem (5-8 znaków, do 8 osób) i wysłać znajomym link zaproszenia. Kod znajomego jest stały dla przeglądarki, a przycisk „Dołącz do znajomego” przenosi Cię do jego pokoju.</p>
<h2>Czat tekstowy i głosowy</h2>
<p>Na czacie możesz pisać do wszystkich w pokoju. Czat głosowy włączysz przyciskiem 🎤 w pasku gry; przeglądarka zapyta o zgodę na mikrofon.</p>
<ul><li>Słychać graczy w pobliżu (do około 70 m), a im dalej, tym ciszej.</li>
<li>Tryby: push-to-talk (przytrzymaj <kbd>V</kbd>), wykrywanie głosu i otwarty mikrofon. Pasek poziomu pokazuje, czy mikrofon Cię słyszy.</li>
<li>Pojedynczych graczy możesz wyciszyć.</li>
<li>Rozmowa idzie bezpośrednio między graczami i nie jest nagrywana. Rozmówcy widzą nawzajem swój adres IP.</li>
<li>W części sieci (np. firmowych) połączenie głosowe może się nie nawiązać.</li></ul>
<h2>Co robić razem</h2>
<ul><li><b>Wyścigi z lobby</b>: trasy z punktami kontrolnymi, wpisowe, pula dla zwycięzcy, tablica wyników i radiowozy jako przeszkoda (kara czasowa).</li>
<li><b>Wyzwanie na wyścig</b> (klawisz <kbd>G</kbd>): ścigasz się z najbliższym graczem do budynku, na przykład szkoły, stadionu czy schroniska.</li>
<li><b>Wspólny melex</b> na dwie osoby i <b>autobus Gepard</b> jeżdżący według jednego rozkładu dla wszystkich, bilet kosztuje 4 zł.</li>
<li><b>Praca w cementowni</b>: jeden gracz ładuje cysternę, drugi zatwierdza tonaż, albo wspólna paletyzacja.</li>
<li><b>Misje kooperacyjne</b>: żniwa na dwa ciągniki, paczki na dwie ekipy i pożar z wozem OSP.</li>
<li><b>Handel</b>: wymiana pieniędzy, jedzenia i samochodów po obustronnym zatwierdzeniu.</li>
<li><b>Wspólny dom i garaż</b> na koncie, z miejscem na cztery auta (wymaga konta z menu).</li></ul>
<h2>Ranking</h2>
<p>Ranking pokazuje pięciu najlepszych graczy według poziomu. Trafiasz do niego, gdy grasz w trybie wieloosobowym pod własną nazwą. Wynik pieniędzy w rankingu jest ograniczany do tego, co da się realnie zarobić w danym czasie.</p>
<p class="crumb">Uwaga: pieniądze i przedmioty są zapisane po stronie przeglądarki, więc handel i nagrody w wyścigach opierają się na uczciwości graczy.</p>""")

FAQ = [
 ('Czy gra jest darmowa?', 'Tak. Gra jest całkowicie darmowa i działa w przeglądarce, bez instalacji.'),
 ('Czy potrzebuję konta?', 'Nie. Postęp zapisuje się automatycznie w przeglądarce. Konto (sama nazwa i hasło, bez e-maila) jest opcjonalne i pozwala synchronizować zapis między urządzeniami oraz założyć wspólny dom.'),
 ('Czy da się grać na telefonie?', 'Tak, gra ma wirtualny joystick i przyciski na ekranie. Zalecamy jednak komputer, bo sterowanie klawiaturą i myszą jest wygodniejsze.'),
 ('Jak zagrać ze znajomymi?', 'Wybierz w menu „Tryb wieloosobowy”, a potem w panelu „Znajomi i pokoje” załóż pokój prywatny i wyślij znajomym kod lub link.'),
 ('Jak włączyć czat głosowy?', 'W trybie wieloosobowym kliknij przycisk 🎤 w pasku gry i zezwól przeglądarce na mikrofon. Mówisz przytrzymując V albo w trybie wykrywania głosu.'),
 ('Czy rozmowy głosowe są nagrywane?', 'Nie. Dźwięk idzie bezpośrednio między graczami. Rozmówcy widzą nawzajem swój adres IP, a serwer przekazuje tylko dane potrzebne do nawiązania połączenia.'),
 ('Jaki jest cel gry?', 'Uzbierać 450 000 zł i kupić własny dom. Po drodze wykonujesz misje, pracujesz, jeździsz autami i ścigasz się.'),
 ('Skąd pochodzi mapa?', 'Drogi, budynki i teren pochodzą z otwartych danych OpenStreetMap i GUGiK. Postacie i wydarzenia w grze są fikcyjne.'),
 ('Gra nie działa lub się zacięła, co zrobić?', 'Odśwież stronę, a jeśli to nie pomoże, obniż jakość grafiki w Opcjach. Błąd możesz zgłosić przyciskiem „Zgłoś błąd” w menu.'),
 ('Czy gra zbiera dane osobowe?', 'Nie. Statystyki są anonimowe i zagregowane, a hasła kont są przechowywane wyłącznie w postaci skrótów.'),
]
faq_html = ''.join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in FAQ)
PAGES['faq'] = dict(
  title='FAQ - najczęstsze pytania o Symulator życia w Trębaczewie',
  desc='Odpowiedzi na najczęstsze pytania: czy gra jest darmowa, jak grać ze znajomymi, czat głosowy, konto, telefon i prywatność.',
  h1='Najczęstsze pytania (FAQ)',
  lead='Krótkie odpowiedzi na to, o co pytają gracze.',
  body=faq_html,
  extra_ld={"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
      {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]})

for slug, p in PAGES.items():
    d = os.path.join(ROOT, slug); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf8').write(page(slug, p['title'], p['desc'], p['h1'], p['lead'], p['body'], p.get('extra_ld')))

urls = [('/', '1.0', 'weekly'), ('/gra/', '0.8', 'weekly')] + [(f'/{s}/', '0.7', 'monthly') for s, _ in NAV]
open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{SITE}{u}</loc><changefreq>{c}</changefreq><priority>{p}</priority></url>\n' for u, p, c in urls) + '</urlset>\n')
print('ok', list(PAGES))
