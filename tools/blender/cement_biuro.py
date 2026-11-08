"""Biuro Cementowni Warta (czteropiętrowy budynek przy rondzie) wg zdjęcia Street View + tablica przy wjeździe.
Układ: x - w prawo patrząc od frontu, z - przed budynek (+z), y - w górę (grunt = 0). Początek: środek frontu przy gruncie."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import Model
from myjnia import GL, text
GL.update({'C': [".XXX.", "X...X", "X....", "X....", "X....", "X...X", ".XXX."]})

def main():
    M = Model('cement_biuro'); B = -.2
    white = M.mat('white', '#e6e4de', noise=.04, scale=28); lil = M.mat('lil', '#8d93bf', noise=.05, scale=28); lil2 = M.mat('lil2', '#7a80ab', noise=.05, scale=28)
    glass = M.mat('glass', '#2c3744'); frame = M.mat('frame', '#f1f0ec'); roof = M.mat('roof', '#6f7174', noise=.06, scale=20); dark = M.mat('dark', '#2b2d31')
    conc = M.mat('conc', '#9a9893', noise=.07, scale=18); green = M.mat('green', '#4c7a3a'); stone = M.mat('stone', '#8e8a80', noise=.1, scale=14)
    blue = M.mat('blue', '#2a4f9a'); red = M.mat('red', '#c9442a'); steel = M.mat('steel', '#b7bcc0'); flagc = M.mat('flag', '#3a5fa8')
    L, D, FH, NF = 56.0, 13.0, 3.3, 4; x0, x1, z0, z1 = -L/2, L/2, -D/2, D/2; H = NF * FH
    # bryła: parter biały, wyższe piętra pasy fioletowo-niebieskie (podokienniki) i białe
    M.box(x0, x1, B, H, z0, z1, white)
    for f in range(NF):
        y0 = f * FH
        M.box(x0 - .05, x1 + .05, y0 + .0, y0 + 1.05 if f else y0 + 1.0, z0 - .05, z1 + .05, lil if f % 2 == 0 or f == 3 else lil2)          # podokiennik
        M.box(x0 - .05, x1 + .05, y0 + 1.05, y0 + 2.45, z0 - .02, z1 + .02, white)
    # okna (pasy z podziałami), front i tył
    for zz, sg in ((z1, 1), (z0, -1)):
        for f in range(NF):
            y0 = f * FH + 1.12
            nwin = 18
            for i in range(nwin):
                xa = x0 + 1.4 + i * (L - 2.8) / nwin; xb = xa + (L - 2.8) / nwin - .22
                za, zb = (zz + .02, zz + .09) if sg > 0 else (zz - .09, zz - .02)
                M.box(xa, xb, y0, y0 + 1.25, za, zb, glass); M.box(xa - .03, xb + .03, y0 + 1.25, y0 + 1.32, za, zb + (.02 if sg > 0 else -.02) if False else zb, frame)
    # szczyty (białe z pasem) - boki budynku
    for xx, sg in ((x1, 1), (x0, -1)):
        for f in range(NF): M.box(xx if sg < 0 else xx, xx + .06 * sg, f * FH + 1.1, f * FH + 2.3, -2.5, 2.5, glass) if f else None
    # dach + attyka + nadbudówka
    M.box(x0 - .25, x1 + .25, H, H + .45, z0 - .25, z1 + .25, lil); M.box(x0 + 8, x0 + 20, H + .45, H + 2.6, -3, 3, white); M.box(x0 + 8, x0 + 20, H + 2.6, H + 2.8, -3.2, 3.2, roof)
    M.cyl(x1 - 6, H + .45, H + 1.8, -1.5, .5, mk=steel, seg=8); M.cyl(x1 - 8, H + .45, H + 1.4, 1.0, .4, mk=steel, seg=8)
    # wejście: zadaszenie, drzwi, schodki
    ex = x0 + 11
    M.box(ex - 3.0, ex + 3.0, 3.1, 3.4, z1, z1 + 2.8, lil); M.box(ex - 2.6, ex + 2.6, B, 3.1, z1 + .02, z1 + .1, glass); M.box(ex - .06, ex + .06, B, 3.1, z1 + .09, z1 + .12, frame)
    for xs in (-2.9, 2.9): M.box(ex + xs - .08, ex + xs + .08, B, 3.1, z1 + 2.6, z1 + 2.76, steel)
    M.box(ex - 3.2, ex + 3.2, B, .1, z1, z1 + 3.4, conc)
    # żywopłoty i trawnik z przodu
    M.box(x0 + 22, x1 - 1, B, .9, z1 + 1.2, z1 + 2.6, green); M.box(x0 + 1, ex - 4, B, .8, z1 + 1.2, z1 + 2.4, green)
    # maszty z flagami
    for i in range(5):
        fx = x0 + 22 + i * 1.8 - 12 + 24; M.cyl(fx, B, 7.2, z1 + 6.5, .06, mk=steel, seg=6); M.box(fx + .06, fx + .85, 5.6, 7.1, z1 + 6.46, z1 + 6.52, flagc)
    # tablica „WARTA cementownia” przy wjeździe (osobno, z przodu: x +34..+46)
    sx = 40.0; sz = z1 + 14
    M.box(sx - 5.2, sx + 5.2, B, 1.0, sz - .5, sz + .5, stone); M.box(sx - 5.0, sx + 5.0, 1.0, 3.1, sz - .35, sz + .35, white); M.box(sx - 5.2, sx - 4.8, B, 3.3, sz - .5, sz + .5, stone); M.box(sx + 4.8, sx + 5.2, B, 3.3, sz - .5, sz + .5, stone); M.box(sx - 5.2, sx + 5.2, 3.1, 3.4, sz - .5, sz + .5, stone)
    M.box(sx - 4.4, sx - 2.2, 1.35, 2.75, sz + .35, sz + .4, blue); M.box(sx - 3.2, sx - 2.4, 1.9, 2.3, sz + .4, sz + .43, red)
    text(M, 'WARTA', sx + 1.6, 1.9, sz + .35, .85, red, depth=.05); text(M, 'CEMENTOWNIA', sx + 1.6, 1.25, sz + .35, .42, dark, depth=.04)
    M.finish(res=1024, quality=70, ao_dist=3.0)

if __name__ == '__main__': main()
