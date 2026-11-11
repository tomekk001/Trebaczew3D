"""Budynki wg zdjęć Street View przy DK42 / ul. Wyzwolenia (Trębaczew) i ul. Piłsudskiego (Działoszyn):
Komfort, Salon Łazienek „Manuvo”, kwiaciarnia „Tutti Flori”, AUTOPART, grafitowa hala przy przystanku, dwa domy przy Wyzwolenia (stary i z panelami).
Układ jak w grze (groupAt): x - wzdłuż frontu (L), z - na zewnątrz frontu (+z), y - w górę, środek obrysu w (0,0,0).
Uruchomienie:  python3 tools/blender/foto_dk42.py   (pip install bpy)"""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from common import Model
from budynki import gable, gable_ends, hip, win, BASE

def base_mats(M, wall, roof, roof_dark='#2a2a2a', plinth='#8f8a82', frame='#f4f4f2'):
    return dict(wall=M.mat('wall', wall, noise=.05, scale=22), plinth=M.mat('plinth', plinth, noise=.1), roof=M.mat('roof', roof, brick=(.34, .3, roof_dark, .02)),
                frame=M.mat('frame', frame), glass=M.mat('glass', '#33424e', noise=.18, scale=6), sill=M.mat('sill', '#d9d6cf'), dark=M.mat('dark', '#2e3134'),
                white=M.mat('white', '#f2f1ec'), metal=M.mat('metal', '#3c4044'), blue=M.mat('blue', '#1f4aa8'), door=M.mat('door', '#e9e7e1'), brown=M.mat('brown', '#4a2f22'),
                solar=M.mat('solar', '#1d2a44', brick=(.32, .5, '#9aa3ad', .01)), steel=M.mat('steel', '#444a50', brick=(.18, 4, '#363b40', .006)))

def box_walls(M, m, L, D, H, plh=.5):
    M.box(-L / 2, L / 2, BASE, H, -D / 2, D / 2, m['wall']); M.box(-L / 2 - .03, L / 2 + .03, BASE, plh, -D / 2 - .03, D / 2 + .03, m['plinth'])

def front_windows(M, m, L, D, y, xs, w=1.5, h=1.3, face='+z'):
    z = D / 2 if face == '+z' else -D / 2
    for x in xs: win(M, x, y, z, w, h, m['frame'], m['glass'], face, m['sill'])

