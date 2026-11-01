"""Budynki wg zdjęć: Delikatesy Premium, dworzec PKP, Minerał, świetlica, ORLEN (sklep + wiata), Biedronka, Lidl.
Układ jak w grze (groupAt): x – wzdłuż frontu (L), z – na zewnątrz frontu (+z), y – w górę, środek budynku w (0,0,0)."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
BASE = -1.0
def gable(M, x0, x1, z0, z1, ye, rise, mk, ov=.6, along='x', t=.22, edge=None):
    """Dach dwuspadowy, kalenica wzdłuż osi `along`."""
    if along == 'x':
        zm = (z0 + z1) / 2; hz = (z1 - z0) / 2 + ov; drop = rise * ov / ((z1 - z0) / 2)
        for s in (-1, 1):
            ze = zm + s * hz; M.prism([(x0 - ov, ye + rise + t, zm), (x1 + ov, ye + rise + t, zm), (x1 + ov, ye - drop + t, ze), (x0 - ov, ye - drop + t, ze)], (0, -t, 0), mk)
    else:
        xm = (x0 + x1) / 2; hx = (x1 - x0) / 2 + ov; drop = rise * ov / ((x1 - x0) / 2)
        for s in (-1, 1):
            xe = xm + s * hx; M.prism([(xm, ye + rise + t, z0 - ov), (xm, ye + rise + t, z1 + ov), (xe, ye - drop + t, z1 + ov), (xe, ye - drop + t, z0 - ov)], (0, -t, 0), mk)
def gable_ends(M, x0, x1, z0, z1, ye, rise, mk, along='x'):
    if along == 'x':
        zm = (z0 + z1) / 2
        for x, d in ((x0, .02), (x1 - .02, .02)): M.prism([(x, ye, z0), (x, ye, z1), (x, ye + rise, zm)], (d, 0, 0), mk)
    else:
        xm = (x0 + x1) / 2
        for z in (z0, z1 - .02): M.prism([(x0, ye, z), (x1, ye, z), (xm, ye + rise, z)], (0, 0, .02), mk)
def hip(M, x0, x1, z0, z1, ye, rise, mk, ov=.5, t=.2):
    x0 -= ov; x1 += ov; z0 -= ov; z1 += ov; w, d = x1 - x0, z1 - z0
    if w >= d: r0, r1, zm = x0 + d / 2, x1 - d / 2, (z0 + z1) / 2; R = [(r0, zm), (r1, zm)]
    else: r0, r1, xm = z0 + w / 2, z1 - w / 2, (x0 + x1) / 2; R = [(xm, r0), (xm, r1)]
    yr = ye + rise; c = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    if w >= d:
        faces = [[c[0], c[1], R[1], R[0]], [c[2], c[3], R[0], R[1]], [c[3], c[0], R[0]], [c[1], c[2], R[1]]]
    else:
        faces = [[c[1], c[2], R[1], R[0]], [c[3], c[0], R[0], R[1]], [c[0], c[1], R[0]], [c[2], c[3], R[1]]]
    for f in faces:
        pts = [(p[0], ye if p in c else yr, p[1]) for p in f]
        M.prism(pts, (0, -t, 0), mk)
def win(M, x, y, z, w, h, frame, glass, face='+z', sill=None, grille=None):
    fr = .08; s = 1 if face in ('+z', '+x') else -1
    if face in ('+z', '-z'):
        M.box(x - w / 2 - fr, x + w / 2 + fr, y - h / 2 - fr, y + h / 2 + fr, z if s > 0 else z - .05, z + .05 if s > 0 else z, frame)
        M.box(x - w / 2, x + w / 2, y - h / 2, y + h / 2, z + s * .05 if s > 0 else z - .06, z + .06 if s > 0 else z - .05, glass)
        M.box(x - .025, x + .025, y - h / 2, y + h / 2, z + (.05 if s > 0 else -.08), z + (.08 if s > 0 else -.05), frame)
        if sill: M.box(x - w / 2 - .15, x + w / 2 + .15, y - h / 2 - fr - .06, y - h / 2 - fr, z if s > 0 else z - .16, z + .16 if s > 0 else z, sill)
        if grille:
            for i in range(-2, 3): M.box(x + i * w / 5 - .015, x + i * w / 5 + .015, y - h / 2, y + h / 2, z + (.1 if s > 0 else -.14), z + (.14 if s > 0 else -.1), grille)
    else:
        M.box(x if s > 0 else x - .05, x + .05 if s > 0 else x, y - h / 2 - fr, y + h / 2 + fr, z - w / 2 - fr, z + w / 2 + fr, frame)
        M.box(x + s * .05 if s > 0 else x - .06, x + .06 if s > 0 else x - .05, y - h / 2, y + h / 2, z - w / 2, z + w / 2, glass)
        if sill: M.box(x if s > 0 else x - .16, x + .16 if s > 0 else x, y - h / 2 - fr - .06, y - h / 2 - fr, z - w / 2 - .15, z + w / 2 + .15, sill)
        if grille:
            for i in range(-2, 3): M.box(x + (.1 if s > 0 else -.14), x + (.14 if s > 0 else -.1), y - h / 2, y + h / 2, z + i * w / 5 - .015, z + i * w / 5 + .015, grille)
def side_windows(M, L, D, y, step, w, h, frame, glass, sill=None, skip=lambda s, z: False, grille=None):
    z = -D / 2 + step * .7
    while z < D / 2 - step * .5:
        for s in (-1, 1):
            if not skip(s, z): win(M, s * L / 2, y, z, w, h, frame, glass, '+x' if s > 0 else '-x', sill, grille)
        z += step

def delikatesy():
    M = Model('delikatesy'); L, D = 32.0, 20.5; FL, WH = 1.0, 4.4
    wall = M.mat('wall', '#e3e2dc', noise=.04, scale=25); tiles = M.mat('tiles', '#c9a27a', brick=(.6, .3, '#a8845e', .01)); roof = M.mat('roof', '#4a3e36', brick=(.32, .28, '#2e2620', .02))
    brown = M.mat('brown', '#5a3b28'); glass = M.mat('glass', '#26313a'); white = M.mat('white', '#f4f2ee'); wood = M.mat('wood', '#8a5a32', brick=(.12, 4, '#5e3a1e', .01)); sill = M.mat('sill', '#cfc9bd')
    M.box(-L / 2, L / 2, BASE, WH, -D / 2, D / 2, wall); M.box(-L / 2 - .03, L / 2 + .03, BASE, FL + .45, -D / 2 - .03, D / 2 + .03, tiles)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, WH, 4.6, roof); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, WH, 4.6, wall)
    def dormer(x, w, d, hh, rise):
        M.box(x - w / 2, x + w / 2, WH, WH + hh, D / 2 - d - .6, D / 2 - .6, wall); gable(M, x - w / 2, x + w / 2, D / 2 - d - .8, D / 2 - .4, WH + hh, rise, roof, ov=.25, along='z')
        M.prism([(x - w / 2, WH + hh, D / 2 - .6), (x + w / 2, WH + hh, D / 2 - .6), (x, WH + hh + rise, D / 2 - .6)], (0, 0, .02), wall); win(M, x, WH + hh * .55, D / 2 - .6, w * .5, hh * .55, brown, glass)
    for x in (-L * .36, -L * .22, -L * .08): dormer(x, 1.8, 2.4, 1.7, 1.0)
    dormer(L * .3, 3.2, 2.8, 2.1, 1.3)
    cx = -L * .05
    M.box(cx - 3.1, cx + 3.1, BASE, WH, D / 2, D / 2 + 1.6, wall)
    gable(M, cx - 3.6, cx + 3.6, D / 2 - 1.5, D / 2 + 2.6, WH, 3.2, roof, ov=.2, along='z')
    M.prism([(cx - 3.6, WH, D / 2 + 2.6), (cx + 3.6, WH, D / 2 + 2.6), (cx, WH + 3.2, D / 2 + 2.6)], (0, 0, -.06), wood)
    for o in (-1.3, 1.3): M.box(cx + o - .18, cx + o + .18, FL, WH, D / 2 + 2.2, D / 2 + 2.56, white)
    M.box(cx - 2.3, cx + 2.3, WH - .35, WH, D / 2 + 1.6, D / 2 + 2.6, white)
    M.box(cx - 1.2, cx + 1.2, FL, FL + 2.4, D / 2 + 1.6, D / 2 + 1.66, glass); M.box(cx - .04, cx + .04, FL, FL + 2.4, D / 2 + 1.66, D / 2 + 1.7, brown)
    x = -L / 2 + 1.6
    while x < cx - 3.5: win(M, x, FL + 1.6, D / 2, 1.1, 1.3, brown, glass, sill=sill); x += 2.4
    for x in (L * .17, L * .37): M.box(x - 1.25, x + 1.25, FL + .45, FL + 2.35, D / 2, D / 2 + .05, brown)
    side_windows(M, L, D, FL + 1.6, 3.2, 1.1, 1.3, brown, glass, sill)
    for x in (-L / 2 + .2, L / 2 - .2): M.cyl(x, BASE + .5, WH - .1, D / 2 + .15, .06, .06, 6, brown)
    M.finish(res=1024, quality=72, ao_dist=2.0)

def dworzec():
    M = Model('dworzec'); L, D = 17.5, 10.0; ML = L * .5; mx = -L / 2 + ML / 2; WL = L - ML; wx = L / 2 - WL / 2; H1, H2 = 7.2, 4.2
    wall = M.mat('wall', '#b9b2a2', noise=.08, scale=10); plin = M.mat('plin', '#7e786e', noise=.08); red = M.mat('red', '#7a3324'); roof = M.mat('roof', '#4a3a32', brick=(.3, .26, '#2e241f', .02))
    wf = M.mat('wf', '#5a2e1c'); glass = M.mat('glass', '#2c343a'); brick = M.mat('brick', '#8a7a6a', noise=.1); door = M.mat('door', '#4a2a1c'); green = M.mat('green', '#3f9a4a')
    M.box(-L / 2, -L / 2 + ML, BASE, H1, -D / 2, D / 2, wall); M.box(wx - WL / 2, wx + WL / 2, BASE, H2, -D * .5, D * .32, wall)
    M.box(-L / 2 - .03, L / 2 + .03, BASE, 1.0, -D / 2 - .03, D / 2 + .03, plin)
    M.box(-L / 2 - .35, -L / 2 + ML + .35, H1 - .25, H1, -D / 2 - .35, D / 2 + .35, red); M.box(wx - WL / 2, wx + WL / 2 + .35, H2 - .25, H2, -D * .5 - .35, D * .32 + .35, red)
    hip(M, -L / 2, -L / 2 + ML, -D / 2, D / 2, H1, 3.6, roof, ov=.45); hip(M, wx - WL / 2 + .2, wx + WL / 2, -D * .5, D * .32, H2, 2.4, roof, ov=.45)
    for x, z, y0, hh in ((mx - ML * .2, -D * .2, H1 + 1.2, 2.6), (mx + ML * .25, D * .1, H1 + 1.4, 2.4), (wx + WL * .2, -D * .2, H2 + 1.0, 2.2)):
        M.box(x - .4, x + .4, y0, y0 + hh, z - .4, z + .4, brick); M.box(x - .48, x + .48, y0 + hh, y0 + hh + .15, z - .48, z + .48, plin)
    for k in (-.32, 0, .32):
        win(M, mx + k * ML, 5.2, D / 2, 1.1, 1.5, wf, glass); win(M, mx + k * ML, 2.3, D / 2, 1.1, 1.5, wf, glass)
    x = wx - WL / 2 + 2.2
    while x < wx + WL / 2 - .8: win(M, x, 2.3, D * .32, 1.1, 1.4, wf, glass); x += 2.1
    M.box(mx - ML * .42 - .6, mx - ML * .42 + .6, 0, 2.2, D / 2, D / 2 + .05, door); M.box(wx - WL / 2 + .4, wx - WL / 2 + 1.6, 0, 2.4, D * .32, D * .32 + .05, door)
    M.box(wx - WL / 2 + .1, wx - WL / 2 + 1.9, 2.6, 3.1, D * .32, D * .32 + .12, green)
    # lukarna „wole oko” na dachu
    M.box(mx - .8, mx + .8, H1 + 1.0, H1 + 1.6, D / 2 - 1.2, D / 2 - .5, roof)
    side_windows(M, ML, D, 5.2, 3.4, 1.0, 1.4, wf, glass, skip=lambda s, z: s > 0)
    for s in (-1, 1): M.box(-L / 2 + .2, -L / 2 + ML - .2, 0, .4, s * (D / 2 + .3) - .3, s * (D / 2 + .3) + .3, plin) if s > 0 else None
    M.finish(res=1024, quality=72, ao_dist=2.0)

def mineral():
    M = Model('mineral'); L, D = 9.5, 24.0; HH = 6.8
    yel = M.mat('yel', '#e8c45a', noise=.06, scale=14); brn = M.mat('brn', '#5a3a2a'); white = M.mat('white', '#f2f0ea'); glass = M.mat('glass', '#2e3a44'); steel = M.mat('steel', '#4a4e52'); roofc = M.mat('roofc', '#45484c')
    M.box(-L / 2, L / 2, BASE, HH, -D / 2, D / 2, yel); M.box(-L / 2 - .03, L / 2 + .03, BASE, .55, -D / 2 - .03, D / 2 + .03, brn)
    M.box(-L / 2 - .25, L / 2 + .25, HH, HH + .4, -D / 2 - .25, D / 2 + .25, brn); M.box(-L / 2 + .1, L / 2 - .1, HH + .4, HH + .55, -D / 2 + .1, D / 2 - .1, roofc)
    for s in (-1, 1):
        z = -D / 2 + 1.6
        while z < D / 2 - 1:
            win(M, s * L / 2, 4.8, z, 1.2, 1.4, white, glass, '+x' if s > 0 else '-x', sill=white); win(M, s * L / 2, 1.9, z, 1.2, 1.4, white, glass, '+x' if s > 0 else '-x', sill=white, grille=steel); z += 2.4
    for x in (-2.2, 2.2): win(M, x, 4.8, D / 2, 1.2, 1.4, white, glass); win(M, x, 1.9, D / 2, 1.2, 1.4, white, glass, grille=steel)
    M.box(L / 2, L / 2 + 1.2, 3.0, 3.15, -5.5, -3.0, brn); M.box(L / 2, L / 2 + .05, 0, 2.3, -4.8, -3.7, steel)
    M.finish(res=512, quality=74, ao_dist=1.5)

def swietlica():
    M = Model('swietlica'); L, D = 15.5, 9.5; HS = 3.4
    wall = M.mat('wall', '#f2f2ee', noise=.03, scale=20); plin = M.mat('plin', '#9c9a94'); roof = M.mat('roof', '#5a3a2c', brick=(.32, .3, '#3a241a', .02)); brown = M.mat('brown', '#7a5030')
    shut = M.mat('shut', '#6e7378', brick=(4, .06, '#5a5e62', .004)); glass = M.mat('glass', '#2c3640'); white = M.mat('white', '#ffffff')
    M.box(-L / 2, L / 2, BASE, HS, -D / 2, D / 2, wall); M.box(-L / 2 - .03, L / 2 + .03, BASE, .45, -D / 2 - .03, D / 2 + .03, plin)
    gable(M, -L / 2, L / 2, -D / 2, D / 2, HS, 2.6, roof, ov=.5, along='z'); gable_ends(M, -L / 2, L / 2, -D / 2, D / 2, HS, 2.6, wall, along='z')
    M.box(-L / 2 - .5, L / 2 + .5, HS - .2, HS, D / 2 + .3, D / 2 + .5, brown)
    for x in (-L * .28, L * .28): M.box(x - .75, x + .75, 1.05, 2.55, D / 2, D / 2 + .06, shut)
    M.box(-.55, .55, 0, 2.2, D / 2, D / 2 + .05, glass); M.box(-.6, .6, 2.2, 2.3, D / 2, D / 2 + .07, white)
    side_windows(M, L, D, 1.8, 3.0, 1.2, 1.2, shut, shut)
    M.finish(res=512, quality=74, ao_dist=1.5)

def orlen_sklep():
    M = Model('orlen_sklep'); L, D = 13.0, 12.5
    white = M.mat('white', '#f4f4f2', noise=.02); red = M.mat('red', '#d8141c'); gr = M.mat('gr', '#4a4e52'); glass = M.mat('glass', '#2a3640'); art = M.mat('art', '#c84a2a', grad=('#2a5bd7', '#f2a417')); plin = M.mat('plin', '#9a9894')
    M.box(-L / 2, L / 2, BASE, 4.2, -D / 2, D / 2, white); M.box(-L / 2 - .03, L / 2 + .03, BASE, .3, -D / 2 - .03, D / 2 + .03, plin)
    M.box(-L / 2 - .05, L / 2 + .05, 3.45, 4.2, -D / 2 - .05, D / 2 + .05, red); M.box(-L / 2 - .15, L / 2 + .15, 4.2, 4.4, -D / 2 - .15, D / 2 + .15, gr)
    M.box(-L * .4, L * .1, .3, 3.2, D / 2, D / 2 + .05, glass)
    for x in (-L * .4, -L * .27, -L * .15, -L * .02, L * .1): M.box(x - .04, x + .04, .3, 3.2, D / 2 + .05, D / 2 + .09, gr)
    M.box(L * .16, L * .46, .4, 3.1, D / 2, D / 2 + .05, art)   # kolorowa grafika na ścianie (jak na zdjęciu)
    M.box(-L / 2, -L / 2 + .05, .4, 3.1, -D * .3, D * .3, art)
    M.finish(res=512, quality=74, ao_dist=1.5)

def orlen_wiata():
    M = Model('orlen_wiata'); L, W = 18.0, 12.0
    white = M.mat('white', '#f4f4f2'); red = M.mat('red', '#d8141c'); under = M.mat('under', '#e6e6e2', brick=(1.2, 1.2, '#cfcfca', .01)); col = M.mat('col', '#f0f0ee'); gr = M.mat('gr', '#4a4e52')
    M.box(-L / 2, L / 2, 5.0, 5.35, -W / 2, W / 2, under); M.box(-L / 2 - .05, L / 2 + .05, 5.35, 5.95, -W / 2 - .05, W / 2 + .05, red); M.box(-L / 2, L / 2, 5.95, 6.0, -W / 2, W / 2, gr)
    M.box(-L / 2 - .06, L / 2 + .06, 5.0, 5.35, -W / 2 - .06, -W / 2 + .02, white); M.box(-L / 2 - .06, L / 2 + .06, 5.0, 5.35, W / 2 - .02, W / 2 + .06, white)
    for u, v in ((-L / 2 + 2, -W / 2 + 1.6), (L / 2 - 2, -W / 2 + 1.6), (-L / 2 + 2, W / 2 - 1.6), (L / 2 - 2, W / 2 - 1.6)):
        M.box(u - .25, u + .25, 0, 5.0, v - .25, v + .25, col); M.box(u - .35, u + .35, 0, .6, v - .35, v + .35, red)
    M.finish(res=512, quality=74, ao_dist=2.0)

def biedronka():
    M = Model('biedronka'); L, D = 37.5, 42.5; H1, H2 = 3.9, 7.6
    wall = M.mat('wall', '#e9d49c', noise=.05, scale=12); trim = M.mat('trim', '#f6f1e2'); roof = M.mat('roof', '#9e4630', brick=(.32, .3, '#6e2c1e', .02)); glass = M.mat('glass', '#2a3a46'); frame = M.mat('frame', '#4a4e52'); plin = M.mat('plin', '#8f8a80')
    M.box(-L / 2, L / 2, BASE, H2, -D / 2, D / 2, wall); M.box(-L / 2 - .03, L / 2 + .03, BASE, .4, -D / 2 - .03, D / 2 + .03, plin)
    M.box(-L / 2 - .1, L / 2 + .1, H1 - .1, H1 + .15, -D / 2 - .1, D / 2 + .1, trim)
    hip(M, -L / 2, L / 2, -D / 2, D / 2, H2, 4.0, roof, ov=.6)
    # ryzalit z wyższym dachem nad wejściem
    M.box(-5, 5, BASE, H2 + .8, D / 2, D / 2 + 1.0, wall); gable(M, -5, 5, D / 2 - 3, D / 2 + 1.0, H2 + .8, 2.8, roof, ov=.4, along='z')
    M.prism([(-5, H2 + .8, D / 2 + 1.0), (5, H2 + .8, D / 2 + 1.0), (0, H2 + 3.6, D / 2 + 1.0)], (0, 0, -.02), wall)
    # parter: przeszklenia sklepu, piętro: okna zakończone łukiem
    x = -L / 2 + 2.2
    while x < L / 2 - 1.5:
        zf = D / 2 + (1.0 if -5 < x < 5 else 0)
        if not (-1.6 < x < 1.6): M.box(x - 1.3, x + 1.3, .5, H1 - .4, zf, zf + .05, glass); M.box(x - 1.4, x + 1.4, .45, .55, zf, zf + .08, frame)
        n = 8; r = .55; yb = H1 + 1.2
        M.box(x - r, x + r, yb, yb + 1.4, zf, zf + .05, glass)
        pts = [(x + r * math.cos(math.pi * i / n), yb + 1.4 + r * math.sin(math.pi * i / n), zf) for i in range(n + 1)]
        M.prism(pts, (0, 0, .05), glass); M.box(x - r - .12, x + r + .12, yb - .14, yb, zf, zf + .14, trim)
        x += 3.2
    M.box(-1.6, 1.6, 0, H1 - .3, D / 2 + 1.0, D / 2 + 1.06, glass)
    side_windows(M, L, D, H1 + 1.9, 3.6, 1.1, 1.6, frame, glass, sill=trim)
    M.finish(res=1024, quality=72, ao_dist=2.5)

def lidl():
    M = Model('lidl'); L, D, HH = 67.0, 31.5, 6.5
    panel = M.mat('panel', '#d7dade', brick=(1.4, 20, '#b9bdc2', .006)); attic = M.mat('attic', '#9ea4aa', brick=(4, .6, '#7e848a', .01)); glass = M.mat('glass', '#6d8496', noise=.05); mull = M.mat('mull', '#3a3f44')
    steel = M.mat('steel', '#c8ccd0'); canopy = M.mat('canopy', '#e6e8ea'); plin = M.mat('plin', '#6e7276')
    M.box(-L / 2, L / 2, BASE, HH, -D / 2, D / 2, panel); M.box(-L / 2, L / 2, HH, HH + 1.3, -D / 2, D / 2, attic); M.box(-L / 2 - .02, L / 2 + .02, BASE, .3, -D / 2 - .02, D / 2 + .02, plin)
    # narożne przeszklenie (front + bok) i wejście
    gx0, gx1 = -L / 2, -L / 2 + L * .38
    M.box(gx0, gx1, .3, HH - .6, D / 2, D / 2 + .05, glass); x = gx0
    while x <= gx1 + .01: M.box(x - .05, x + .05, .3, HH - .6, D / 2 + .05, D / 2 + .12, mull); x += 1.8
    M.box(gx0, gx1, HH - .7, HH - .6, D / 2 + .05, D / 2 + .12, mull)
    M.box(-L / 2 - .05, -L / 2, .3, HH - .6, D / 2 - 12, D / 2, glass)
    z = D / 2 - 12
    while z <= D / 2: M.box(-L / 2 - .12, -L / 2 - .05, .3, HH - .6, z - .05, z + .05, mull); z += 1.8
    # daszek nad frontem na smukłych słupach
    M.box(-L / 2 - .3, L * .1, HH - .3, HH + .3, D / 2, D / 2 + 4.0, canopy); M.box(-L / 2 - .3, L * .1, HH - .32, HH - .3, D / 2, D / 2 + 4.0, steel)
    x = -L / 2 + 4
    while x < L * .1: M.box(x - .17, x + .17, 0, HH - .3, D / 2 + 3.6, D / 2 + 3.94, steel); M.box(x - .2, x + .2, 0, 1.2, D / 2 + 3.57, D / 2 + 3.97, plin); x += 8
    M.finish(res=1024, quality=72, ao_dist=2.5)

def osrodek():
    """Ośrodek zdrowia i Apteka Magnolia (Szkolna 12): parterowy, żółty, ciemny dach czterospadowy, ganek z daszkiem dwuspadowym,
    czerwony taras ze schodami i czarnymi poręczami, komin z cegły. Front (+z) od strony Szkolnej, obrys jak w OSM (litera L)."""
    M = Model('osrodek'); FL, EH = .95, 3.0; X0, X1, ZB, ZF = -13.2, 12.9, -3.5, 9.3
    wall = M.mat('wall', '#e2b64e', noise=.05, scale=18); red = M.mat('red', '#8e2a26', noise=.06); redt = M.mat('redt', '#7c2a25', brick=(.6, .3, '#5e1f1b', .01))
    roof = M.mat('roof', '#2c2e32', brick=(.36, .3, '#1c1d20', .02)); dark = M.mat('dark', '#26282b'); brn = M.mat('brn', '#5a3a24'); shut = M.mat('shut', '#3b3d40', brick=(4, .07, '#2c2e30', .004))
    pink = M.mat('pink', '#e0e0dc', grad=('#d24a82', '#f0d6e2')); glass = M.mat('glass', '#2c3640'); brick = M.mat('brick', '#8e4a33', brick=(.25, .08, '#6a3424', .01)); iron = M.mat('iron', '#1d1f22'); white = M.mat('white', '#f2f2ee')
    # bryła główna i tylne skrzydło
    M.box(X0, X1, BASE, FL + EH, ZB, ZF, wall); M.box(5.3, 12.2, BASE, FL + EH - .2, -9.3, ZB + .1, wall)
    M.box(X0 - .03, X1 + .03, BASE, FL, ZB - .03, ZF + .03, red); M.box(5.27, 12.23, BASE, FL, -9.33, ZB, red)
    hip(M, X0, X1, ZB, ZF, FL + EH, 2.6, roof, ov=.7); M.box(5.0, 12.5, FL + EH - .2, FL + EH + .15, -9.6, ZB, roof)
    # komin
    M.box(-2.2, -1.4, FL + EH + 1.0, FL + EH + 5.2, 1.5, 2.3, brick); M.box(-2.3, -1.3, FL + EH + 5.2, FL + EH + 5.4, 1.4, 2.4, dark)
    # ganek: daszek dwuspadowy na dwóch słupach, drzwi do przychodni (lewe) i apteki (prawe)
    PC, PW, PD = 2.0, 7.2, 3.0
    gable(M, PC - PW / 2, PC + PW / 2, ZF - 1.2, ZF + PD, FL + EH, 1.5, roof, ov=.3, along='z')
    M.prism([(PC - PW / 2 - .3, FL + EH - .1, ZF + PD + .3), (PC + PW / 2 + .3, FL + EH - .1, ZF + PD + .3), (PC, FL + EH + 1.55, ZF + PD + .3)], (0, 0, -.12), dark)
    for x in (PC - PW / 2 + .35, PC + PW / 2 - .35): M.box(x - .12, x + .12, FL, FL + EH, ZF + PD - .45, ZF + PD - .21, dark)
    M.box(PC - PW / 2, PC + PW / 2, FL + EH - .3, FL + EH, ZF, ZF + PD, dark)
    for x in (PC - 2.1, PC + 2.1):
        M.box(x - .62, x + .62, FL, FL + 2.3, ZF, ZF + .05, brn); M.box(x - .5, x + .5, FL + .9, FL + 2.15, ZF + .05, ZF + .07, glass)
    # okna: brązowe ramy z roletami, różowe plakaty apteki
    for x, mk in ((-11.4, shut), (-8.6, pink), (-5.8, pink), (-3.4, shut), (7.6, shut), (10.8, shut)):
        M.box(x - .72, x + .72, FL + .75, FL + 2.25, ZF, ZF + .05, brn); M.box(x - .6, x + .6, FL + .85, FL + 2.15, ZF + .05, ZF + .07, mk); M.box(x - .8, x + .8, FL + .68, FL + .76, ZF, ZF + .18, white)
    side_windows(M, X1 - X0, ZF - ZB, FL + 1.5, 3.2, 1.2, 1.3, brn, shut)
    # czerwony taras z balustradą i schodami przed gankiem
    TZ = ZF + 3.3; SX0, SX1 = PC - 1.9, PC + 1.9
    M.box(-4.0, X1, BASE, FL, ZF, TZ, redt); M.box(-4.03, X1 + .03, BASE, FL - .05, TZ - .02, TZ + .03, red)
    for k in range(3): M.box(SX0, SX1, BASE, FL - (k + 1) * FL / 3.4, TZ, TZ + (k + 1) * .34, red)
    for x0, x1 in ((-4.0, SX0), (SX1, X1)):
        M.box(x0, x1, FL + .95, FL + 1.0, TZ - .08, TZ - .03, iron); x = x0
        while x < x1: M.box(x, x + .04, FL, FL + .95, TZ - .08, TZ - .04, iron); x += 1.2
    for x in (-4.0, X1): M.box(x - .02, x + .02, FL + .95, FL + 1.0, ZF, TZ, iron); M.box(x - .02, x + .02, FL, FL + 1.0, TZ - .1, TZ - .06, iron)
    for x in (SX0 + .05, SX1 - .05): M.prism([(x, FL + 1.0, TZ - .05), (x, .1 + .9, TZ + 1.05), (x, .1 + .85, TZ + 1.05), (x, FL + .95, TZ - .05)], (.04, 0, 0), iron)
    M.finish(res=1024, quality=72, ao_dist=2.0)

for f in (osrodek, delikatesy, dworzec, mineral, swietlica, orlen_sklep, orlen_wiata, biedronka, lidl):
    if len(sys.argv) < 2 or f.__name__ in sys.argv[1:]: f()
