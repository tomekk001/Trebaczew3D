"""Pociągi: elektryczny zespół trakcyjny (człon czołowy i środkowy) oraz pociąg towarowy Magistrali Węglowej (lokomotywa i węglarka).
Układ: x - wzdłuż toru (przód na +x), y - w górę od główki szyny, z - w poprzek."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
def wheel(M, x, z0, z1, r, y, mk, n=12):
    M.prism([(x + r * math.cos(2 * math.pi * i / n), y + r * math.sin(2 * math.pi * i / n), z0) for i in range(n)], (0, 0, z1 - z0), mk)
def bogie(M, x, mats, half=1.25, r=.46):
    dark, wh = mats; M.box(x - 1.5, x + 1.5, .35, .9, -1.15, 1.15, dark)
    for dx in (-half, half):
        for s in (-1, 1): wheel(M, x + dx, s * .78 - .07 * (s > 0), s * .78 + .07 * (s < 0), r, r, wh)
def emu(cab):
    M = Model('pociag_cab' if cab else 'pociag_mid'); X0, X1 = -10.5, (8.6 if cab else 10.5); W = 1.45
    white = M.mat('white', '#eef0f0', noise=.02); red = M.mat('red', '#d4202a'); yel = M.mat('yel', '#f2c230'); glass = M.mat('glass', '#1e2a33'); grey = M.mat('grey', '#8c9296')
    dark = M.mat('dark', '#2a2c2e'); steel = M.mat('steel', '#5b6064'); door = M.mat('door', '#c9cdd0'); lamp = M.mat('lamp', '#fff6d0')
    M.box(X0, X1, 1.0, 4.0, -W, W, white); M.box(X0, X1, 1.0, 1.55, -W - .02, W + .02, red); M.box(X0 + .1, X1 - .1, 4.0, 4.2, -W + .15, W - .15, grey)
    M.box(X0 + .2, X1 - .2, .7, 1.0, -1.2, 1.2, dark)
    # pas okien z białymi słupkami
    M.box(X0 + 1.2, X1 - (.6 if cab else 1.2), 2.25, 3.25, -W - .02, W + .02, glass); x = X0 + 1.2
    while x < X1 - 1:
        M.box(x - .06, x + .06, 2.25, 3.25, -W - .04, W + .04, white); x += 1.6
    for dx in (-5.6, 3.0):
        M.box(dx - .7, dx + .7, 1.0, 3.45, -W - .05, W + .05, door); M.box(dx - .03, dx + .03, 1.0, 3.45, -W - .07, W + .07, steel); M.box(dx - .55, dx + .55, 2.35, 3.2, -W - .07, W + .07, glass)
    M.box(-2, 1.5, 4.2, 4.5, -.8, .8, steel)
    if cab:
        M.prism([(X1, 1.0, -W), (10.5, 1.0, -W), (10.5, 2.25, -W), (X1, 2.25, -W)], (0, 0, 2 * W), white)
        M.prism([(X1, 1.0, -W - .02), (10.52, 1.0, -W - .02), (10.52, 1.55, -W - .02), (X1, 1.55, -W - .02)], (0, 0, 2 * W + .04), red)
        M.prism([(X1, 2.25, -W + .02), (10.5, 2.25, -W + .02), (9.35, 3.92, -W + .02), (X1, 4.0, -W + .02)], (0, 0, 2 * W - .04), glass)
        M.prism([(X1, 3.9, -W + .1), (9.45, 3.84, -W + .1), (9.3, 4.04, -W + .1), (X1, 4.08, -W + .1)], (0, 0, 2 * W - .2), white)
        M.box(10.5, 10.55, 1.2, 1.5, -.95, -1.2, yel); M.box(10.5, 10.55, 1.75, 1.95, -1.15, -.75, lamp); M.box(10.5, 10.55, 1.75, 1.95, .75, 1.15, lamp)
        M.box(10.0, 10.6, .55, 1.0, -.6, .6, dark)
    bogie(M, X0 + 2.6, (dark, steel)); bogie(M, (X1 if not cab else 10.5) - 2.6, (dark, steel))
    M.finish(res=512, quality=74, ao_dist=1.2)
def loco():
    M = Model('towar_lok'); L = 8.2; W = 1.5
    red = M.mat('red', '#b3262b', noise=.03); yel = M.mat('yel', '#e8c23a'); grey = M.mat('grey', '#7d8286'); glass = M.mat('glass', '#1e2a33'); dark = M.mat('dark', '#26282a'); steel = M.mat('steel', '#55595d'); lamp = M.mat('lamp', '#fff6d0')
    M.box(-L, L, 1.15, 4.0, -W, W, red); M.box(-L - .02, L + .02, 1.7, 2.0, -W - .02, W + .02, yel); M.box(-L + .3, L - .3, 4.0, 4.25, -W + .2, W - .2, grey)
    M.box(-L + .3, L - .3, .8, 1.15, -1.3, 1.3, dark)
    for s in (-1, 1):
        M.box(s * L - (.02 if s > 0 else -.02), s * L + (.02 if s > 0 else -.02), 2.5, 3.5, -1.2, 1.2, glass)
        M.box(s * (L + .03) - .03, s * (L + .03) + .03, 1.4, 1.6, -1.25, -.85, lamp); M.box(s * (L + .03) - .03, s * (L + .03) + .03, 1.4, 1.6, .85, 1.25, lamp)
        M.box(s * L - (.05 if s > 0 else -.05), s * L, .7, 1.15, -.5, .5, dark)
        for k in range(-3, 4): M.box(k * 1.6 - .5, k * 1.6 + .5, 2.6, 3.4, -W - .03, W + .03, grey) if abs(k) < 3 else None
    for x in (-5, 0, 5): M.box(x - .4, x + .4, 4.25, 4.9, -.5, .5, steel)
    for x in (-L + 2.3, 0, L - 2.3): bogie(M, x, (dark, steel), half=1.0, r=.6)
    M.finish(res=512, quality=74, ao_dist=1.2)
def wagon():
    M = Model('towar_wag'); L = 6.5; W = 1.45
    brn = M.mat('brn', '#5e4434', noise=.08); rib = M.mat('rib', '#4a3428'); coal = M.mat('coal', '#1b1b1d', noise=.25, scale=60); dark = M.mat('dark', '#26282a'); steel = M.mat('steel', '#55595d')
    M.box(-L, L, 1.1, 3.5, -W, -W + .12, brn); M.box(-L, L, 1.1, 3.5, W - .12, W, brn); M.box(-L, -L + .12, 1.1, 3.5, -W, W, brn); M.box(L - .12, L, 1.1, 3.5, -W, W, brn); M.box(-L, L, 1.1, 1.3, -W, W, brn)
    x = -L + .9
    while x < L - .5:
        M.box(x - .08, x + .08, 1.1, 3.5, -W - .07, W + .07, rib); x += 1.3
    M.box(-L - .03, L + .03, 3.4, 3.6, -W - .05, W + .05, rib)
    for i in range(7):
        x = -L + 1 + i * (2 * L - 2) / 6; M.prism([(x - 1.0, 3.3, -W + .15), (x + 1.0, 3.3, -W + .15), (x + .2, 3.75, -W + .15), (x - .3, 3.7, -W + .15)], (0, 0, 2 * W - .3), coal)
    M.box(-L + .12, L - .12, 3.0, 3.3, -W + .12, W - .12, coal); M.box(-L + .3, L - .3, .75, 1.1, -1.2, 1.2, dark)
    bogie(M, -L + 1.9, (dark, steel)); bogie(M, L - 1.9, (dark, steel))
    M.finish(res=512, quality=74, ao_dist=1.0)
for f, a in ((emu, True), (emu, False), (loco, None), (wagon, None)):
    f(a) if a is not None else f()
