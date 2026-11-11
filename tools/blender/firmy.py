"""Firmy za torami przy Wyzwolenia (Trębaczew), wg Street View i ortofotomapy:
- hala AUTOPART (serwis samochodów ciężarowych): jasnoszara hala z dwiema bramami rolowanymi, panele fotowoltaiczne na połaci
- Z.U.H. ZBYSZKO: grafitowa hala z czerwonym portalem wejściowym, kwadratowym logo i czarnym szyldem
Układ jak w grze (groupAt): x - wzdłuż frontu (L), z - na zewnątrz frontu (+z), y - w górę, środek obrysu w (0,0,0).
Uruchomienie:  python3 tools/blender/firmy.py   (pip install bpy)"""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from common import Model
from budynki import gable, gable_ends, win, BASE
from foto_dk42 import base_mats

def autopart_hala():
    M = Model('autopart_hala'); L, D, H = 18.5, 14.0, 5.6; m = base_mats(M, '#9da3a8', '#6b7075', '#4a4e52', '#7c7f82')
    m['sheet'] = M.mat('sheet', '#a2a8ad', brick=(.2, 4, '#8e9498', .006)); m['roll'] = M.mat('roll', '#5c6166', brick=(.14, .12, '#494d51', .01))
    M.box(-L / 2, L / 2, BASE, H, -D / 2, D / 2, m['sheet']); M.box(-L / 2 - .03, L / 2 + .03, BASE, .6, -D / 2 - .03, D / 2 + .03, m['plinth'])
    rise = 1.9; gable(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['roof'], ov=.4, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['sheet'], along='x')
    for x in (-4.6, 0.2):    # dwie szerokie bramy rolowane z ościeżnicą
        M.box(x - 2.35, x + 2.35, 0, 4.5, D / 2, D / 2 + .1, m['metal']); M.box(x - 2.15, x + 2.15, 0, 4.3, D / 2 + .1, D / 2 + .16, m['roll'])
    M.box(L / 2 - 3.2, L / 2 - 1.6, 0, 2.2, D / 2, D / 2 + .08, m['door'])
    for x in (-L / 2 + 1.2, L / 2 - 1.2): M.box(x - .35, x + .35, 5.0, 5.15, D / 2, D / 2 + .1, m['metal'])
    for z in (-3.0, 2.6): win(M, L / 2, 3.4, z, 1.6, 1.0, m['frame'], m['glass'], '+x', m['sill'])
    # panele fotowoltaiczne na połaci od frontu (kilka rzędów)
    for r in range(2):
        for i in range(7):
            x0 = -L / 2 + .8 + i * 2.5; x1 = x0 + 2.35
            ya = H + rise * (.78 - r * .36); yb = H + rise * (.78 - r * .36 - .30); za = D / 2 * (.22 + r * .36); zb = D / 2 * (.22 + r * .36 + .30)
            M.prism([(x0, ya + .14, za), (x1, ya + .14, za), (x1, yb + .14, zb), (x0, yb + .14, zb)], (0, .05, 0), m['solar'])
    M.finish(res=512, quality=72, ao_dist=1.5)

def zuh():
    M = Model('zuh'); L, D, H = 16.0, 40.0, 6.4; m = base_mats(M, '#464a50', '#3c4046', '#2a2d31', '#2e3236')
    m['red'] = M.mat('red', '#d1262e'); m['black'] = M.mat('black', '#17181a'); m['steel'] = M.mat('steel', '#4a4f55', brick=(.18, 4, '#3a3e43', .006)); m['gate'] = M.mat('gate', '#33373b', brick=(.14, .12, '#292c30', .01))
    M.box(-L / 2, L / 2, BASE, H, -D / 2, D / 2, m['steel']); M.box(-L / 2 - .03, L / 2 + .03, BASE, .5, -D / 2 - .03, D / 2 + .03, m['plinth'])
    rise = 2.6; gable(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['steel'], ov=.35, along='z'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['steel'], along='z')
    # wejście: czerwony portal z daszkiem (prawa część frontu), przeszklenie
    px0, px1 = 1.0, 6.2
    M.box(px0 - .3, px1 + .3, 0, 3.6, D / 2, D / 2 + 2.2, m['red']); M.box(px0 + .3, px1 - .3, 0, 3.0, D / 2 + .2, D / 2 + 2.3, m['black'])      # portal czerwony z ciemnym wnętrzem
    M.box(px0 - .3, px1 + .3, 3.6, 3.8, D / 2, D / 2 + 2.4, m['red'])
    M.box(px0 + .5, px1 - .5, .05, 2.8, D / 2 + .05, D / 2 + .1, m['glass'])
    # kwadratowe czerwone logo i czarny szyld
    M.box(-6.8, -4.4, 3.2, 5.6, D / 2, D / 2 + .15, m['red']); M.box(-3.8, 0.2, 3.6, 5.2, D / 2, D / 2 + .12, m['black'])
    # bramy garażowe od frontu (ciemne)
    M.box(-7.2, -2.2, 0, 3.0, D / 2, D / 2 + .08, m['gate'])
    M.finish(res=512, quality=72, ao_dist=1.5)

