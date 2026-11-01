"""Wyposażenie sklepów (Lewiatan, Żabka): regał z alkoholem, gondola z artykułami spożywczymi, lodówka z napojami, lada Żabki.
Każdy model: środek tyłu w (0,0,0), front na +z, x – szerokość."""
import sys, os, math, random; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
random.seed(42)
def bottle(M, x, y, z, kind, mats):
    if kind == 'wine':
        c = random.choice(mats['wine']); M.cyl(x, y, y + .2, z, .036, .036, 6, c); M.cyl(x, y + .2, y + .3, z, .036, .013, 6, c); M.cyl(x, y + .3, y + .32, z, .014, .014, 4, mats['cap'])
        M.box(x - .03, x + .03, y + .06, y + .14, z + .033, z + .039, random.choice(mats['label']))
    elif kind == 'vodka':
        M.cyl(x, y, y + .22, z, .034, .034, 6, mats['clear']); M.cyl(x, y + .22, y + .28, z, .034, .014, 6, mats['clear']); M.cyl(x, y + .28, y + .31, z, .016, .016, 4, random.choice(mats['caps']))
        M.box(x - .028, x + .028, y + .05, y + .15, z + .031, z + .037, random.choice(mats['label']))
    else:  # whisky – kanciasta, bursztynowa
        M.box(x - .04, x + .04, y, y + .2, z - .03, z + .03, mats['amber']); M.cyl(x, y + .2, y + .27, z, .02, .016, 4, mats['amber']); M.cyl(x, y + .27, y + .3, z, .02, .02, 4, mats['capB'])
        M.box(x - .035, x + .035, y + .06, y + .13, z + .03, z + .036, random.choice(mats['label']))
def drinks_mats(M):
    return {'wine': [M.mat('w1', '#2f4a2a'), M.mat('w2', '#5a1f24'), M.mat('w3', '#3c2a1e'), M.mat('w4', '#e8e2c0')], 'cap': M.mat('cap', '#7a1c1c'), 'clear': M.mat('clr', '#dfe9ec'),
            'caps': [M.mat('c1', '#e6e6e6'), M.mat('c2', '#1c4fa0'), M.mat('c3', '#c62a24')], 'amber': M.mat('amb', '#a8641e'), 'capB': M.mat('cb', '#1a1a1a'),
            'label': [M.mat('l%d' % i, h) for i, h in enumerate(['#f4f0e4', '#e8d9a8', '#1a1a1a', '#c62a24', '#1c4fa0', '#d4b04a', '#ffffff'])]}

# ---------- regał z alkoholem (jasne drewno) ----------
M = Model('regal_alk'); wood = M.mat('wood', '#cfa877', noise=.08, scale=30); backM = M.mat('back', '#e8d6b6', noise=.04); dm = drinks_mats(M)
W, Hh, Dp = 1.25, 2.35, .42
for x in (-W / 2, W / 2 - .03): M.box(x, x + .03, 0, Hh, 0, Dp, wood)
M.box(-W / 2, W / 2, 0, .12, 0, Dp, wood); M.box(-W / 2, W / 2, Hh - .25, Hh, 0, Dp + .04, wood); M.box(-W / 2 + .03, W / 2 - .03, .12, Hh - .25, 0, .015, backM)
ys = [.12, .5, .86, 1.22, 1.58, 1.94]
for i, y in enumerate(ys):
    if i: M.box(-W / 2 + .03, W / 2 - .03, y - .02, y, 0, Dp, wood)
    kind = ['wine', 'vodka', 'vodka', 'whisky', 'wine', 'vodka'][i]; x = -W / 2 + .08
    while x < W / 2 - .06:
        bottle(M, x, y, Dp - .08, kind, dm); x += .085
M.finish(res=512, quality=74, ao_dist=.5, samples=16)

# ---------- gondola dwustronna z artykułami spożywczymi ----------
M = Model('gondola'); steel = M.mat('steel', '#c9cdd0'); dark = M.mat('dark', '#2c2f33'); price = M.mat('price', '#f2f2ee')
P = [M.mat('p%d' % i, h) for i, h in enumerate(['#d8452a', '#f2c230', '#3a7bd5', '#5aa34a', '#e86aa0', '#f5f5f0', '#ff8c1a', '#7a3b8f', '#2b8f8a', '#8a5a2a', '#c9a227', '#e0e0e0'])]
W, Hh, Dh = 2.0, 1.7, .5
M.box(-W / 2, W / 2, 0, Hh, -.03, .03, steel); M.box(-W / 2, W / 2, 0, .12, -Dh, Dh, dark); M.box(-W / 2, W / 2, Hh - .04, Hh, -.12, .12, steel)
for s in (-1, 1):
    for i, y in enumerate([.12, .5, .88, 1.26]):
        z0, z1 = (0.03, Dh) if s > 0 else (-Dh, -.03)
        if i: M.box(-W / 2, W / 2, y - .025, y, z0, z1, steel)
        M.box(-W / 2, W / 2, y, y + .04, (Dh - .01) * s - .01, (Dh - .01) * s + .01, price)
        x = -W / 2 + .03
        while x < W / 2 - .05:
            k = random.random(); c = random.choice(P); fz = s * (Dh - .05)
            if k < .3:   # puszki/słoiki
                r = random.choice([.035, .04, .05]); n = int(.09 / r)
                M.cyl(x + r, y, y + random.choice([.12, .14, .17]), fz - s * r, r, r, 8, c); x += 2 * r + .01
            else:
                w = random.choice([.06, .08, .1, .14, .2]); hh = random.choice([.14, .18, .22, .28, .32]); d = random.uniform(.18, .3)
                M.box(x, x + w, y, y + min(hh, .34), min(fz, fz - s * d), max(fz, fz - s * d), c); x += w + .008