def komfort():
    M = Model('komfort'); L, D, H = 31.5, 29.0, 5.4; m = base_mats(M, '#c9c2b3', '#4d555d', '#2b2f33')
    box_walls(M, m, L, D, H, .9)
    rise = 3.0; gable(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['roof'], ov=.5, along='z'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, rise, m['wall'], along='z')
    xm = 0.0
    for s in (-1, 1):   # niebieskie obróbki szczytu (wiatrownice)
        M.prism([(xm, H + rise + .25, D / 2 + .5), (s * (L / 2 + .5), H - .1 - rise * .5 / (L / 2) * 0, D / 2 + .5), (s * (L / 2 + .5), H - .28, D / 2 + .5), (xm, H + rise - .05, D / 2 + .5)], (0, 0, .12), m['blue'])
    M.box(-L / 2 - .1, L / 2 + .1, H - .35, H + .05, D / 2, D / 2 + .12, m['blue'])
    front_windows(M, m, L, D, 2.4, [-11, -6, 5.5, 10.5], 2.2, 1.6)
    M.box(-9.5 - 1.1, -9.5 + 1.1, 0, 2.5, D / 2, D / 2 + .08, m['door']); M.box(-9.5 - .9, -9.5 + .9, .3, 2.4, D / 2 + .08, D / 2 + .11, m['glass']); M.box(-9.5 - 1.4, -9.5 + 1.4, 2.5, 2.7, D / 2, D / 2 + .5, m['blue'])
    for x in (-8, 0, 8): M.box(x - 1.5, x + 1.5, 4.1, 4.9, D / 2, D / 2 + .05, m['blue'])   # pas pod szczytem pod szyld
    M.box(-L / 2 + 6, L / 2 - 6, 4.0, 5.0, D / 2 + .01, D / 2 + .08, m['white'])
    side_ws = [-9, -3, 3, 9]
    for z in side_ws:
        for s in (-1, 1): win(M, s * L / 2, 2.4, z, 1.8, 1.4, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
    M.finish(res=1024, quality=72, ao_dist=2.0)

def salon():   # Salon Łazienek „Manuvo”: kremowy budynek z brązowym dachem i przeszklonym wejściem pod szczytem
    M = Model('salon'); L, D, H = 29.5, 14.5, 4.4; m = base_mats(M, '#efe4cf', '#5b3a2a', '#2e1e16')
    box_walls(M, m, L, D, H, .7)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.4, m['roof'], ov=.55, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.4, m['wall'], along='x')
    # wejście: wysunięty szczyt z witryną
    pw = 8.5; M.box(-pw / 2, pw / 2, BASE, H + .4, D / 2, D / 2 + 1.8, m['wall'])
    gable(M, -pw / 2, pw / 2, D / 2 - 1.5, D / 2 + 1.8, H + .4, 2.6, m['roof'], ov=.5, along='z'); gable_ends(M, -pw / 2, pw / 2, D / 2 - 1.5, D / 2 + 1.8, H + .4, 2.6, m['wall'], along='z')
    M.box(-pw / 2 + .6, pw / 2 - .6, .2, 3.2, D / 2 + 1.8, D / 2 + 1.86, m['glass']); M.box(-pw / 2 + .5, pw / 2 - .5, 3.2, 3.5, D / 2 + 1.8, D / 2 + 1.95, m['white']); M.box(-.05, .05, .2, 3.2, D / 2 + 1.86, D / 2 + 1.9, m['frame'])
    for x in (-pw / 2 + .5, pw / 2 - .5): M.box(x - .15, x + .15, BASE, 3.5, D / 2 + 1.7, D / 2 + 1.95, m['white'])
    # skrzydła: duże okna wystawowe
    for x in (-10.5, -6.2, 6.2, 10.5): M.box(x - 1.6, x + 1.6, .6, 3.0, D / 2, D / 2 + .06, m['glass']); M.box(x - 1.7, x + 1.7, 3.0, 3.1, D / 2, D / 2 + .1, m['white'])
    for x in (-13.0, 13.0): win(M, x, 2.2, D / 2, 1.4, 1.4, m['frame'], m['glass'], '+z', m['sill'])
    for z in (-3, 3):
        for s in (-1, 1): win(M, s * L / 2, 2.2, z, 1.4, 1.4, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
    M.finish(res=1024, quality=72, ao_dist=2.0)

def tutti():   # Tutti Flori: kremowy budynek, wyższy środkowy szczyt z okrągłym oknem, lukarny
    M = Model('tutti'); L, D, H = 31.0, 15.5, 4.2; m = base_mats(M, '#f0e6d2', '#6b4332', '#34201a')
    box_walls(M, m, L, D, H, .7)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.6, m['roof'], ov=.55, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.6, m['wall'], along='x')
    cw = 9.5; cx = -1.0; M.box(cx - cw / 2, cx + cw / 2, BASE, H + 1.0, D / 2, D / 2 + 1.6, m['wall'])
    gable(M, cx - cw / 2, cx + cw / 2, D / 2 - 2.0, D / 2 + 1.6, H + 1.0, 3.4, m['roof'], ov=.5, along='z'); gable_ends(M, cx - cw / 2, cx + cw / 2, D / 2 - 2.0, D / 2 + 1.6, H + 1.0, 3.4, m['wall'], along='z')
    M.cyl(cx, H + 2.3, H + 2.35, D / 2 + 1.65, .9, .9, 16, m['white'], axis='y')
    M.box(cx - 2.2, cx + 2.2, .3, 2.9, D / 2 + 1.6, D / 2 + 1.66, m['glass']); M.box(cx - .05, cx + .05, .3, 2.9, D / 2 + 1.66, D / 2 + 1.7, m['frame'])
    M.box(cx - 2.9, cx + 2.9, 2.9, 3.2, D / 2 + 1.6, D / 2 + 2.3, m['brown'])
    for x in (-12.5, -8.5, 6.5, 10.5, 13.2):
        win(M, x, 2.2, D / 2, 1.5, 1.5, m['frame'], m['glass'], '+z', m['sill'])
    for x in (8.0, 12.0): M.box(x - 1.0, x + 1.0, H + .6, H + 2.4, D / 2 - 2.2, D / 2 - .6, m['wall']); gable(M, x - 1.0, x + 1.0, D / 2 - 2.2, D / 2 - .6, H + 2.4, 1.0, m['roof'], ov=.2, along='z')
    for z in (-3, 3):
        for s in (-1, 1): win(M, s * L / 2, 2.2, z, 1.4, 1.4, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
    M.finish(res=1024, quality=72, ao_dist=2.0)

def autopart():   # dwukondygnacyjny szary budynek z płaskim dachem i pasem szyldu
    M = Model('autopart'); L, D, H = 12.0, 10.0, 6.6; m = base_mats(M, '#a3a9ae', '#555555', '#2a2a2a', '#6f7378')
    box_walls(M, m, L, D, H, .6); M.box(-L / 2 - .08, L / 2 + .08, H, H + .55, -D / 2 - .08, D / 2 + .08, m['metal'])
    M.box(-L / 2 + .6, L / 2 - .6, 4.6, 6.3, D / 2, D / 2 + .05, m['dark'])         # pas szyldu
    M.box(-L / 2 + .4, L / 2 - .4, .5, 3.4, D / 2, D / 2 + .07, m['glass']); M.box(-L / 2 + .3, L / 2 - .3, 3.4, 3.6, D / 2, D / 2 + .15, m['metal'])
    for x in (-L / 2 + .4, 0, L / 2 - .4): M.box(x - .06, x + .06, .5, 3.4, D / 2 + .05, D / 2 + .1, m['metal'])
    for z in (-2.5, 2.5):
        for s in (-1, 1): win(M, s * L / 2, 4.4, z, 1.6, 1.3, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
        for s in (-1, 1): win(M, s * L / 2, 1.5, z, 1.6, 1.3, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
    M.finish(res=512, quality=72, ao_dist=1.5)

def hala():   # grafitowa hala stalowa z bramą rolowaną
    M = Model('hala_grafit'); L, D, H = 18.5, 13.5, 5.2; m = base_mats(M, '#41464c', '#3a3f45', '#2a2d31', '#2e3236')
    M.box(-L / 2, L / 2, BASE, H, -D / 2, D / 2, m['steel']); M.box(-L / 2 - .03, L / 2 + .03, BASE, .5, -D / 2 - .03, D / 2 + .03, m['plinth'])
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 1.7, m['steel'], ov=.35, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 1.7, m['steel'], along='x')
    M.box(-L / 2 + 2.5, -L / 2 + 6.7, 0, 3.8, D / 2, D / 2 + .1, m['white']); M.box(-L / 2 + 2.3, -L / 2 + 6.9, 3.8, 4.0, D / 2, D / 2 + .15, m['metal'])
    for x in (L / 2 - 3.0, L / 2 - 6.0): M.box(x - .9, x + .9, 0, 2.2, D / 2, D / 2 + .08, m['door'])
    M.finish(res=512, quality=72, ao_dist=1.5)

def dom_stary():   # starszy piętrowy dom, brązowo-beżowy tynk, blaszany dach
    M = Model('dom_stary'); L, D, H = 10.0, 9.5, 5.4; m = base_mats(M, '#c8ab8d', '#6d7378', '#444a50', '#8a7a68')
    box_walls(M, m, L, D, H, .9); M.box(-L / 2 - .02, L / 2 + .02, H - .5, H, -D / 2 - .02, D / 2 + .02, m['white'])
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.4, m['roof'], ov=.5, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.4, m['wall'], along='x')
    for x in (-3.0, 0, 3.0):
        win(M, x, 1.9, D / 2, 1.2, 1.4, m['frame'], m['glass'], '+z', m['sill']); win(M, x, 4.4, D / 2, 1.2, 1.4, m['frame'], m['glass'], '+z', m['sill'])
    M.box(-0.9, 0.9, 0, 2.2, D / 2, D / 2 + .08, m['brown']); M.box(-1.3, 1.3, .5, .6, D / 2, D / 2 + 1.3, m['plinth']); M.box(-1.3, 1.3, 2.3, 2.4, D / 2, D / 2 + 1.3, m['white'])
    for z in (-2.2, 2.2):
        for s in (-1, 1): win(M, s * L / 2, 2.0, z, 1.1, 1.3, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
    M.finish(res=512, quality=72, ao_dist=1.2)

def dom_solar():   # kremowy dom z panelami fotowoltaicznymi na dachu
    M = Model('dom_solar'); L, D, H = 12.5, 10.0, 5.2; m = base_mats(M, '#e6dcc4', '#4b3b34', '#2a201c', '#8d8a82')
    box_walls(M, m, L, D, H, .7)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.6, m['roof'], ov=.5, along='x'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.6, m['wall'], along='x')
    z0, z1 = 0.6, D / 2 + .4; rise = 3.6; sl = (D / 2 + .5) / rise   # panele na połaci frontowej (od kalenicy w dół)
    for i in range(4):
        x0 = -L / 2 + 1.2 + i * 2.5; x1 = x0 + 2.35
        ya = H + rise - 1.2 * (rise / (D / 2)) ; M.prism([(x0, H + rise * .62 + .12, 1.4), (x1, H + rise * .62 + .12, 1.4), (x1, H + rise * .12 + .12, D / 2 - .4), (x0, H + rise * .12 + .12, D / 2 - .4)], (0, .05, 0), m['solar'])
    for x in (-3.5, 0, 3.5): win(M, x, 2.3, D / 2, 1.5, 1.5, m['frame'], m['glass'], '+z', m['sill'])
    M.box(4.5, 6.0, 0, 2.3, D / 2, D / 2 + .08, m['door'])
    for z in (-2.2, 2.2):
        for s in (-1, 1): win(M, s * L / 2, 2.3, z, 1.2, 1.4, m['frame'], m['glass'], '+x' if s > 0 else '-x', m['sill'])
    M.finish(res=512, quality=72, ao_dist=1.2)

if __name__ == '__main__':
    for f in (komfort, salon, tutti, autopart, hala, dom_stary, dom_solar):
        if len(sys.argv) < 2 or f.__name__ in sys.argv[1:]: f()
