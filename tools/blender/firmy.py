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

if __name__ == '__main__':
    for f in (autopart_hala, zuh):
        if len(sys.argv) < 2 or f.__name__ in sys.argv[1:]: f()
