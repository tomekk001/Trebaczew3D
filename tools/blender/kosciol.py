"""Kościół pw. Nawiedzenia NMP w Trębaczewie - bryła wg zdjęć (wysoki trójkątny szczyt z rozetą, kruchta,
taras ze schodami, niższa nawa boczna, skrzydło przy wejściu). Lokalnie: x = oś kościoła (front na -x), z = poprzecznie."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
M = Model('kosciol')
wall = M.mat('wall', '#e6dccb', noise=.04, scale=30); plinth = M.mat('plinth', '#a29b90', noise=.08); roof = M.mat('roof', '#6c4636', brick=(.48, 80, '#4e3125', .02))
edge = M.mat('edge', '#5a3a2c'); glass = M.mat('glass', '#26323d'); frame = M.mat('frame', '#d9d3c7'); white = M.mat('white', '#f4f2ee'); door = M.mat('door', '#4b3326')
iron = M.mat('iron', '#2a2c2e'); step = M.mat('step', '#bdb6aa', noise=.05); blue = M.mat('blue', '#3b6fc4'); plaque = M.mat('plaque', '#3a3430')
B0 = -1.6; U0, U1 = -16.8, 11.0; V0, V1 = -7.4, 7.2; VM = (V0 + V1) / 2; EAVE, RIDGE = 3.2, 17.5
# ---- nawa główna: ściany boczne, szczyty, stromy dach ----
M.box(U0, U1, B0, EAVE, V0, V0 + .35, wall); M.box(U0, U1, B0, EAVE, V1 - .35, V1, wall)
for u, s in ((U0, 1), (U1 - .4, 1)):
    M.prism([(u, B0, V0), (u, B0, V1), (u, EAVE, V1), (u, RIDGE, VM), (u, EAVE, V0)], (.4, 0, 0), wall)
M.box(U0 - .05, U1 + .05, B0, .2, V0 - .05, V1 + .05, plinth)
def slab(p, t, mk):  # płyta dachu: 4 punkty + grubość w dół
    M.prism(p, (0, -t, 0), mk)
ov, ovf = .7, .9
for side in (-1, 1):
    ve = (V0 - ov) if side < 0 else (V1 + ov); ye = EAVE - (RIDGE - EAVE) * ov / ((V1 - V0) / 2)
    slab([(U0 - ovf, RIDGE + .35, VM), (U1 + ovf, RIDGE + .35, VM), (U1 + ovf, ye + .35, ve), (U0 - ovf, ye + .35, ve)], .35, roof)
    # obróbka krawędzi (ciemna listwa przy szczycie)
    for u in (U0 - ovf, U1 + ovf):
        M.prism([(u - .06, RIDGE + .42, VM), (u - .06, ye + .42, ve), (u - .06, ye - .05, ve), (u - .06, RIDGE - .05, VM)], (.12, 0, 0), edge)
M.box(U0 - ovf, U1 + ovf, RIDGE + .3, RIDGE + .5, VM - .18, VM + .18, edge)
# ---- rozeta: ciemne szkło, rama i szprosy ----
RY, RR = 10.6, 2.7; n = 36
pts = [(U0 - .02, RY + RR * math.sin(2 * math.pi * i / n), VM + RR * math.cos(2 * math.pi * i / n)) for i in range(n)]
M.prism(pts, (-.06, 0, 0), glass)
for i in range(n):
    a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
    p = [(U0 - .02, RY + RR * math.sin(a0), VM + RR * math.cos(a0)), (U0 - .02, RY + RR * math.sin(a1), VM + RR * math.cos(a1)), (U0 - .02, RY + (RR + .35) * math.sin(a1), VM + (RR + .35) * math.cos(a1)), (U0 - .02, RY + (RR + .35) * math.sin(a0), VM + (RR + .35) * math.cos(a0))]
    M.prism(p, (-.22, 0, 0), frame)
for k in range(-3, 4):
    M.box(U0 - .2, U0 - .05, RY - RR * math.sqrt(max(0, 1 - (k / 4) ** 2)), RY + RR * math.sqrt(max(0, 1 - (k / 4) ** 2)), VM + k * RR / 4 - .04, VM + k * RR / 4 + .04, frame)
    M.box(U0 - .2, U0 - .05, RY + k * RR / 4 - .04, RY + k * RR / 4 + .04, VM - RR * math.sqrt(max(0, 1 - (k / 4) ** 2)), VM + RR * math.sqrt(max(0, 1 - (k / 4) ** 2)), frame)
# figura Matki Bożej przed rozetą
M.cyl(VM, RY - 1.6, RY - .2, U0 - .5, .38, .2, 10, white); M.cyl(VM, RY - 1.3, RY - .5, U0 - .55, .3, .22, 10, blue)
M.cyl(VM, RY - .2, RY + .1, U0 - .5, .13, .13, 8, white)
# ---- taras, schody, balustrady ----
T = 1.0; TU = U0 - 4.2
M.box(TU, U0, B0, T, V0, V1, step)
for k in range(7):
    y = T - (k + 1) * (T - B0) / 7.5; M.box(TU - (k + 1) * .36, TU - k * .36 + .02, B0, y + (T - B0) / 7.5, VM - 2.3, VM + 2.3, step)
for v in (V0 + .05, V1 - .05):
    M.box(TU, U0, T, T + 1.0, v - .03, v + .03, iron)
for v0, v1 in ((V0, VM - 2.3), (VM + 2.3, V1)):
    M.box(TU - .03, TU + .03, T + .95, T + 1.0, v0, v1, iron)
    vv = v0
    while vv < v1:
        M.box(TU - .02, TU + .02, T, T + 1.0, vv, vv + .03, iron); vv += .14
for v in (VM - 2.3, VM + 2.3):
    M.prism([(TU, T + 1.0, v - .03), (TU - 2.6, B0 + 1.0 + .2, v - .03), (TU - 2.6, B0 + 1.0 + .15, v - .03), (TU, T + .95, v - .03)], (0, 0, .06), iron)
# ---- kruchta: kolumny, daszek dwuspadowy, drzwi ----
PU = U0 - 3.0
for v in (VM - 2.1, VM + 2.1): M.box(PU - .2, PU + .2, T, T + 3.0, v - .2, v + .2, white)
for side in (-1, 1):
    ve = VM + side * 2.7; slab([(PU - .5, T + 4.45, VM), (U0, T + 4.45, VM), (U0, T + 3.2, ve), (PU - .5, T + 3.2, ve)], .2, roof)
M.prism([(PU - .48, T + 3.0, VM - 2.5), (PU - .48, T + 3.0, VM + 2.5), (PU - .48, T + 4.25, VM)], (.25, 0, 0), white)
M.box(PU - .5, U0, T + 2.95, T + 3.15, VM - 2.5, VM + 2.5, white)
M.box(U0 - .1, U0, T, T + 2.7, VM - 1.5, VM + 1.5, door); M.box(U0 - .14, U0 - .1, T, T + 2.7, VM - .03, VM + .03, frame)
M.box(U0 - .12, U0 - .06, T + 2.75, T + 2.95, VM - 1.6, VM + 1.6, plaque)
# ---- nawa boczna (lewa) z dachem pulpitowym i wąskimi oknami ----
A0, A1, AV = -5.6, U1, -14.4
M.box(A0, A1, B0, 5.4, AV, V0, wall); M.box(A0 - .05, A1 + .05, B0, .2, AV - .05, V0, plinth)
slab([(A0 - .5, 7.6, V0), (A1 + .5, 7.6, V0), (A1 + .5, 5.25, AV - .6), (A0 - .5, 5.25, AV - .6)], .25, roof)
M.prism([(A0, 5.4, AV), (A0, 7.4, V0), (A0, 5.4, V0)], (.01, 0, 0), wall); M.prism([(A1, 5.4, AV), (A1, 5.4, V0), (A1, 7.4, V0)], (-.01, 0, 0), wall)
u = A0 + 1.6
while u < A1 - 1:
    M.box(u - .35, u + .35, .6, 4.6, AV - .03, AV, glass); M.box(u - .45, u + .45, .45, .6, AV - .12, AV, frame); u += 2.8
# ---- skrzydło przy wejściu (prawe) ----
W0, W1, WV = U0, -9.9, 14.3
M.box(W0, W1, B0, 4.4, V1, WV, wall); M.box(W0 - .05, W1 + .05, B0, .2, V1, WV + .05, plinth)
for side in (-1, 1):
    ve = (V1 if side < 0 else WV + .5); slab([(W0 - .5, 7.2, (V1 + WV) / 2), (W1 + .5, 7.2, (V1 + WV) / 2), (W1 + .5, 4.25, ve), (W0 - .5, 4.25, ve)], .25, roof)
for u in (W0, W1 - .3): M.prism([(u, 4.4, V1), (u, 4.4, WV), (u, 7.0, (V1 + WV) / 2)], (.3, 0, 0), wall)
for v in (V1 + 2.2, V1 + 4.8):
    M.box(W0 - .03, W0, 1.2, 2.6, v - .6, v + .6, glass)
M.box(W0 - 1.5, W0, T, T + .12, V1, WV, step)
for vv in range(0, 14):
    M.box(W0 - 1.5, W0 - 1.46, T, T + 1.0, V1 + vv * .5, V1 + vv * .5 + .03, iron)
M.box(W0 - 1.52, W0 - 1.44, T + .95, T + 1.0, V1, WV, iron)
# ---- prezbiterium (z tyłu) ----
C0, C1, CV0, CV1 = U1, 16.9, -7.6, 4.6; CM = (CV0 + CV1) / 2
M.box(C0, C1, B0, 6.0, CV0, CV1, wall)
for side in (-1, 1):
    ve = (CV0 - .5) if side < 0 else (CV1 + .5); slab([(C0, 11.2, CM), (C1 + .6, 11.2, CM), (C1 + .6, 5.85, ve), (C0, 5.85, ve)], .25, roof)
M.prism([(C1, 6.0, CV0), (C1, 6.0, CV1), (C1, 11.0, CM)], (-.3, 0, 0), wall)
for v in (CV0 + 2, CV1 - 2): M.box(C1, C1 + .03, 1.5, 4.8, v - .4, v + .4, glass)
M.finish(res=1024, quality=74, ao_dist=3.0, samples=24, ao_min=.38)