M.finish(res=512, quality=74, ao_dist=.5, samples=16)

# ---------- lodówka z napojami (podświetlana) ----------
M = Model('lodowka'); white = M.mat('white', '#eef1f2'); inner = M.mat('inner', '#f4f8fb'); frameD = M.mat('frm', '#2a2d30'); glassS = M.mat('gl', '#cfe0e8')
C = [M.mat('d%d' % i, h) for i, h in enumerate(['#c62a24', '#1c1c1c', '#2a7ad5', '#f2a417', '#3aa14a', '#e8e8e8', '#7a2a8a', '#f05a28'])]
W, Hh, Dp = 1.25, 2.1, .78
M.box(-W / 2, W / 2, 0, .12, 0, Dp, frameD); M.box(-W / 2, W / 2, Hh - .2, Hh, 0, Dp, white)
for x in (-W / 2, W / 2 - .05): M.box(x, x + .05, 0, Hh, 0, Dp, white)
M.box(-W / 2, W / 2, .12, Hh - .2, 0, .03, inner)
for i, y in enumerate([.14, .5, .86, 1.22, 1.56]):
    M.box(-W / 2 + .05, W / 2 - .05, y - .015, y, .03, Dp - .05, glassS)
    x = -W / 2 + .1
    while x < W / 2 - .08:
        c = random.choice(C)
        if i in (0, 4):   # puszki
            M.cyl(x, y, y + .12, Dp - .14, .033, .033, 6, c); x += .075
        else:
            M.cyl(x, y, y + .22, Dp - .14, .038, .038, 6, c); M.cyl(x, y + .22, y + .29, Dp - .14, .038, .015, 6, c); x += .085
# rama drzwi szklanych i uchwyt
M.box(-W / 2, W / 2, .12, .16, Dp - .03, Dp, frameD); M.box(-W / 2, W / 2, Hh - .24, Hh - .2, Dp - .03, Dp, frameD)
for x in (-W / 2, -.01, W / 2 - .04): M.box(x, x + .04, .12, Hh - .2, Dp - .03, Dp, frameD)
for x in (-.12, .1): M.box(x - .015, x + .015, .8, 1.5, Dp, Dp + .04, frameD)
M.finish(res=512, quality=74, ao_dist=.5, samples=16, ao_min=.5)

# ---------- lada Żabki: kawa, hot-dogi, witryna z wypiekami ----------
M = Model('lada_zabka'); woodL = M.mat('woodL', '#d9b88f', brick=(.6, 2, '#b9946a', .006)); top = M.mat('top', '#f1f0ec'); led = M.mat('led', '#3cff6e'); black = M.mat('black', '#1d1f21')
steelM = M.mat('steel', '#b9bec2'); glassC = M.mat('gl', '#d6e8ee'); bun = M.mat('bun', '#c98a3e'); bun2 = M.mat('bun2', '#e0b06a'); saus = M.mat('saus', '#a8452a'); cup = M.mat('cup', '#f4f4f0'); screen = M.mat('scr', '#1e8f45'); grill = M.mat('grill', '#3a3d40')
W, Hh, Dp = 3.0, 1.0, .8
M.box(-W / 2, W / 2, .08, Hh, 0, Dp, woodL); M.box(-W / 2 + .05, W / 2 - .05, 0, .08, .05, Dp - .05, black); M.box(-W / 2, W / 2, .02, .05, Dp - .06, Dp - .03, led)
M.box(-W / 2 - .02, W / 2 + .02, Hh, Hh + .05, -.02, Dp + .04, top)
M.box(-W / 2 + .2, -W / 2 + .9, .25, .6, Dp, Dp + .01, grill)   # kratka
# ekspres do kawy
M.box(-1.3, -.8, Hh + .05, Hh + .7, .1, .55, black); M.box(-1.22, -.88, Hh + .45, Hh + .62, .55, .57, screen); M.box(-1.1, -1.0, Hh + .25, Hh + .35, .45, .6, steelM); M.box(-1.22, -.88, Hh + .05, Hh + .08, .4, .6, steelM)
for i in range(4): M.cyl(-.7 + i * .09, Hh + .05, Hh + .17, .25, .04, .045, 8, cup)
# rolki do hot-dogów
M.box(-.3, .35, Hh + .05, Hh + .15, .15, .6, steelM)
for i in range(6): M.cyl(.15 + i * .07, -.27, .32, Hh + .17, .024, .024, 8, saus if i % 2 else grill, axis='x')
# witryna grzewcza z wypiekami
M.box(.5, 1.4, Hh + .05, Hh + .1, .1, .65, steelM); M.box(.5, 1.4, Hh + .5, Hh + .55, .1, .65, steelM)
for x in (.5, 1.36): M.box(x, x + .04, Hh + .1, Hh + .5, .1, .65, steelM)
for r in range(2):
    for i in range(6):
        y = Hh + .1 + r * .2; M.box(.56 + i * .14, .66 + i * .14, y, y + .07, .2, .55, bun if (i + r) % 2 else bun2)
    M.box(.52, 1.38, Hh + .29, Hh + .3, .12, .64, glassC)
# terminal płatniczy
M.box(1.2, 1.35, Hh + .05, Hh + .25, .65, .75, black)
M.finish(res=512, quality=74, ao_dist=.5, samples=16)
