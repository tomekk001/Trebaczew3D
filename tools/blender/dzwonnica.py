"""Wolnostojąca dzwonnica kościoła w Trębaczewie: smukła, z ciemnym pionowym pasem żaluzji, brązowy dach, krzyż."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
M = Model('dzwonnica')
wall = M.mat('wall', '#e6dccb', noise=.04, scale=30); roof = M.mat('roof', '#6c4636', brick=(.4, 80, '#4e3125', .02)); dark = M.mat('dark', '#4a3a30', brick=(3, .22, '#2a221d', .03))
iron = M.mat('iron', '#3c3f42'); plinth = M.mat('plinth', '#a29b90')
S = 2.2; Hh = 27.0
M.box(-S, S, -1.6, Hh, -S, S, wall); M.box(-S - .05, S + .05, -1.6, .3, -S - .05, S + .05, plinth)
for f in range(4):
    for k in (-1, 0, 1) if f < 2 else (0,):
        w = .6 if f < 2 else .45
        if f == 0: M.box(-S - .06, -S, 3 if k == 0 else 18, Hh - 1, k * 1.2 - w / 2, k * 1.2 + w / 2, dark) if k == 0 else M.box(-S - .06, -S, 18, Hh - 1, k * 1.2 - .25, k * 1.2 + .25, dark)
        if f == 1: M.box(S, S + .06, 18, Hh - 1, k * 1.2 - .25, k * 1.2 + .25, dark)
        if f == 2: M.box(-.3, .3, 18, Hh - 1, -S - .06, -S, dark)
        if f == 3: M.box(-.3, .3, 18, Hh - 1, S, S + .06, dark)
# dach pulpitowy (opada do tyłu), mocna krawędź
M.prism([(-S - .4, Hh + 2.4, -S - .4), (-S - .4, Hh + 2.4, S + .4), (S + .4, Hh + .5, S + .4), (S + .4, Hh + .5, -S - .4)], (0, -.3, 0), roof)
M.prism([(-S, Hh, -S), (-S, Hh + 2.2, -S), (S, Hh + .4, -S), (S, Hh, -S)], (0, 0, .01), wall); M.prism([(-S, Hh, S), (S, Hh, S), (S, Hh + .4, S), (-S, Hh + 2.2, S)], (0, 0, -.01), wall)
M.box(-S, -S + .01, Hh, Hh + 2.2, -S, S, wall)
M.box(-.12, .12, Hh + 1.4, Hh + 5.6, -.12, .12, iron); M.box(-.12, .12, Hh + 4.0, Hh + 4.25, -.9, .9, iron)
M.finish(res=512, quality=74, ao_dist=2.0)