def dom_zabka():   # parterowy dom z pustaka (szary), łaty z cegły, blaszany brązowy dach, komin z cegły (zdjęcie: narożnik obok Żabki)
    M = Model('dom_zabka'); L, D, H = 10.0, 9.0, 3.1; m = base_mats(M, '#8e8d88', '#4a3329', '#3a2820', '#7b7a76')
    m['wallg'] = M.mat('wallg', '#8e8d88', noise=.16, scale=16); m['brickp'] = M.mat('brickp', '#a85d47', brick=(.26, .075, '#8f8b84', .012)); m['sheet'] = M.mat('sheet', '#4a3329', brick=(.4, 4, '#3a2820', .006))
    M.box(-L / 2, L / 2, BASE, H, -D / 2, D / 2, m['wallg']); M.box(-L / 2 - .03, L / 2 + .03, BASE, .5, -D / 2 - .03, D / 2 + .03, m['plinth'])
    rise = 2.4; gable(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['sheet'], ov=.4, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['wallg'], along='x')
    # łaty z cegły: pas pod dachem z lewej strony frontu, górna część szczytu prawego, naroże
    M.box(-L / 2, -.8, 2.0, H, D / 2, D / 2 + .035, m['brickp']); M.box(L / 2, L / 2 + .035, 1.9, H, -D / 2 + .3, D / 2, m['brickp']); M.box(L / 2 - .5, L / 2 + .035, .5, 1.9, D / 2 - .1, D / 2 + .035, m['brickp'])
    M.prism([(L / 2 - .02, H, -D / 2 + 1.8), (L / 2 - .02, H, D / 2 - 1.8), (L / 2 - .02, H + rise * .45, 0)], (.04, 0, 0), m['brickp'])
    # komin z cegły
    M.box(-1.8, -1.2, H + rise * .35, H + rise + .9, -.3, .3, m['brickp'])
    # okna: front (jedno), szczyt prawy (dwa), tył
    win(M, -2.2, 1.75, D / 2, 1.1, 1.2, m['frame'], m['glass'], '+z', m['sill'])
    win(M, L / 2, 1.75, -1.5, 1.0, 1.2, m['frame'], m['glass'], '+x', m['sill']); win(M, L / 2, 1.75, 1.6, 1.0, 1.2, m['frame'], m['glass'], '+x', m['sill'])
    win(M, 1.5, 1.75, -D / 2, 1.1, 1.2, m['frame'], m['glass'], '-z', m['sill']); M.box(2.4, 3.4, 0, 2.0, D / 2, D / 2 + .08, m['door'])
    M.finish(res=512, quality=72, ao_dist=1.3)

def przedszkole():   # Publiczne Przedszkole im. Jasia i Małgosi (Zagrodowa): dwukondygnacyjny, beżowy z zielonkawym nalotem, brązowy cokół, dwa kominy, łukowe daszki nad wejściami
    M = Model('przedszkole'); L, D, H = 18.0, 8.0, 6.3; m = base_mats(M, '#d9d3b4', '#7a4636', '#4d2c22', '#8a7b66')
    m['wallp'] = M.mat('wallp', '#d9d3b4', noise=.09, scale=18); m['eave'] = M.mat('eave', '#6e4236'); m['canopy'] = M.mat('canopy', '#2f2d2b'); m['brick'] = M.mat('brick', '#9a5a46', brick=(.25, .075, '#8f8b84', .012)); m['tin'] = M.mat('tin', '#7a4636', brick=(.4, 4, '#5a3226', .006))
    M.box(-L / 2, L / 2, BASE, H, -D / 2, D / 2, m['wallp']); M.box(-L / 2 - .03, L / 2 + .03, BASE, .9, -D / 2 - .03, D / 2 + .03, m['plinth'])
    M.box(-L / 2 - .25, L / 2 + .25, H, H + .35, -D / 2 - .25, D / 2 + .25, m['eave'])       # gzyms / okap
    rise = 1.5; gable(M, -L / 2, L / 2, -D / 2, D / 2, H + .35, rise, m['tin'], ov=.35, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H + .35, rise, m['wallp'], along='x')
    for x in (-5.2, 3.4):    # kominy z cegły
        M.box(x - .35, x + .35, H + .5, H + rise + 1.1, -.5, .5, m['brick'])
    xs = (-7.2, -4.7, -2.2, 3.6, 6.1, 8.0 - .0)
    for x in (-7.0, -4.2, -1.9, 1.8, 6.0, 8.0):
        for y in (1.9, 4.6): win(M, x, y, D / 2, 1.0, 1.4, m['frame'], m['glass'], '+z', m['sill'])
    for x in (-5.5, -1.0, 3.0, 7.0):
        for y in (1.9, 4.6): win(M, x, y, -D / 2, 1.0, 1.4, m['frame'], m['glass'], '-z', m['sill'])
    for z in (-1.5, 1.5):
        for s_ in (-1, 1):
            for y in (1.9, 4.6): win(M, s_ * L / 2, y, z, 1.0, 1.4, m['frame'], m['glass'], '+x' if s_ > 0 else '-x', m['sill'])
    for x in (-3.2, 4.9):    # wejścia z półokrągłym daszkiem
        M.box(x - .55, x + .55, 0, 2.3, D / 2, D / 2 + .06, m['door'])
        for a in range(7):
            t0 = a / 7 * math.pi; t1 = (a + 1) / 7 * math.pi
            M.prism([(x + 1.15 * math.cos(t0), 2.6 + .0, D / 2 + .0), (x + 1.15 * math.cos(t1), 2.6, D / 2 + .0), (x + 1.15 * math.cos(t1), 2.6 + .0 + 0.0, D / 2 + .75 * math.sin(t1) + .15), (x + 1.15 * math.cos(t0), 2.6, D / 2 + .75 * math.sin(t0) + .15)], (0, .08, 0), m['canopy'])
    M.finish(res=512, quality=72, ao_dist=1.3)

if __name__ == '__main__':
    for f in (autopart_hala, zuh, dom_zabka, przedszkole):
        if len(sys.argv) < 2 or f.__name__ in sys.argv[1:]: f()
