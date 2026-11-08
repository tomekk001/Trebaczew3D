"""Budynki wg zdjęć (część 2): szkoła, domy przy Wyzwolenia naprzeciw kościoła (159, 161, 163), kwiaciarnia „Sas-Anka” (Szkolna 9),
dom Szkolna 3, OSP, Żabka (budynek), przedszkole (3 bryły) i wiatrak (wieża + wirnik).
Układ jak w grze: x - wzdłuż frontu, z - na zewnątrz frontu (+z), y - w górę, środek obrysu w (0,0,0)."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from common import Model
from budynki import gable, gable_ends, hip, win, BASE

def mats(M, wall, roof, frame='#f4f4f2', plinth='#8f8a82', roof_dark=None):
    return dict(wall=M.mat('wall', wall, noise=.05, scale=22), plinth=M.mat('plinth', plinth, noise=.1), roof=M.mat('roof', roof, brick=(.34, .3, roof_dark or '#2a2a2a', .02)),
                frame=M.mat('frame', frame), glass=M.mat('glass', '#33424e', noise=.18, scale=6), sill=M.mat('sill', '#d9d6cf'), gut=M.mat('gut', '#5d554e'),
                brick=M.mat('brick', '#9a4a32', brick=(.25, .075, '#d8cfc0', .012)), dark=M.mat('dark', '#2e3134'), shut=M.mat('shut', '#8a5a36', brick=(4, .05, '#6a4426', .006)),
                white=M.mat('white', '#f2f1ec'), metal=M.mat('metal', '#3c4044'), solar=M.mat('solar', '#1d2a44', brick=(.32, .5, '#9aa3ad', .01)))

def walls(M, m, L, D, H, plh=.5, x0=None, x1=None, z0=None, z1=None):
    x0 = -L / 2 if x0 is None else x0; x1 = L / 2 if x1 is None else x1; z0 = -D / 2 if z0 is None else z0; z1 = D / 2 if z1 is None else z1
    M.box(x0, x1, BASE, H, z0, z1, m['wall']); M.box(x0 - .03, x1 + .03, BASE, plh, z0 - .03, z1 + .03, m['plinth'])

def gutters_x(M, m, x0, x1, z, y):  # rynna wzdłuż x + rury spustowe na końcach
    M.cyl(y, x0, x1, z, .07, .07, 8, m['gut'], axis='x')
    zw = z - math.copysign(.45, z)  # rura przy ścianie, kolanko do rynny
    for x in (x0 + .7, x1 - .7):
        M.box(x - .05, x + .05, BASE + 1, y - .35, zw - .05, zw + .05, m['gut']); M.box(x - .05, x + .05, y - .4, y - .05, min(zw, z) - .05, max(zw, z) + .05, m['gut'])

def chimney(M, m, x, z, y0, y1, w=.6, d=.6):
    M.box(x - w / 2, x + w / 2, y0, y1, z - d / 2, z + d / 2, m['brick']); M.box(x - w / 2 - .06, x + w / 2 + .06, y1, y1 + .1, z - d / 2 - .06, z + d / 2 + .06, m['dark'])

def slope_y(ye, rise, half, t):  # wysokość połaci dachu dwuspadowego w odległości t od kalenicy (0) do okapu (half)
    return ye + rise * (1 - t / half)

def roof_panel(M, mk, x0, x1, zm, half, ye, rise, t0, t1, side=1, lift=.05, th=.04):
    """płyta (panele PV, okno dachowe) leżąca na połaci dachu z kalenicą wzdłuż x; t0..t1 - odległość od kalenicy"""
    pts = [(x0, slope_y(ye, rise, half, t0) + lift, zm + side * t0), (x1, slope_y(ye, rise, half, t0) + lift, zm + side * t0), (x1, slope_y(ye, rise, half, t1) + lift, zm + side * t1), (x0, slope_y(ye, rise, half, t1) + lift, zm + side * t1)]
    M.prism(pts, (0, th, 0), mk)

def windows_row(M, m, xs, y, z, w, h, face='+z', shut=False, sill=True):
    s = 1 if face in ('+z', '+x') else -1
    for x in xs:
        win(M, x, y, z, w, h, m['frame'], m['glass'], face, m['sill'] if sill else None)
        if shut:  # kaseta rolety nad oknem
            if face in ('+z', '-z'): M.box(x - w / 2 - .1, x + w / 2 + .1, y + h / 2 + .08, y + h / 2 + .28, z if s > 0 else z - .14, z + .14 if s > 0 else z, m['wall'])

def balcony(M, m, x, w, z, y, depth=1.2, rail='bars', railmat=None):
    rm = railmat or m['metal']
    M.box(x - w / 2, x + w / 2, y - .18, y, z, z + depth, m['white'])
    if rail == 'glass':
        M.box(x - w / 2, x + w / 2, y, y + 1.0, z + depth - .04, z + depth - .01, M.mat('bglass', '#a9c3cf', noise=.05)); M.box(x - w / 2, x + w / 2, y + 1.0, y + 1.05, z + depth - .06, z + depth + .01, M.mat('steel', '#b9bec2'))
        for xx in (x - w / 2 + .05, x + w / 2 - .05): M.box(xx - .025, xx + .025, y, y + 1.05, z + depth - .06, z + depth, M.mat('steel', '#b9bec2'))
    else:
        M.box(x - w / 2, x + w / 2, y + .95, y + 1.0, z + depth - .05, z + depth, rm); M.box(x - w / 2, x + w / 2, y + .1, y + .14, z + depth - .05, z + depth, rm)
        xx = x - w / 2 + .05
        while xx < x + w / 2:
            M.box(xx - .015, xx + .015, y, y + .97, z + depth - .04, z + depth - .01, rm); xx += .14 if rail == 'bars' else .3
        for zz in (z, z + depth - .05):
            for sx in (-1, 1): M.box(x + sx * w / 2 - .025, x + sx * w / 2 + .025, y, y + 1.0, z, z + depth, rm) if zz == z else None

def door(M, m, x, z, w=1.0, h=2.15, col='#6a4a32', face='+z', glassy=False):
    d = M.mat('door_' + col, col); s = 1 if face == '+z' else -1
    M.box(x - w / 2 - .08, x + w / 2 + .08, 0, h + .08, z if s > 0 else z - .05, z + .05 if s > 0 else z, m['frame'])
    M.box(x - w / 2, x + w / 2, 0, h, z + (.05 if s > 0 else -.08), z + (.08 if s > 0 else -.05), m['glass'] if glassy else d)

# ---------------- domy naprzeciw kościoła ----------------
def dom_w159():
    M = Model('dom_w159'); L, D = 10.5, 12.0; F = 2.9; H = 2 * F + .3; m = mats(M, '#ecebe7', '#3b3f45', '#f2f2ee', '#7d7f81', '#26292c')
    grey = M.mat('band', '#9da0a2', noise=.04)
    walls(M, m, L, D, H); M.box(L * .05, L / 2 + .02, .5, F, D / 2 - .02, D / 2 + .02, grey)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.6, m['roof'], ov=.55); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.6, m['wall'])
    # dwie wystawki z frontowymi szczytami (jak na zdjęciu), balkon przy lewej
    for cx, w in ((-L * .27, 3.6), (L * .2, 3.0)):
        M.box(cx - w / 2, cx + w / 2, F, H + 1.2, D / 2 - 2.6, D / 2 + .04, m['wall']); gable(M, cx - w / 2, cx + w / 2, D / 2 - 3.2, D / 2 + .44, H + 1.2, 1.7, m['roof'], ov=.25, along='z')
        M.prism([(cx - w / 2, H + 1.2, D / 2 + .04), (cx + w / 2, H + 1.2, D / 2 + .04), (cx, H + 2.9, D / 2 + .04)], (0, 0, -.02), m['wall'])
        windows_row(M, m, [cx], F + 1.5, D / 2 + .04, 1.4 if w > 3 else 1.0, 1.4, shut=True)
    balcony(M, m, -L * .27, 3.6, D / 2, F, 1.1, 'bars', M.mat('rail', '#2b2d30'))
    windows_row(M, m, [-L * .3, L * .3], 1.5, D / 2, 1.2, 1.4, shut=True); door(M, m, -L * .02, D / 2, 1.1, 2.2, '#5a3c2a')
    for s in (-1, 1): windows_row(M, m, [-2.5, 1.0, 3.5], 1.5, 0, 1.0, 1.3, face='+x' if s > 0 else '-x') if False else None
    for z in (-3.5, 0, 3.5):
        win(M, L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '-x', m['sill'])
        win(M, L / 2, F + 1.5, z, 1.0, 1.2, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, F + 1.5, z, 1.0, 1.2, m['frame'], m['glass'], '-x', m['sill'])
    chimney(M, m, L * .25, -1.0, H + 1.5, H + 4.2); gutters_x(M, m, -L / 2 - .5, L / 2 + .5, D / 2 + .55, H - .05); gutters_x(M, m, -L / 2 - .5, L / 2 + .5, -D / 2 - .55, H - .05)
    M.finish(res=512, quality=72, ao_dist=1.6)

def dom_w161():
    M = Model('dom_w161'); L, D = 8.5, 11.0; F = 2.9; H = F + 1.4; m = mats(M, '#efe2c9', '#3e7a3a', '#f4f4f2', '#a59c8c', '#25502a')
    walls(M, m, L, D, H)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 4.6, m['roof'], ov=.5, along='z'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 4.6, m['wall'], along='z')
    balcony(M, m, 0, 3.4, D / 2, F + .1, 1.0, 'bars', M.mat('rail', '#1f2022'))
    for x in (-.65, .65): win(M, x, F + 1.35, D / 2, .9, 2.0, m['frame'], m['glass'])
    win(M, 0, F + 3.6, D / 2, .7, .7, m['frame'], m['glass'])
    windows_row(M, m, [-L * .28, L * .3], 1.5, D / 2, 1.1, 1.4, shut=True); door(M, m, L * .02, D / 2, 1.0, 2.2, '#4a3426')
    for z in (-3.2, 0, 3.2):
        win(M, L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '-x', m['sill'])
    roof_panel_z = None
    chimney(M, m, -1.6, -2.5, H + 2.0, H + 5.0, .5, .6)
    M.finish(res=512, quality=72, ao_dist=1.6)

def dom_w163():
    M = Model('dom_w163'); L, D = 10.0, 11.0; F = 2.9; H = F + 1.2; m = mats(M, '#f1e9d6', '#5b3b2d', '#f4f4f2', '#a29a8a', '#3a241b')
    walls(M, m, L, D, H)
    hip(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.8, m['roof'], ov=.5)
    cx, w = L * .1, 3.6  # wystawka ze szczytem i balkonem
    M.box(cx - w / 2, cx + w / 2, F, H + 1.6, D / 2 - 3.0, D / 2 + .04, m['wall']); gable(M, cx - w / 2, cx + w / 2, D / 2 - 3.6, D / 2 + .49, H + 1.6, 1.8, m['roof'], ov=.25, along='z')
    M.prism([(cx - w / 2, H + 1.6, D / 2 + .04), (cx + w / 2, H + 1.6, D / 2 + .04), (cx, H + 3.4, D / 2 + .04)], (0, 0, -.02), m['wall'])
    balcony(M, m, cx, 2.6, D / 2, F + .1, .8, 'bars', M.mat('rail', '#2b2d30')); win(M, cx, F + 1.35, D / 2, 1.1, 2.0, m['frame'], m['glass'])
    windows_row(M, m, [-L * .32, -L * .08, L * .3], 1.5, D / 2, 1.1, 1.35, shut=False)
    M.cyl(F + 1.6, D / 2 - .1, D / 2 + .2, L * .38, .35, .35, 12, M.mat('dish', '#e9e9e6'), axis='y') if False else M.ell((L * .38, F + 1.7, D / 2 + .15), (.38, .38, .08), M.mat('dish', '#e9e9e6')) if hasattr(M, 'ell') else None
    for z in (-3.2, 0, 3.2):
        win(M, L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '-x', m['sill'])
    door(M, m, L * .5 - .01, 0, 1.0, 2.15, '#5a3c2a', face='+z') if False else None
    chimney(M, m, -L * .2, -1.5, H + 2.0, H + 4.6); gutters_x(M, m, -L / 2 - .5, L / 2 + .5, D / 2 + .5, H - .05); gutters_x(M, m, -L / 2 - .5, L / 2 + .5, -D / 2 - .5, H - .05)
    M.finish(res=512, quality=72, ao_dist=1.6)

# ---------------- kwiaciarnia „Sas-Anka” (Szkolna 9) ----------------
def kwiaciarnia():
    M = Model('kwiaciarnia'); L, D = 12.5, 11.0; F = 3.0; H = F + 1.1; m = mats(M, '#ecd2b4', '#5e3a2b', '#7a4a2e', '#c9b39a', '#3c2419')
    lower = M.mat('lower', '#dcb48e', noise=.05, scale=20); col = M.mat('col', '#7a4630', brick=(.2, .06, '#5e3424', .01)); wood = M.mat('wood', '#6e4128', brick=(.12, 3, '#4e2c18', .01))
    walls(M, m, L, D, H); M.box(-L / 2 + 3.6, L / 2 + .02, .5, F, D / 2 - .02, D / 2 + .02, lower)
    # loggia po lewej: cofnięta ściana, ceglane słupy, drewniany balkon na piętrze
    M.box(-L / 2 - .02, -L / 2 + 3.6, BASE, H, D / 2 - 2.0, D / 2 + .02, m['wall']) if False else None
    for x in (-L / 2 + .25, -L / 2 + 3.35): M.box(x - .22, x + .22, 0, F, D / 2 - .3, D / 2 + .15, col)
    M.box(-L / 2, -L / 2 + 3.6, F - .2, F + .05, D / 2 - .5, D / 2 + .5, m['white']); M.box(-L / 2, -L / 2 + 3.6, F + .9, F + 1.0, D / 2 + .38, D / 2 + .48, wood)
    x = -L / 2 + .1
    while x < -L / 2 + 3.6: M.box(x - .03, x + .03, F, F + .95, D / 2 + .4, D / 2 + .46, wood); x += .25
    gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 4.2, m['roof'], ov=.6); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 4.2, m['wall'])
    # okna dachowe, panele fotowoltaiczne i mała lukarna na przedniej połaci
    half = D / 2 + .6
    roof_panel(M, m['solar'], -1.6, 3.8, 0, half, H, 4.2 * (1 + .6 / (D / 2)), .3, 1.9, 1)
    for x in (-3.8, -1.0, 1.8): roof_panel(M, m['glass'], x - .4, x + .4, 0, half, H, 4.2 * (1 + .6 / (D / 2)), 2.6, 3.6, 1, lift=.06, th=.03)
    M.box(L * .32 - .5, L * .32 + .5, H + 1.6, H + 2.6, D / 2 - 3.4, D / 2 - 2.3, m['wall']); win(M, L * .32, H + 2.1, D / 2 - 2.3, .6, .6, m['frame'], m['glass'])
    gable(M, L * .32 - .6, L * .32 + .6, D / 2 - 3.6, D / 2 - 2.1, H + 2.6, .7, m['roof'], ov=.1, along='z')
    # sklep: przeszklone drzwi + witryna w brązowych ramach, okna z roletami
    M.box(L * .05, L * .05 + 2.2, 0, 2.5, D / 2, D / 2 + .06, m['frame']); M.box(L * .05 + .1, L * .05 + 2.1, .05, 2.4, D / 2 + .06, D / 2 + .09, m['glass'])
    M.box(L * .05 + 1.0, L * .05 + 1.06, .05, 2.4, D / 2 + .09, D / 2 + .11, m['frame'])
    windows_row(M, m, [-L / 2 + 1.8], 1.55, D / 2 - .3, 1.3, 1.4, shut=True); windows_row(M, m, [L * .38], 1.55, D / 2, 1.1, 1.3, shut=True)
    win(M, -L / 2 + 1.8, F + 1.35, D / 2 - .3, 1.2, 2.0, m['frame'], m['glass']); win(M, L * .05, F + .55, D / 2, .9, .8, m['frame'], m['glass'])
    for z in (-3.0, .5): win(M, L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, 1.5, z, 1.0, 1.3, m['frame'], m['glass'], '-x', m['sill'])
    chimney(M, m, L * .1, -1.2, H + 2.0, H + 4.6); gutters_x(M, m, -L / 2 - .6, L / 2 + .6, D / 2 + .6, H - .05); gutters_x(M, m, -L / 2 - .6, L / 2 + .6, -D / 2 - .6, H - .05)
    M.finish(res=512, quality=72, ao_dist=1.6)

def dom_szk3():
    M = Model('dom_szk3'); L, D = 11.5, 11.0; H = 3.4; m = mats(M, '#e8dcc4', '#4f545a', '#f4f4f2', '#a39b8c', '#30343a')
    walls(M, m, L, D, H); hip(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.0, m['roof'], ov=.55)
    for x, z in ((-2.2, -1.5), (2.4, 1.0)): chimney(M, m, x, z, H + 1.2, H + 4.0, .75, .75)
    windows_row(M, m, [-3.6, -1.0, 3.2], 1.55, D / 2, 1.1, 1.3); door(M, m, 1.2, D / 2, 1.0, 2.15, '#6a4a32')
    windows_row(M, m, [-3.6, 0, 3.6], 1.55, -D / 2, 1.1, 1.3, face='-z')
    for z in (-2.6, 2.6): win(M, L / 2, 1.55, z, 1.1, 1.3, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, 1.55, z, 1.1, 1.3, m['frame'], m['glass'], '-x', m['sill'])
    gutters_x(M, m, -L / 2 - .55, L / 2 + .55, D / 2 + .55, H - .05); gutters_x(M, m, -L / 2 - .55, L / 2 + .55, -D / 2 - .55, H - .05)
    M.finish(res=512, quality=72, ao_dist=1.6)

# ---------------- szkoła podstawowa (obrys OSM w kształcie litery L) ----------------
def szkola():
    M = Model('szkola'); F = 3.5; H = 2 * F + .4; m = mats(M, '#e6d7b6', '#8a4130', '#f6f6f2', '#8d877c', '#5c2a1e')
    portal = M.mat('portal', '#9a3d2c', brick=(.25, .075, '#d6c9b6', .012))
    # skrzydło zachodnie (długie) i wschodnie (szersze)
    walls(M, m, 0, 0, H, x0=-19.9, x1=6.9, z0=-3.9, z1=8.6); walls(M, m, 0, 0, H, x0=6.5, x1=19.9, z0=-11.4, z1=9.2)
    # płaski dach: attyka z obróbką i ciemna papa
    flat = M.mat('papa', '#4a4a48', noise=.12); cap = M.mat('blacha', '#9a9c9a', noise=.03)
    for x0, x1, z0, z1 in ((-19.9, 6.9, -3.9, 8.6), (6.5, 19.9, -11.4, 9.2)):
        M.box(x0 - .08, x1 + .08, H, H + .55, z0 - .08, z1 + .08, m['wall']); M.box(x0 - .14, x1 + .14, H + .55, H + .63, z0 - .14, z1 + .14, cap)
        M.box(x0 + .2, x1 - .2, H + .2, H + .3, z0 + .2, z1 - .2, flat)
    M.box(-19.95, 6.95, H - .35, H, -3.95, 8.65, m['white']); M.box(6.45, 19.95, H - .35, H, -11.45, 9.25, m['white'])
    # wejście główne od północy: ganek z płaskim dachem, ceglany portal, drzwi
    M.box(-6.9, -1.6, BASE, 3.6, 8.6, 11.2, m['wall']); M.box(-7.1, -1.4, 3.6, 3.9, 8.4, 11.5, m['white'])
    M.box(-5.6, -2.9, 0, 3.2, 11.2, 11.3, portal); M.box(-5.0, -3.5, 0, 2.6, 11.3, 11.36, M.mat('sdoor', '#5a3324')); M.box(-5.0, -3.5, 2.6, 3.0, 11.3, 11.36, m['glass'])
    for k in range(4): M.box(-6.2, -2.3, BASE, .5 - k * .15, 11.2, 11.2 + .35 * (k + 1), M.mat('step', '#b3ada3', noise=.05))
    # klatka schodowa od południa
    M.box(-5.1, -1.6, BASE, H + 1.1, -5.6, -3.9, m['wall']); M.box(-5.18, -1.52, H + 1.1, H + 1.18, -5.68, -3.82, cap)
    for y in (1.75, 1.75 + F): win(M, -3.35, y + .8, -5.6, 1.0, 1.4, m['frame'], m['glass'], '-z', m['sill'])
    # okna: dwie kondygnacje, białe ramy, na całej długości
    def row(x0, x1, z, face, step=2.9):
        n = int((x1 - x0) / step); xs = [x0 + (x1 - x0) * (i + .5) / n for i in range(n)]
        for y in (1.7, 1.7 + F):
            for x in xs:
                if face == '+z' and -7.4 < x < -1.1 and y < 3: continue
                win(M, x, y, z, 1.6, 1.55, m['frame'], m['glass'], face, m['sill'])
    row(-19.9, -7.0, 8.6, '+z'); row(-1.5, 6.5, 8.6, '+z'); row(-19.9, 6.5, -3.9, '-z'); row(6.5, 19.9, 9.2, '+z', 3.2); row(6.5, 19.9, -11.4, '-z', 3.2)
    for z0, z1, x, face in ((-3.9, 8.6, -19.9, '-x'), (-11.4, 9.2, 19.9, '+x')):
        n = int((z1 - z0) / 3.1)
        for i in range(n):
            for y in (1.7, 1.7 + F): win(M, x, y, z0 + (z1 - z0) * (i + .5) / n, 1.5, 1.55, m['frame'], m['glass'], face, m['sill'])
    for x in (-12, 0.5, 13): chimney(M, m, x, 2.0 if x < 6 else -1, H + .2, H + 1.6, .7, .9)
    M.finish(res=1024, quality=68, ao_dist=2.0)

# ---------------- OSP Trębaczew ----------------
def osp():
    M = Model('osp'); L, D = 16.0, 19.5; H1, H2 = 3.9, 3.3; H = H1 + H2; m = mats(M, '#a3a6a8', '#3a3d40', '#f4f4f2', '#7a7c7e')
    red = M.mat('red', '#b4282d', noise=.05); door = M.mat('gdoor', '#c22a2f', brick=(4, .11, '#8e1c20', .012))
    walls(M, m, L, D, H1); M.box(-L / 2 - .02, L / 2 + .02, H1, H, -D / 2 - .02, D / 2 + .02, red)
    M.box(-L / 2 - .15, L / 2 + .15, H, H + .55, -D / 2 - .15, D / 2 + .15, m['wall']); M.box(-L / 2 + .1, L / 2 - .1, H + .3, H + .4, -D / 2 + .1, D / 2 - .1, m['dark'])
    M.box(-L / 2 - .06, L / 2 + .06, H1 - .12, H1 + .04, -D / 2 - .06, D / 2 + .06, m['white'])
    DW, DH = 3.4, 3.3; bays = (-L / 2 + 2.6, -L / 2 + 6.9, L / 2 - 2.6)
    for i, x in enumerate(bays):
        M.box(x - DW / 2 - .15, x + DW / 2 + .15, 0, DH + .15, D / 2, D / 2 + .08, m['white'])
        M.box(x - DW / 2, x + DW / 2, 0, DH, D / 2 + .08, D / 2 + .11, door if i < 2 else m['dark'])
        if i == 2: M.box(x - DW / 2, x + DW / 2, 0, DH, D / 2 - 3, D / 2 + .09, m['dark'])
    for x in [-L / 2 + 1.2 + i * (L - 2.4) / 8 for i in range(9)]: win(M, x, H1 + 1.7, D / 2, .95, 1.25, m['frame'], m['glass'], '+z', m['sill'])
    for z in [-D / 2 + 2 + i * (D - 4) / 5 for i in range(6)]:
        win(M, L / 2, H1 + 1.7, z, .95, 1.25, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, H1 + 1.7, z, .95, 1.25, m['frame'], m['glass'], '-x', m['sill'])
        win(M, -L / 2, 1.8, z, 1.0, 1.0, m['frame'], m['glass'], '-x', m['sill'])
    M.box(-1.2, 1.2, H + .55, H + 2.6, -D / 2 + 1, -D / 2 + 3.4, red)  # wieżyczka/nadbudówka na dachu
    M.finish(res=512, quality=72, ao_dist=1.6)

# ---------------- Żabka (budynek przy DK42) ----------------
def zabka2():
    M = Model('zabka2'); L, D = 14.5, 13.5; G1 = 3.3; m = mats(M, '#8f9397', '#33373b', '#2c2f32', '#6e7174', '#1e2124')
    white = M.mat('upper', '#ecedeb', noise=.03); green = M.mat('zgreen', '#1d8f3e'); dk = M.mat('dkcol', '#4a4e52', noise=.04)
    seam = M.mat('seam', '#33373b', brick=(4, .35, '#24272a', .01))
    walls(M, m, L, D, G1, plh=.35)
    M.box(-L / 2 - .02, -L / 2 + .7, 0, G1, D / 2 - .7, D / 2 + .02, dk)
    gx0, gx1 = -L * .28, L * .28
    M.box(gx0, gx1, .3, 2.75, D / 2, D / 2 + .05, m['glass'])
    x = gx0
    while x <= gx1 + .01: M.box(x - .05, x + .05, .3, 2.75, D / 2 + .05, D / 2 + .1, m['frame']); x += (gx1 - gx0) / 4
    M.box(gx0, gx1, 1.05, 1.1, D / 2 + .05, D / 2 + .1, m['frame']); M.box(gx0 - .1, gx1 + .1, 2.75, 2.85, D / 2, D / 2 + .1, m['frame'])
    M.box(-L * .45, L * .2, 2.85, 3.5, D / 2 + .1, D / 2 + .5, green)
    UZ0, UZ1 = -D / 2, D / 2 - 1.5; G2 = 2.7
    M.box(-L / 2 + .3, L / 2 - .3, G1, G1 + G2, UZ0, UZ1, white)
    gable(M, -L / 2 + .3, L / 2 - .3, UZ0, UZ1, G1 + G2, 4.6, seam, ov=.45, along='x') if False else gable(M, -L / 2 + .3, L / 2 - .3, UZ0, UZ1 + .3, G1 + G2, 4.4, seam, ov=.45, along='z')
    gable_ends(M, -L / 2 + .3, L / 2 - .3, UZ0, UZ1, G1 + G2, 4.4, white, along='z')
    balcony(M, m, 0, L, UZ1, G1 + .02, 1.5, 'glass')
    M.box(-1.6, 1.6, G1 + .2, G1 + 2.5, UZ1, UZ1 + .05, m['frame']); M.box(-1.5, 1.5, G1 + .3, G1 + 2.4, UZ1 + .05, UZ1 + .08, m['glass']); M.box(-.03, .03, G1 + .3, G1 + 2.4, UZ1 + .08, UZ1 + .1, m['frame'])
    win(M, 0, G1 + G2 + 2.0, UZ1, .5, .5, m['frame'], m['glass'])
    for z in (-3.5, 0, 3.0): win(M, L / 2, 1.6, z, 1.0, 1.2, m['frame'], m['glass'], '+x'); win(M, L / 2 - .3, G1 + 1.4, z - .5, 1.0, 1.1, m['frame'], m['glass'], '+x')
    M.box(L / 2 - .02, L / 2 + .05, 0, 2.3, -5.5, -4.4, M.mat('sdoor', '#3a3e42'))
    M.finish(res=512, quality=72, ao_dist=1.6)

# ---------------- przedszkole (3 bryły wzdłuż Szkolnej) ----------------
def przedszkole(i):
    dims = [(8.5, 18.0, 2, 'hip'), (12.5, 12.5, 2, 'hip'), (9.5, 11.5, 2, 'front')][i]
    L, D, fl, rt = dims; F = 3.1; H = fl * F + .3
    M = Model('przedszkole%d' % i); m = mats(M, '#ece0c4', '#8a3a2a', '#f4f4f2', '#9d958a', '#5a2418')
    walls(M, m, L, D, H)
    if rt == 'hip': hip(M, -L / 2, L / 2, -D / 2, D / 2, H, 2.6, m['roof'], ov=.55)
    else:
        gable(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.4, m['roof'], ov=.55, along='z'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, H, 3.4, m['wall'], along='z')
        win(M, -.5, H + 1.4, D / 2, .5, .45, m['frame'], m['glass']); win(M, .5, H + 1.4, D / 2, .5, .45, m['frame'], m['glass'])
    M.box(-L / 2 - .05, L / 2 + .05, H - .3, H, -D / 2 - .05, D / 2 + .05, m['white'])
    n = max(2, int(L / 2.7))
    for f in range(fl):
        y = 1.65 + f * F
        for k in range(n):
            x = -L / 2 + (k + .5) * L / n
            if i == 1 and f == 0 and abs(x) < 1.6: continue
            win(M, x, y, D / 2, 1.3, 1.45, m['frame'], m['glass'], '+z', m['sill']); win(M, x, y, -D / 2, 1.3, 1.45, m['frame'], m['glass'], '-z', m['sill'])
        k2 = max(1, int(D / 3))
        for k in range(k2):
            z = -D / 2 + (k + .5) * D / k2; win(M, L / 2, y, z, 1.3, 1.45, m['frame'], m['glass'], '+x', m['sill']); win(M, -L / 2, y, z, 1.3, 1.45, m['frame'], m['glass'], '-x', m['sill'])
    if i == 1:  # wejście: drzwi, daszek na słupkach, schody
        door(M, m, 0, D / 2, 1.8, 2.3, '#3a4650', glassy=True)
        M.box(-1.9, 1.9, 2.7, 2.9, D / 2, D / 2 + 2.3, m['white']); [M.box(x - .05, x + .05, 0, 2.7, D / 2 + 2.1, D / 2 + 2.2, m['metal']) for x in (-1.7, 1.7)]
        for k in range(3): M.box(-1.8, 1.8, BASE, .45 - k * .15, D / 2, D / 2 + .5 + .35 * k, M.mat('step', '#c9b49a', noise=.05))
    if i == 0:  # łukowe daszki nad drzwiami od Zagrodowej (jak na zdjęciu)
        for x in (-L * .2, L * .25):
            door(M, m, x, D / 2, 1.0, 2.15, '#e9e9e6')
            M.prism([(x - .75 + 1.5 * j / 10, 2.45 + .3 * math.sin(math.pi * j / 10), D / 2) for j in range(11)], (0, 0, .5), m['roof'])
    M.finish(res=512, quality=72, ao_dist=1.6)

# ---------------- wiatrak (elektrownia wiatrowa) ----------------
def wiatrak():
    M = Model('wiatrak'); Hh = 95.0
    tower = M.mat('tower', '#eceeee', grad=('#7aa36a', '#eceeee')); nac = M.mat('nac', '#f2f3f3'); dk = M.mat('dk', '#9aa0a4')
    M.cyl(0, 0, 12, 0, 2.3, 2.15, 24, tower); M.cyl(0, 12, Hh, 0, 2.15, 1.35, 24, M.mat('tw2', '#eceeee', noise=.02))
    M.box(-.6, .6, 0, 2.3, 2.2, 2.35, dk)
    M.box(-2.0, 8.5, Hh - 1.6, Hh + 2.4, -1.9, 1.9, nac)  # gondola (przód na -x… wirnik osobno)
    M.finish(res=512, quality=74, ao_dist=4)

def wiatrak_wirnik():
    M = Model('wiatrak_wirnik'); bl = M.mat('blade', '#f4f5f5', noise=.02); hub = M.mat('hub', '#eef0f0')
    M.cyl(0, -1.5, 1.5, 0, 1.6, .2, 16, hub, axis='x') if False else None
    # piasta w osi x (wirnik obraca się wokół x), łopaty w płaszczyźnie y-z
    import math as mm
    pts = [(-1.2, 1.4 * mm.cos(a), 1.4 * mm.sin(a)) for a in [i * mm.pi / 8 for i in range(16)]]
    M.prism(pts, (1.4, 0, 0), hub); M.prism([(0.2, 0.9 * mm.cos(a), 0.9 * mm.sin(a)) for a in [i * mm.pi / 8 for i in range(16)]], (1.6, 0, 0), hub)
    for k in range(3):
        a = k * 2 * mm.pi / 3; ca, sa = mm.cos(a), mm.sin(a)
        prof = [(0, 1.2, .55), (0, 6, 1.6), (0, 20, 1.2), (0, 40, .7), (0, 52, .25)]
        top = []; bot = []
        for (_, r, w) in prof:
            top.append((-.15, r * ca - w * sa, r * sa + w * ca)); bot.append((-.15, r * ca + w * .45 * sa, r * sa - w * .45 * ca))
        M.prism(top + bot[::-1], (.25, 0, 0), bl)
    M.finish(res=256, quality=74, ao_dist=2)

if __name__ == '__main__':
    todo = sys.argv[1:]
    for f, a in ((dom_w159, None), (dom_w161, None), (dom_w163, None), (kwiaciarnia, None), (dom_szk3, None), (szkola, None), (osp, None), (zabka2, None),
                 (przedszkole, 0), (przedszkole, 1), (przedszkole, 2), (wiatrak, None), (wiatrak_wirnik, None)):
        name = f.__name__ + ('' if a is None else str(a))
        if todo and name not in todo: continue
        f() if a is None else f(a)
