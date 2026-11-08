"""Cementownia Warta - główny ciąg technologiczny (uproszczony, wg zdjęcia lotniczego): hale, piec z wieżą cyklonów, silosy, komin, taśmociągi, hałda węgla.
Układ jak na mapie: x - na wschód, z - na południe, y - w górę; początek = punkt (700,222) zdjęcia lotniczego (1 px = 1,15 m)."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
S = 1.15
def P(u, v): return ((u - 700) * S, (v - 222) * S)

def main():
    M = Model('cement_zaklad'); B = -.3
    g1 = M.mat('g1', '#b4b1a8', noise=.06, scale=26); g2 = M.mat('g2', '#9b9a96', noise=.06, scale=26); tan = M.mat('tan', '#c2b8a0', noise=.06, scale=26)
    wh = M.mat('wh', '#e8e6e0', noise=.04, scale=24); roof = M.mat('roof', '#7b7d80', noise=.07, scale=20); dk = M.mat('dk', '#3c3e42'); rust = M.mat('rust', '#8e5a3e', noise=.1, scale=18)
    coal = M.mat('coal', '#1d1d1f', noise=.12, scale=10); steel = M.mat('steel', '#a7adb2'); stripe = M.mat('stripe', '#c8402e'); gl = M.mat('gl', '#4a5560'); pipe = M.mat('pipe', '#8a9096')
    def box(u0, v0, u1, v1, h, mk, y0=B, parapet=True):
        a = P(u0, v0); b = P(u1, v1); M.box(a[0], b[0], y0, h, a[1], b[1], mk)
        if parapet: M.box(a[0] - .3, b[0] + .3, h, h + .6, a[1] - .3, b[1] + .3, roof)
        return a, b
    def band(u0, v0, u1, v1, y0, y1, mk):
        a = P(u0, v0); b = P(u1, v1); M.box(a[0] - .1, b[0] + .1, y0, y1, a[1] - .1, b[1] + .1, mk)
    def silo(u, v, r, h, mk, dome=True):
        x, z = P(u, v); M.cyl(x, B, h, z, r, mk=mk, seg=18)
        if dome: M.cyl(x, h, h + r * .35, z, r, r * .35, mk=roof, seg=18)
        M.cyl(x, h * .55, h * .58, z, r + .15, mk=stripe, seg=18)
    # hale produkcyjne i magazynowe (lewa część)
    box(480, 228, 640, 268, 15, g1); band(480, 228, 640, 268, 1.2, 4, g2); box(398, 148, 442, 192, 13, g2); box(515, 172, 560, 205, 10, tan)
    box(450, 290, 560, 350, 11, tan)
    # hale na prawo od pieca
    box(960, 60, 1120, 105, 24, g1); band(960, 60, 1120, 105, 20, 23, g2); box(1135, 55, 1215, 100, 22, g2)
    # kompleks pieca i młyna
    box(820, 135, 915, 290, 34, tan); band(820, 135, 915, 290, 30, 33, g2); box(915, 170, 1040, 260, 28, g1); box(1040, 195, 1180, 245, 20, g2)
    box(820, 290, 1010, 330, 14, g1)
    # kolumna pieca (piec obrotowy) - długi walec między budynkami
    x0, z0 = P(920, 205); x1, z1 = P(1030, 205); M.cyl(z0, x0, x1, 3.6, 3.4, mk=rust, seg=12, axis='x') if False else None
    # wieża wymiennika cyklonów
    tx, tz = P(1075, 150)
    M.box(tx - 14, tx + 14, B, 80, tz - 12, tz + 12, g2); M.box(tx - 16, tx + 16, 76, 82, tz - 14, tz + 14, roof)
    for i, yy in enumerate((20, 38, 56, 72)): M.box(tx - 14.4, tx + 14.4, yy, yy + 1.1, tz - 12.4, tz + 12.4, steel)
    for dx in (-8, 8): M.cyl(tx + dx, 55, 90, tz + 15, 4.2, 1.0, seg=10, mk=pipe); M.cyl(tx + dx, 30, 62, tz - 15, 4.2, 1.2, seg=10, mk=pipe)
    # komin
    cx, cz = P(1020, 112); M.cyl(cx, B, 105, cz, 4.2, 2.8, seg=14, mk=g1); M.cyl(cx, 88, 91, cz, 3.5, mk=stripe, seg=14); M.cyl(cx, 98, 101, cz, 3.1, mk=stripe, seg=14)
    # silosy cementu (białe), silos klinkieru (kopuła)
    for (u, v) in ((672, 170), (710, 170)): silo(u, v, 13.5, 38, wh)
    sx, sz = P(877, 292); M.cyl(sx, B, 22, sz, 21, mk=g1, seg=20); M.cyl(sx, 22, 38, sz, 21, 1.5, seg=20, mk=roof)
    for (u, v) in ((560, 330), (600, 330), (640, 330)): silo(u, v, 9, 24, g1)
    # hałda węgla/surowców
    a = P(710, 195); b = P(790, 238); M.box(a[0], b[0], B, 4, a[1], b[1], coal); M.box(a[0] + 8, b[0] - 8, 4, 7, a[1] + 6, b[1] - 6, coal)
    # taśmociągi (galerie) między obiektami
    def gallery(u0, v0, u1, v1, yh):
        a = P(u0, v0); b = P(u1, v1); n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) // 10))
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n; xa = a[0] + (b[0] - a[0]) * t0; za = a[1] + (b[1] - a[1]) * t0; xb = a[0] + (b[0] - a[0]) * t1; zb = a[1] + (b[1] - a[1]) * t1
            ya = yh * (1 - t0) + 8 * t0; yb = yh * (1 - t1) + 8 * t1; w = 1.3
            M.quad([(xa - w, ya, za), (xb - w, yb, zb), (xb + w, yb, zb), (xa + w, ya, za)], pipe); M.quad([(xa - w, ya + 2.4, za), (xb - w, yb + 2.4, zb), (xb + w, yb + 2.4, zb), (xa + w, ya + 2.4, za)], roof)
            M.quad([(xa - w, ya, za), (xa - w, ya + 2.4, za), (xb - w, yb + 2.4, zb), (xb - w, yb, zb)], g2); M.quad([(xa + w, ya, za), (xb + w, yb, zb), (xb + w, yb + 2.4, zb), (xa + w, ya + 2.4, za)], g2)
            if i % 3 == 0: M.box((xa + xb) / 2 - .4, (xa + xb) / 2 + .4, B, (ya + yb) / 2, (za + zb) / 2 - .4, (za + zb) / 2 + .4, steel)
    gallery(790, 225, 820, 190, 8); gallery(640, 250, 480, 250, 9); gallery(1180, 220, 1260, 250, 10)
    # zbiorniki / budynki techniczne
    for (u0, v0, u1, v1, h) in ((930, 270, 975, 300, 12), (1060, 255, 1110, 285, 9), (590, 205, 628, 225, 7), (1190, 140, 1230, 175, 12)):
        box(u0, v0, u1, v1, h, g1)
    M.finish(res=1536, quality=70, ao_dist=6.0)

if __name__ == '__main__': main()
