"""Sklep ŚRUBY + stacja LPG (STALPOL) przy ul. Wyzwolenia w Trębaczewie.
Układ: x - w prawo patrząc od ulicy, z - w stronę ulicy (+z), y - w górę (grunt = 0). Początek: środek frontu budynku."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
from myjnia import GL, text
GL.update({'U': ["X...X"] * 6 + [".XXX."], 'L': ["X...."] * 6 + ["XXXXX"], 'P': ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
           'G': [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXX."]})

def main():
    M = Model('lpg'); B = -.2
    navy = M.mat('navy', '#2c3340', noise=.04, scale=30); navy2 = M.mat('navy2', '#3a4252', noise=.04, scale=30); orange = M.mat('orange', '#f08a1c')
    glass = M.mat('glass', '#27303a'); gl2 = M.mat('gl2', '#8f9ca6'); grey = M.mat('grey', '#a4a8aa', noise=.05, scale=24); grey2 = M.mat('grey2', '#8a8e90')
    white = M.mat('white', '#eceae4'); red = M.mat('red', '#c9242a'); blue = M.mat('blue', '#1f5fa8'); steel = M.mat('steel', '#b7bcc0'); black = M.mat('black', '#18181a')
    door = M.mat('door', '#d7dadc'); conc = M.mat('conc', '#8c8c88', noise=.06, scale=18)
    # budynek sklepu: x -7..7, z -4.5..4.5
    x0, x1, z0, z1, H = -7.0, 7.0, -4.5, 4.5, 4.6
    M.box(x0, x1, B, H, z0, z1, navy); M.box(x0 - .1, x1 + .1, H, H + .35, z0 - .1, z1 + .1, navy2)
    for i in range(14): M.box(x0 + i, x0 + i + .05, B, H, z1, z1 + .04, navy2)          # tłoczenia blachy
    M.box(x0, x0 + 6.2, B, 3.3, z1, z1 + .08, navy2)                                      # część z witryną
    M.box(x0 + .4, x0 + 5.8, .3, 2.8, z1 + .06, z1 + .12, glass)                          # szyba
    for i in range(1, 4): M.box(x0 + .4 + i * 1.35 - .03, x0 + .4 + i * 1.35 + .03, .3, 2.8, z1 + .1, z1 + .15, black)
    M.box(x0 + 2.4, x0 + 3.6, B, 2.4, z1 + .1, z1 + .16, door)                            # drzwi
    M.box(x0, x0 + 6.2, 3.3, 4.5, z1 + .02, z1 + .1, orange)                               # pas z napisem
    text(M, 'SRUBY', x0 + 3.1, 3.5, z1 + .1, .9, navy); M.box(x0 + 1.55, x0 + 1.85, 4.45, 4.62, z1 + .1, z1 + .17, navy)
    M.box(x1 - 2.2, x1 - .4, 1.2, 2.2, z1 - .01, z1 + .04, glass)
    # kontener biurowy (szary): x -16..-10
    cx0, cx1, cz0, cz1, ch = -16.0, -10.0, -1.0, 2.4, 2.6
    M.box(cx0, cx1, B, ch, cz0, cz1, grey); M.box(cx0 - .05, cx1 + .05, ch, ch + .1, cz0 - .05, cz1 + .05, grey2); M.box(cx0, cx1, 0, .35, cz0 - .03, cz1 + .03, grey2)
    M.box(cx0 + .6, cx0 + 2.2, 1.0, 2.1, cz1, cz1 + .05, gl2); M.box(cx1 - 1.5, cx1 - .6, 0, 2.1, cz1, cz1 + .05, door)
    M.box(cx1, cx1 + .05, 1.0, 2.1, cz0 + .8, cz1 - .8, gl2)
    # dystrybutor LPG (wolnostojący) + zbiornik poziomy
    px = 9.5; pz = 8.5
    M.box(px - .5, px + .5, 0, .15, pz - .7, pz + .7, conc); M.box(px - .35, px + .35, .15, 1.7, pz - .25, pz + .25, red); M.box(px - .3, px + .3, 1.0, 1.5, pz + .25, pz + .28, black)
    M.box(px - .36, px + .36, 1.7, 1.85, pz - .26, pz + .26, white); M.box(px - .25, px + .25, .8, .95, pz + .25, pz + .3, white)
    M.cyl(1.1, 9.0, 14.0, -2.0, .9, mk=white, seg=14, axis='x'); M.box(9.5, 9.7, 0, .3, -2.6, -1.4, steel); M.box(13.3, 13.5, 0, .3, -2.6, -1.4, steel)
    # tablica LPG na słupie
    M.box(px - 6.0 - .06, px - 6.0 + .06, 0, 3.4, pz + 3.0, pz + 3.12, steel); M.box(px - 6.6, px - 5.4, 2.6, 3.4, pz + 3.12, pz + 3.2, blue)
    text(M, 'LPG', px - 6.0, 2.78, pz + 3.2, .45, white, depth=.04)
    M.finish(res=768, ao_dist=2.5)

if __name__ == '__main__': main()
