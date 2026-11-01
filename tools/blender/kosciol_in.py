"""Wnętrze kościoła w Trębaczewie: wysoka nawa w kształcie litery A z ostrołukowymi żebrami, jasna posadzka z marmuru,
podwyższone prezbiterium ze stopniami z czerwonego marmuru, ołtarz, ambona, ławki. Mural i obrazy dodaje gra.
Wymiary: szerokość 16 m (x), długość 30 m (z, wejście na +z), wysokość 13 m."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
M = Model('kosciol_in')
W, D, WH, AP = 16.0, 30.0, 3.6, 13.0
wallM = M.mat('wall', '#f0ece4', noise=.03, scale=12); rib = M.mat('rib', '#e2dccf'); floor = M.mat('floor', '#d9c8ab', brick=(1.2, 1.2, '#b9a68a', .004))
aisle = M.mat('aisle', '#b98d68', noise=.06); border = M.mat('border', '#9a7656'); step = M.mat('step', '#b8735a', noise=.12, scale=8)
altar = M.mat('altar', '#f5f3ee'); cloth = M.mat('cloth', '#fffdf8'); wood = M.mat('wood', '#7a4a2a', noise=.08, scale=25); woodD = M.mat('woodD', '#5a3520')
lamp = M.mat('lamp', '#fff1c8'); gold = M.mat('gold', '#d4b04a'); back = M.mat('back', '#efe2c8', noise=.05)
h = W / 2
# posadzka, środkowe przejście, obramowanie
M.box(-h, h, -.1, 0, -D / 2, D / 2, floor); M.box(-1.0, 1.0, 0, .005, -D / 2 + 6, D / 2, aisle)
for x in (-1.15, 1.0): M.box(x, x + .15, 0, .006, -D / 2 + 6, D / 2, border)
# ściany boczne (niskie), dach w kształcie A (od środka), ściana wejściowa i ołtarzowa
for s in (-1, 1):
    M.box(s * h - (.3 if s > 0 else 0), s * h + (0 if s > 0 else .3), 0, WH, -D / 2, D / 2, wallM)
    p = [(s * (h - .3), WH, -D / 2), (s * (h - .3), WH, D / 2), (0, AP, D / 2), (0, AP, -D / 2)]
    M.prism(p, (s * .3, .3, 0), wallM)
for z, d in ((-D / 2, .3), (D / 2 - .3, .3)):
    M.prism([(-h, 0, z), (h, 0, z), (h, WH, z), (0, AP, z), (-h, WH, z)], (0, 0, d), back if z < 0 else wallM)
# ostrołukowe żebra co 5 m
z = -D / 2 + 3
while z < D / 2 - 1:
    for s in (-1, 1):
        M.prism([(s * (h - .3), 0, z - .25), (s * (h - .3), WH, z - .25), (0, AP - .2, z - .25), (0, AP - .9, z - .25), (s * (h - 1.1), WH - .2, z - .25), (s * (h - 1.1), 0, z - .25)], (0, 0, .5), rib)
    z += 5
# prezbiterium: 3 stopnie z czerwonego marmuru
for k in range(3):
    M.box(-h + .3, h - .3, 0, .2 * (k + 1), -D / 2 + .3, -D / 2 + 7.2 - k * .55, step)
SY = .6; SZ = -D / 2 + 3.8
# ołtarz z obrusem
M.box(-1.4, 1.4, SY, SY + 1.0, SZ - .5, SZ + .5, altar); M.box(-1.5, 1.5, SY + .98, SY + 1.04, SZ - .6, SZ + .6, cloth); M.box(-1.5, 1.5, SY + .5, SY + 1.0, SZ + .58, SZ + .62, cloth)
# ambona (białe pulpity na nóżce) i krzesła celebransów
M.box(2.9, 3.5, SY, SY + 1.15, SZ + 1.2, SZ + 1.8, altar); M.box(2.8, 3.6, SY + 1.15, SY + 1.22, SZ + 1.1, SZ + 1.9, gold)
for i in range(5):
    x = -h + 2 + i * .75; M.box(x - .25, x + .25, SY, SY + .45, -D / 2 + 1.4, -D / 2 + 1.9, woodD); M.box(x - .25, x + .25, SY + .45, SY + 1.2, -D / 2 + 1.35, -D / 2 + 1.45, woodD)
# ławki: dwa rzędy po 12
z = -D / 2 + 9.2
while z < D / 2 - 3:
    for x0, x1 in ((-h + 1.2, -1.3), (1.3, h - 1.2)):
        M.box(x0, x1, .42, .48, z - .22, z + .22, wood); M.box(x0, x1, .48, 1.0, z + .2, z + .28, wood)
        for x in (x0, x1 - .08): M.box(x, x + .08, 0, 1.02, z - .25, z + .3, woodD)
        M.box(x0, x1, .12, .2, z - .55, z - .4, woodD)
    z += 1.45
# kinkiety na ścianach bocznych
z = -D / 2 + 5.5
while z < D / 2 - 2:
    for s in (-1, 1): M.box(s * (h - .3) - (.12 if s > 0 else 0), s * (h - .3) + (0 if s < 0 else 0) + (.12 if s < 0 else 0), 2.6, 3.0, z - .12, z + .12, lamp)
    z += 5
M.finish(res=1024, quality=72, ao_dist=2.5, samples=24, ao_min=.4)
