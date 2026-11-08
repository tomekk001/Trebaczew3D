"""Myjnia przy DK42 (Trębaczew): hala „MYJNIA TIR I OSOBOWE”, dom z balkonem, wiata myjni bezdotykowej + ciężarówki z naczepami.
Układ: x – w prawo patrząc od ulicy, z – w stronę ulicy (+z), y – w górę (grunt = 0). Początek: front styku hali z domem."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
from budynki import gable, gable_ends

GL = {
 'M': ["X...X", "XX.XX", "X.X.X", "X...X", "X...X", "X...X", "X...X"], 'Y': ["X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."],
 'J': ["..XXX", "...X.", "...X.", "...X.", "...X.", "X..X.", ".XX.."], 'N': ["X...X", "XX..X", "X.X.X", "X..XX", "X...X", "X...X", "X...X"],
 'I': ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"], 'A': [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
 'T': ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."], 'R': ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
 'O': [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."], 'S': [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
 'B': ["XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."], 'E': ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
 'W': ["X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"], 'Z': ["XXXXX", "....X", "...X.", "..X..", ".X...", "X....", "XXXXX"],
 'D': ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."], 'K': ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"], ' ': ["     "] * 7}

def text(M, s, xc, y0, z, h, mk, depth=.07):
    """Napis z pikseli (5x7) na płaszczyźnie +z; xc – środek, y0 – dół liter."""
    px = h / 7.0; w = len(s) * 6 * px - px; x = xc - w / 2
    for ch in s:
        g = GL.get(ch, GL[' '])
        for r in range(7):
            c = 0
            while c < 5:
                if g[r][c] == 'X':
                    c2 = c
                    while c2 + 1 < 5 and g[r][c2 + 1] == 'X': c2 += 1
                    ya = y0 + (6 - r) * px
                    M.box(x + c * px, x + (c2 + 1) * px, ya, ya + px, z, z + depth, mk); c = c2 + 1
                else: c += 1
        x += 6 * px

def checker(M, x0, y0, z, n, m, sq, mk_a, mk_b):
    for i in range(n):
        for j in range(m):
            M.box(x0 + i * sq, x0 + (i + 1) * sq, y0 + j * sq, y0 + (j + 1) * sq, z, z + .04, mk_a if (i + j) % 2 == 0 else mk_b)

def ferrari(M, xc, y0, z, s, red, dark, glass):
    """Uproszczona czerwona sportowa sylwetka (mural na ścianie tylnej)."""
    def b_(a, b, c, e, mk): M.box(xc + a * s, xc + b * s, y0 + c * s, y0 + e * s, z, z + .05, mk)
    b_(-1.6, 1.6, .35, .75, red); b_(-1.2, .9, .75, 1.05, red); b_(-.7, .5, 1.05, 1.3, glass); b_(-1.65, -1.2, .35, .6, dark); b_(1.2, 1.65, .35, .55, dark)
    for wx in (-1.0, 1.0): M.box(xc + (wx - .38) * s, xc + (wx + .38) * s, y0 + .1 * s, y0 + .85 * s, z + .05, z + .08, dark)

def hall_house():
    M = Model('myjnia'); BASE = -.3
    wall = M.mat('wall', '#6f7276', noise=.05, scale=30); wall2 = M.mat('wall2', '#8e9194', noise=.05, scale=30); cream = M.mat('cream', '#dad5c8', noise=.04, scale=28); cream2 = M.mat('cream2', '#c7c2b5', noise=.04, scale=28)
    roof = M.mat('roof', '#2b2b30', brick=(.5, .22, '#1a1a1e', .012)); dark = M.mat('dark', '#3b2f2b'); door = M.mat('door', '#4a3a34'); glass = M.mat('glass', '#7d8a94'); gl2 = M.mat('gl2', '#c8d4dc')
    red = M.mat('red', '#d4202a'); white = M.mat('white', '#f4f2ee'); black = M.mat('black', '#18181a'); steel = M.mat('steel', '#a9aeb2'); conc = M.mat('conc', '#8c8c88', noise=.06, scale=18); trim = M.mat('trim', '#262628')
    ch = M.mat('chb', '#111112'); sred = M.mat('sred', '#c9242a'); pale = M.mat('pale', '#e8e6e2'); rbase = M.mat('rbase', '#b8191f')
    # ---- hala „MYJNIA TIR I OSOBOWE”: x -9..0, z -6..6, szczyt od ulicy
    x0, x1, z0, z1 = -9.0, 0.0, -6.0, 6.0; WH = 5.0
    M.box(x0, x1, BASE, WH, z0, z1, wall); M.box(x0, x1, BASE, 1.2, z0 - .03, z1 + .03, wall2)
    M.box(x0 + 1.0, x0 + 1.25, BASE, WH, z1, z1 + .05, wall2); M.box(x1 - 1.25, x1 - 1.0, BASE, WH, z1, z1 + .05, wall2)
    gable(M, x0, x1, z0, z1, WH, 2.3, roof, ov=.7, along='z'); gable_ends(M, x0, x1, z0, z1 + .05, WH, 2.3, wall, along='z')
    M.box(x0 - .75, x1 + .75, WH - .1, WH + .1, z0 - .7, z1 + .75, trim)
    gx0, gx1 = x0 + 1.5, x1 - 1.5; M.box(gx0 - .12, gx1 + .12, BASE, 4.1, z1, z1 + .12, trim); M.box(gx0, gx1, BASE, 4.0, z1 + .1, z1 + .16, door)
    for rr in range(3):
        for cc in range(4):
            xa = gx0 + .25 + cc * (gx1 - gx0 - .5) / 4; xb = xa + (gx1 - gx0 - .5) / 4 - .1; ya = 2.2 + rr * .55
            M.box(xa, xb, ya, ya + .45, z1 + .15, z1 + .19, gl2)
    text(M, 'MYJNIA', (x0 + x1) / 2, WH + .85, z1 + .04, 1.05, red); text(M, 'TIR I OSOBOWE', (x0 + x1) / 2, WH + .1, z1 + .04, .6, red)
    for xx in (x0 + .5, x1 - .5): M.box(xx - .15, xx + .15, 3.5, 3.7, z1, z1 + .35, black)
    # ---- wejście między halą a domem
    M.box(0.0, 1.8, BASE, 3.0, -1.0, 4.2, wall2); M.box(.2, 1.6, BASE, 2.3, 4.2, 4.28, trim); M.box(.35, 1.45, BASE, 2.2, 4.26, 4.3, gl2)
    M.prism([(0.0, 3.0, -1.0), (1.8, 3.0, -1.0), (1.8, 3.0, 4.6), (0.0, 3.0, 4.6)], (0, .25, 0), roof)
    # ---- dom: x 1.8..14, z -5.5..4 (piętro), garaż z balkonem do z=5.7
    hx0, hx1 = 1.8, 14.0; hz0, hz1 = -5.5, 4.0
    M.box(hx0, hx1, BASE, 6.2, hz0, hz1, cream); M.box(hx0, hx1, BASE, .9, hz0 - .03, hz1 + .03, cream2)
    gx0, gx1 = 2.2, 8.4; M.box(gx0, gx1, BASE, 3.4, hz1, hz1 + 1.7, wall2); M.box(gx0 - .15, gx1 + .15, 3.4, 3.65, hz1, hz1 + 2.0, cream2)
    M.box(gx0 + .9, gx0 + 5.2, BASE, 3.0, hz1 + 1.7, hz1 + 1.78, trim); M.box(gx0 + 1.0, gx0 + 5.1, BASE, 2.95, hz1 + 1.75, hz1 + 1.82, door)
    for rr in range(2):
        for cc in range(4):
            xa = gx0 + 1.15 + cc * 1.0; M.box(xa, xa + .85, 1.85 + rr * .6, 2.4 + rr * .6, hz1 + 1.8, hz1 + 1.86, gl2)
    for i in range(0, 9):
        xx = gx0 - .1 + i * (gx1 - gx0 + .3) / 8; M.box(xx - .02, xx + .02, 3.65, 4.55, hz1 + 1.95, hz1 + 1.99, steel)
    M.box(gx0 - .1, gx1 + .2, 3.65, 4.55, hz1 + 1.96, hz1 + 1.98, gl2); M.box(gx0 - .1, gx1 + .2, 4.5, 4.58, hz1 + 1.93, hz1 + 2.0, steel)
    M.box(4.7, 7.3, 3.9, 6.0, hz1, hz1 + .1, dark); M.box(4.85, 7.15, 4.0, 5.9, hz1 + .08, hz1 + .13, glass); M.box(5.95, 6.05, 4.0, 5.9, hz1 + .1, hz1 + .15, dark)
    M.box(9.2, 13.4, BASE, 3.4, hz1, hz1 + .08, glass); M.box(9.2, 13.4, 3.3, 3.5, hz1, hz1 + .12, trim); M.box(9.15, 13.45, BASE, .1, hz1, hz1 + .1, dark)
    M.box(9.5, 12.6, 4.0, 5.4, hz1, hz1 + .06, glass); M.box(9.4, 12.7, 3.95, 4.05, hz1, hz1 + .1, trim); M.box(9.4, 12.7, 5.4, 5.5, hz1, hz1 + .1, trim)
    gable(M, hx0, hx1, hz0, hz1, 6.2, 3.1, roof, ov=.7, along='x'); gable_ends(M, hx0, hx1, hz0, hz1, 6.2, 3.1, cream, along='x')
    gable(M, 3.2, 9.4, -1.0, hz1 + .6, 6.2, 2.5, roof, ov=.5, along='z'); M.prism([(3.2, 6.2, hz1 + .6), (9.4, 6.2, hz1 + .6), (6.3, 8.7, hz1 + .6)], (0, 0, .05), cream)
    M.prism([(3.0, 6.2, hz1 + .66), (9.6, 6.2, hz1 + .66), (6.3, 8.9, hz1 + .66)], (0, 0, .04), trim)
    M.box(2.4, 3.1, 6.2, 10.0, -3.5, -2.8, wall); M.box(2.3, 3.2, 9.9, 10.1, -3.6, -2.7, trim)
    for xx in (10.4, 12.2): M.box(xx, xx + .8, 8.2, 8.9, hz1 + .1, hz1 + .3, gl2)
    # ---- wiata myjni bezdotykowej: x -28..-19, z -3.5..5, wysokość 4.2
    cx0, cx1, cz0, cz1 = -28.0, -19.0, -3.5, 5.0; CH = 4.2
    M.box(cx0 - .5, cx1 + .5, 0, .06, cz0 - .5, cz1 + .7, conc)
    M.box(cx0 - .3, cx1 + .3, CH, CH + .22, cz0 - .3, cz1 + .3, steel)
    for i in range(14): M.box(cx0 - .3 + i * (cx1 - cx0 + .6) / 14, cx0 - .3 + i * (cx1 - cx0 + .6) / 14 + .06, CH + .22, CH + .3, cz0 - .3, cz1 + .3, steel)
    M.box(cx0 - .35, cx1 + .35, CH - .85, CH + .35, cz1 + .3, cz1 + .42, rbase)
    M.box(cx0 - .42, cx0 - .3, CH - .85, CH + .35, cz0 - .3, cz1 + .42, rbase); M.box(cx1 + .3, cx1 + .42, CH - .85, CH + .35, cz0 - .3, cz1 + .42, rbase)
    text(M, 'MYJNIA BEZDOTYKOWA', cx0 + .6 + 3.9, CH - .6, cz1 + .43, .52, white)
    checker(M, cx1 - 1.0, CH - .85, cz1 + .43, 3, 3, .33, black, white)
    for xx, zz in ((cx0, cz0), (cx1, cz0), (cx0, cz1), (cx1, cz1)): M.box(xx - .1, xx + .1, 0, CH, zz - .1, zz + .1, steel)
    M.box(cx0, cx1, 0, CH - .85, cz0 - .1, cz0 + .1, pale); M.box(cx0, cx1, .0, .5, cz0 - .12, cz0 + .12, rbase)
    checker(M, cx0 + .2, 2.6, cz0 + .1, 8, 2, .3, black, white); ferrari(M, cx0 + 2.8, .85, cz0 + .11, 1.1, sred, ch, glass)
    M.box(cx1 - .1, cx1 + .05, 0, CH - .85, cz0 + 2.8, cz1 + .1, pale); M.box(cx1 - .12, cx1 + .07, .0, .45, cz0 + 2.8, cz1 + .1, rbase)
    M.prism([(cx1 + .06, .9, cz1 - 3.5), (cx1 + .06, .9, cz1 - .6), (cx1 + .06, 1.4, cz1 - .9), (cx1 + .06, 1.9, cz1 - 2.0), (cx1 + .06, 1.4, cz1 - 3.3)], (.04, 0, 0), sred)
    M.box(cx1 + .06, cx1 + .1, 1.4, 1.95, cz1 - 2.8, cz1 - 1.2, glass)
    for zz in (cz1 - 2.8, cz1 - 1.0): M.box(cx1 + .06, cx1 + .12, .45, 1.15, zz - .5, zz + .5, ch)
    for i in range(3):
        xa = cx0 + 3.2 + i * 1.35; M.box(xa, xa + 1.2, 0, 2.0, cz0 + .5, cz0 + 1.3, sred); M.box(xa + .15, xa + .95, 1.3, 1.9, cz0 + 1.3, cz0 + 1.34, white); M.box(xa + .15, xa + .95, .3, 1.1, cz0 + 1.3, cz0 + 1.34, rbase)
    M.box(cx0 + 1.8, cx0 + 2.7, 0, 1.4, cz0 + .6, cz0 + 1.1, steel)
    M.cyl(cx0 + 2.5, 0, CH - .2, cz0 + 3.0, .07, mk=steel)
    M.finish(res=1024, ao_dist=2.0)

def wheel(M, x, z0, z1, r, y, mk, n=12):
    M.prism([(x + r * math.cos(2 * math.pi * i / n), y + r * math.sin(2 * math.pi * i / n), z0) for i in range(n)], (0, 0, z1 - z0), mk)

def tir(name, cab_col, cab2, trailer_col, tarp):
    """Ciągnik siodłowy z naczepą (plandeka). x – wzdłuż (przód +x), z – w poprzek, y – w górę od jezdni."""
    M = Model(name); W = 1.25
    cab = M.mat('cab', cab_col, noise=.02); cab2m = M.mat('cab2', cab2); glass = M.mat('glass', '#26313a'); dark = M.mat('dark', '#1d1e20'); steel = M.mat('steel', '#a6abaf'); wh = M.mat('wh', '#141416'); rim = M.mat('rim', '#c3c6c8')
    trl = M.mat('trl', trailer_col, noise=.02); tp = M.mat('tp', tarp, noise=.03, scale=60); orange = M.mat('orange', '#e89a1c'); redl = M.mat('redl', '#b0151b'); lamp = M.mat('lamp', '#f4ecc8')
    M.box(0.2, 7.2, .75, 1.05, -.9, .9, dark)
    M.box(5.0, 7.45, .85, 1.55, -W, W, cab2m); M.box(5.2, 7.35, .85, 1.0, -W - .05, W + .05, dark)
    M.box(5.2, 7.35, 1.5, 3.35, -W, W, cab); M.box(7.34, 7.4, 1.65, 2.35, -.95, .95, dark)
    for i in range(5): M.box(7.36, 7.42, 1.7 + i * .12, 1.76 + i * .12, -.9, .9, steel)
    M.box(7.3, 7.42, 2.55, 3.15, -1.1, 1.1, glass); M.box(5.5, 6.6, 2.2, 3.15, W - .01, W + .03, glass); M.box(5.5, 6.6, 2.2, 3.15, -W - .03, -W + .01, glass)
    M.box(5.0, 5.18, 1.5, 3.3, -W, W, cab2m); M.box(5.0, 6.8, 3.35, 3.9, -W + .1, W - .1, cab); M.box(5.1, 5.2, 3.35, 3.9, -W + .1, W - .1, cab2m)
    for zz in (-1.0, 1.0): M.box(7.36, 7.46, 1.3, 1.5, zz - .22, zz + .22, lamp); M.box(7.2, 7.42, 1.05, 1.25, zz - .3, zz + .3, orange)
    for zz in (-1.0, 1.0): M.cyl(3.0, .6, 1.2, zz * 1.05, .33, mk=steel, seg=10)
    for dx in (6.4, 2.3, 1.0):
        for s in (-1, 1): wheel(M, dx, s * .95 - (.18 if s > 0 else 0), s * .95 + (.18 if s < 0 else 0), .5, .5, wh); wheel(M, dx, s * 1.12 - .02, s * 1.12 + .02, .24, .5, rim)
    M.box(1.0, 3.6, 1.05, 1.15, -.95, .95, dark); M.cyl(2.4, 1.1, 1.35, 0, .45, mk=steel, seg=10)
    tx0, tx1 = -13.6, 2.4
    M.box(tx0, tx1, 1.05, 1.25, -1.25, 1.25, dark); M.box(tx0, tx1, 1.25, 3.9, -1.25, 1.25, tp); M.box(tx0, tx1, 3.9, 4.0, -1.27, 1.27, trl)
    for i in range(0, 17): M.box(tx0 + i, tx0 + i + .06, 1.25, 3.9, -1.28, 1.28, trl)
    M.box(tx0, tx1, 1.25, 1.55, -1.28, 1.28, trl)
    for dx in (-11.3, -9.9, -8.5):
        for s in (-1, 1): wheel(M, dx, s * .95 - (.18 if s > 0 else 0), s * .95 + (.18 if s < 0 else 0), .5, .5, wh); wheel(M, dx, s * 1.12 - .02, s * 1.12 + .02, .24, .5, rim)
    M.box(tx0, tx0 + .25, 1.05, 1.5, -1.2, 1.2, dark)
    for zz in (-1.0, 1.0): M.box(tx0 - .03, tx0 + .02, 1.3, 1.5, zz - .15, zz + .15, redl)
    M.box(tx0 + 3.0, tx0 + 4.4, .45, 1.0, -1.1, -.9, dark)
    M.finish(res=768, ao_dist=2.5)

if __name__ == '__main__':
    todo = sys.argv[1:] or ['myjnia', 'tir_a', 'tir_b', 'tir_c']
    if 'myjnia' in todo: hall_house()
    if 'tir_a' in todo: tir('tir_a', '#f0f0ee', '#2a2c30', '#e8eaec', '#2c64b0')
    if 'tir_b' in todo: tir('tir_b', '#c4221e', '#2a2c30', '#f0efe9', '#d8d8d2')
    if 'tir_c' in todo: tir('tir_c', '#2a5f9e', '#f0f0ee', '#d9dbdc', '#35693a')
