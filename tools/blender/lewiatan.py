"""Model sklepu Lewiatan (Trębaczew, ul. Szkolna) – generowany w Blenderze.

Uruchomienie:  python3 tools/blender/lewiatan.py   (wymaga: pip install bpy)
Wynik: src/models/lewiatan.glb  (jedna siatka, jedna tekstura z wypalonym AO)

Układ współrzędnych jak w grze (lokalnie względem środka budynku):
  x – wzdłuż frontu (+x = strona ulicy Szkolnej), y – w górę, z – na zewnątrz frontu (+z = parking).
W Blenderze: bx = x, by = -z, bz = y (eksporter glTF zamienia to z powrotem na Y-up).
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'models', 'lewiatan.glb')
RES = int(os.environ.get('LEW_RES', 1024))
L, D, WH = 16.5, 30.0, 3.4          # szerokość frontu, głębokość, wysokość ścian
XS = 0.6                            # granica skrzydeł: zachodnie (szczyt "Marczak") / wschodnie (wejście)
VZ = 17.2                           # front przedsionka z witryną
BASE = -1.2                         # ściany schodzą pod teren (spadki)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def B(x, y, z): return (x, -z, y)    # gra -> Blender

# ---------- materiały proceduralne (wypalane do jednej tekstury) ----------
def mat(name, build):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = .9
    build(nt, bsdf); return m

def col(hexs):
    h = hexs.lstrip('#'); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4)) + (1,)

def lin(c): return tuple(((v / 12.92) if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c[:3]) + (1,)

def m_plaster(base, var=.06, scale=40):
    def b(nt, bs):
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 8
        r = nt.nodes.new('ShaderNodeValToRGB'); c = lin(col(base)); r.color_ramp.elements[0].color = tuple(max(0, v * (1 - var)) for v in c[:3]) + (1,)
        r.color_ramp.elements[1].color = tuple(min(1, v * (1 + var)) for v in c[:3]) + (1,)
        nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bs.inputs['Base Color'])
    return b

def m_flat(base):
    def b(nt, bs): bs.inputs['Base Color'].default_value = lin(col(base))
    return b

def m_tiles(base, mortar, sx, sy):
    # dachówka: rzędy (brick texture) + delikatny szum
    def b(nt, bs):
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, 1)
        br = nt.nodes.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1; br.inputs['Brick Width'].default_value = sx; br.inputs['Row Height'].default_value = sy
        br.inputs['Mortar Size'].default_value = .018; br.offset = .5
        c1 = lin(col(base)); br.inputs['Color1'].default_value = c1; br.inputs['Color2'].default_value = tuple(v * .82 for v in c1[:3]) + (1,)
        br.inputs['Mortar'].default_value = lin(col(mortar))
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], br.inputs['Vector'])
        nt.links.new(br.outputs['Color'], bs.inputs['Base Color'])
    return b

def m_glass():
    def b(nt, bs):
        tc = nt.nodes.new('ShaderNodeTexCoord'); g = nt.nodes.new('ShaderNodeTexGradient'); g.gradient_type = 'DIAGONAL'
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = lin(col('#1b252d')); r.color_ramp.elements[1].color = lin(col('#5d7380'))
        e = r.color_ramp.elements.new(.5); e.color = lin(col('#24323c'))
        nt.links.new(tc.outputs['UV'], g.inputs['Vector']); nt.links.new(g.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bs.inputs['Base Color'])
    return b

M = {
    'wall':   mat('wall', m_plaster('#ede4cf', .03, 80)),
    'plinth': mat('plinth', m_plaster('#a7a196', .12, 18)),
    'roof':   mat('roof', m_tiles('#40454b', '#24272b', .33, .36)),
    'white':  mat('white', m_plaster('#f3f1ec', .03, 20)),
    'brown':  mat('brown', m_flat('#5a3b28')),
    'glass':  mat('glass', m_glass()),
    'metal':  mat('metal', m_flat('#8c9196')),
    'dark':   mat('dark', m_flat('#2f3236')),
    'pv':     mat('pv', m_tiles('#1c2a40', '#9aa6b5', .98, .55)),
    'ridge':  mat('ridge', m_flat('#33373c')),
}
for k, m in M.items(): m['key'] = k

# ---------- geometria ----------
bm_all = bmesh.new()
mat_index = {k: i for i, k in enumerate(M)}
uv_layer = None

def add_faces(verts, faces, mkey):
    vs = [bm_all.verts.new(B(*v)) for v in verts]
    for f in faces:
        try:
            face = bm_all.faces.new([vs[i] for i in f]); face.material_index = mat_index[mkey]
        except ValueError: pass

def box(x0, x1, y0, y1, z0, z1, mkey):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)]
    # kolejność ścian z normalnymi na zewnątrz (w układzie gry, Blender i tak przelicza normalne na końcu)
    add_faces(v, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], mkey)

def quad(p, mkey): add_faces(p, [(0, 1, 2, 3)], mkey)
def tri(p, mkey): add_faces(p, [(0, 1, 2)], mkey)

def slab(p, t, mkey, nrm):
    # płyta o grubości t (do połaci dachu): p – 4 punkty, nrm – wektor odsunięcia
    q = [(a[0] - nrm[0] * t, a[1] - nrm[1] * t, a[2] - nrm[2] * t) for a in p]
    v = p + q
    add_faces(v, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], mkey)

def gable_roof(x0, x1, z0, z1, ye, rise, ov_side, ov_end, t=.22, pv=None):
    """Dach dwuspadowy, kalenica wzdłuż z."""
    xm = (x0 + x1) / 2; hw = (x1 - x0) / 2 + ov_side; yr = ye + rise; drop = rise * ov_side / ((x1 - x0) / 2)
    za, zb = z0 - ov_end, z1 + ov_end
    for s in (-1, 1):
        xe = xm + s * hw; ye2 = ye - drop
        p = [(xm, yr, za), (xm, yr, zb), (xe, ye2, zb), (xe, ye2, za)]
        nx, ny = s * rise, (x1 - x0) / 2; ln = math.hypot(nx, ny); slab(p, t, 'roof', (nx / ln, ny / ln, 0))
        # deska czołowa i rynna
        box(min(xe, xe + s * .05), max(xe, xe + s * .05) + .0001, ye2 - t - .18, ye2 - t + .02, za, zb, 'white')
        gutter(xe + s * .12, ye2 - t - .08, za, zb)
    # gąsior
    box(xm - .14, xm + .14, yr - .02, yr + .12, za, zb, 'ridge')
    # deski wiatrowe na szczytach
    for z in (za, zb):
        for s in (-1, 1):
            xe = xm + s * hw; p0 = (xm, yr + .02, z); p1 = (xe, ye - drop - .02, z)
            beam(p0, p1, .26, .06, 'white')
    return xm, yr

def gutter(x, y, z0, z1):
    n = 8; r = .07
    for i in range(n):
        a0 = math.pi * i / n; a1 = math.pi * (i + 1) / n
        p = [(x + r * math.cos(a0), y - r * math.sin(a0), z0), (x + r * math.cos(a0), y - r * math.sin(a0), z1),
             (x + r * math.cos(a1), y - r * math.sin(a1), z1), (x + r * math.cos(a1), y - r * math.sin(a1), z0)]
        quad(p, 'metal')

def pipe(x, z, y0, y1, r=.055):
    n = 8
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n
        quad([(x + r * math.cos(a0), y0, z + r * math.sin(a0)), (x + r * math.cos(a1), y0, z + r * math.sin(a1)),
              (x + r * math.cos(a1), y1, z + r * math.sin(a1)), (x + r * math.cos(a0), y1, z + r * math.sin(a0))], 'metal')

def beam(p0, p1, h, d, mkey):
    # belka w płaszczyźnie xy (deska wiatrowa)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; ln = math.hypot(dx, dy); nx, ny = -dy / ln * h, dx / ln * h
    z = p0[2]; v = []
    for zz in (z - d, z + d):
        v += [(p0[0], p0[1], zz), (p1[0], p1[1], zz), (p1[0] - nx, p1[1] - ny, zz), (p0[0] - nx, p0[1] - ny, zz)]
    add_faces(v, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], mkey)

def hip_roof(x0, x1, z0, z1, ye, rise, ov, t=.22, hip_end='south'):
    """Dach z naczółkiem: kalenica wzdłuż z, połać trójkątna od południa (strona parkingu)."""
    xm = (x0 + x1) / 2; hw = (x1 - x0) / 2 + ov; yr = ye + rise; drop = rise * ov / ((x1 - x0) / 2)
    ye2 = ye - drop; za = z0 - ov; zb = z1 + ov; zr = zb - hw   # kalenica kończy się przed połacią trójkątną
    for s in (-1, 1):
        xe = xm + s * hw
        p = [(xm, yr, za), (xm, yr, zr), (xe, ye2, zb), (xe, ye2, za)]
        nx, ny = s * rise, (x1 - x0) / 2; ln = math.hypot(nx, ny); slab(p, t, 'roof', (nx / ln, ny / ln, 0))
        box(min(xe, xe + s * .05), max(xe, xe + s * .05) + .0001, ye2 - t - .18, ye2 - t + .02, za, zb, 'white')
        gutter(xe + s * .12, ye2 - t - .08, za, zb)
    # połać trójkątna
    p = [(xm - hw, ye2, zb), (xm + hw, ye2, zb), (xm, yr, zr)]
    v = p + [(a[0], a[1] - t, a[2] - .05) for a in p]
    add_faces(v, [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1)], 'roof')
    box(xm - hw, xm + hw, ye2 - t - .18, ye2 - t + .02, zb, zb + .05, 'white'); gutter(xm, ye2 - t - .08, zb + .1, zb + .1)
    for s in (-1, 1):
        beam((xm, yr + .02, zr), (xm + s * hw, ye2 + .02, zb), .12, .1, 'ridge')
    box(xm - .14, xm + .14, yr - .02, yr + .12, za, zr, 'ridge')
    return xm, yr, zr, hw, ye2

def window(x, y, z, w, h, face):
    """Okno w brązowej ramie; face: '+z', '-z', '+x', '-x' – ściana, na której leży."""
    fr = .09; dep = .06
    if face in ('+z', '-z'):
        s = 1 if face == '+z' else -1
        box(x - w / 2 - fr, x + w / 2 + fr, y - h / 2 - fr, y + h / 2 + fr, z + (0 if s > 0 else -dep), z + (dep if s > 0 else 0), 'brown')
        quad([(x - w / 2, y - h / 2, z + s * (dep + .005)), (x + w / 2, y - h / 2, z + s * (dep + .005)), (x + w / 2, y + h / 2, z + s * (dep + .005)), (x - w / 2, y + h / 2, z + s * (dep + .005))], 'glass')
        box(x - .03, x + .03, y - h / 2, y + h / 2, z, z + s * (dep + .02) if s > 0 else z, 'brown') if s > 0 else None
        box(x - w / 2 - fr - .05, x + w / 2 + fr + .05, y - h / 2 - fr - .07, y - h / 2 - fr, z, z + s * .14 if s > 0 else z, 'white') if s > 0 else box(x - w / 2 - fr - .05, x + w / 2 + fr + .05, y - h / 2 - fr - .07, y - h / 2 - fr, z - .14, z, 'white')
    else:
        s = 1 if face == '+x' else -1
        box(x + (0 if s > 0 else -dep), x + (dep if s > 0 else 0), y - h / 2 - fr, y + h / 2 + fr, z - w / 2 - fr, z + w / 2 + fr, 'brown')
        quad([(x + s * (dep + .005), y - h / 2, z - w / 2), (x + s * (dep + .005), y - h / 2, z + w / 2), (x + s * (dep + .005), y + h / 2, z + w / 2), (x + s * (dep + .005), y + h / 2, z - w / 2)], 'glass')
        box(x + (0 if s > 0 else -.14), x + (.14 if s > 0 else 0), y - h / 2 - fr - .07, y - h / 2 - fr, z - w / 2 - fr - .05, z + w / 2 + fr + .05, 'white')

# --- bryła: skrzydło zachodnie (szczyt "Marczak") i wschodnie (wejście) ---
box(-L / 2, XS, .45, WH, -D / 2, D / 2, 'wall')
box(XS, L / 2, .45, WH, -D / 2, D / 2, 'wall')
box(-L / 2 - .04, L / 2 + .04, BASE, .45, -D / 2 - .04, D / 2 + .04, 'plinth')
# szczyt zachodni (trójkąt ściany frontowej i tylnej)
xm_w = (-L / 2 + XS) / 2; rise_w = 3.5
for z, s in ((D / 2, 1), (-D / 2, -1)):
    tri([(-L / 2, WH, z), (XS, WH, z), (xm_w, WH + rise_w, z)] if s > 0 else [(XS, WH, z), (-L / 2, WH, z), (xm_w, WH + rise_w, z)], 'wall')
gable_roof(-L / 2, XS, -D / 2, D / 2, WH, rise_w, .55, .6)
# dach wschodni z naczółkiem od parkingu
xm_e, yr_e, zr_e, hw_e, ye_e = hip_roof(XS, L / 2, -D / 2, D / 2, WH, 3.0, .5)
tri([(L / 2, WH, -D / 2), (XS, WH, -D / 2), ((XS + L / 2) / 2, WH + 3.0, -D / 2)], 'wall')
# fotowoltaika na połaci wschodniej
run = (L / 2 - XS) / 2 + .5; ang = math.atan2(3.0, run)
for c in range(6):
    for r in range(2):
        z0 = -D / 2 + 3 + c * 1.12
        u0 = .25 + r * .36; u1 = u0 + .32
        def P(u, z): return (xm_e + u * run * 1.0, yr_e + .06 - u * 3.0 * run / run * 1.0, z)
        p = [(xm_e + u0 * run, yr_e + .07 - u0 * 3.0, z0), (xm_e + u0 * run, yr_e + .07 - u0 * 3.0, z0 + 1.05), (xm_e + u1 * run, yr_e + .07 - u1 * 3.0, z0 + 1.05), (xm_e + u1 * run, yr_e + .07 - u1 * 3.0, z0)]
        slab(p, .05, 'pv', (3.0 / math.hypot(3.0, run), run / math.hypot(3.0, run), 0))
for c in range(6):
    for r in range(2):
        z0 = 1.5 + c * 1.12; u0 = .25 + r * .36; u1 = u0 + .32
        p = [(xm_e + u0 * run, yr_e + .07 - u0 * 3.0, z0), (xm_e + u0 * run, yr_e + .07 - u0 * 3.0, z0 + 1.05), (xm_e + u1 * run, yr_e + .07 - u1 * 3.0, z0 + 1.05), (xm_e + u1 * run, yr_e + .07 - u1 * 3.0, z0)]
        if z0 + 1.05 < zr_e - 1: slab(p, .05, 'pv', (3.0 / math.hypot(3.0, run), run / math.hypot(3.0, run), 0))
# przedsionek z witryną (płaski dach, attyka pod żółty szyld)
box(XS, L / 2, BASE, 3.0, D / 2, VZ, 'wall')
box(XS - .25, L / 2 + .35, 3.0, 3.25, D / 2 - .2, VZ + .35, 'white')
box(XS, L / 2 + .02, BASE, .3, VZ - .02, VZ + .06, 'plinth')
# kominy wentylacyjne
box(-5.2, -4.5, WH + 2.2, WH + 4.0, -6.5, -5.8, 'plinth'); box(-5.3, -4.4, WH + 4.0, WH + 4.12, -6.6, -5.7, 'dark')
# okna: front skrzydła zachodniego, boki, tył
window(-6.0, 1.75, D / 2, 1.3, 1.1, '+z')
# (w miejscu drugiego okna – tablica ogłoszeń w grze)
# (szczyt: logo Marczak dodawane w grze)
for z in (-11, -7.2, -3.4, .4, 4.2, 8.0, 11.8):
    window(-L / 2, 1.85, z, 1.35, 1.05, '-x')
for z in (-11, -6.5, -2):
    window(L / 2, 1.85, z, 1.35, 1.05, '+x')
for x in (-5.5, -1.5, 3.5):
    window(x, 1.85, -D / 2, 1.3, 1.05, '-z')
# drzwi zaplecza (tył) i drzwi boczne
box(5.6, 7.0, 0, 2.2, -D / 2 - .06, -D / 2, 'dark'); box(5.5, 7.1, 2.2, 2.3, -D / 2 - .08, -D / 2, 'white')
# rury spustowe
for x, z in ((-L / 2 - .12, D / 2 + .5), (-L / 2 - .12, -D / 2 - .5), (L / 2 + .12, -D / 2 - .4), (XS + .1, D / 2 + .1)):
    pipe(x, z, BASE + .6, WH - .3)
# pilastry narożne (jasne)
for x in (-L / 2, XS, L / 2):
    for z in (-D / 2, D / 2):
        box(x - .12, x + .12, .45, WH, z - .12, z + .12, 'white')

me = bpy.data.meshes.new('lewiatan'); bm_all.normal_update(); bm_all.to_mesh(me); bm_all.free()
ob = bpy.data.objects.new('lewiatan', me); scene.collection.objects.link(ob)
for m in M.values(): me.materials.append(m)
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=.0005); bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
# fazowanie krawędzi (miękkie światło na narożnikach)
bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = .025; bv.segments = 1; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50); bv.harden_normals = True
bpy.ops.object.modifier_apply(modifier='bevel')
bpy.ops.object.shade_auto_smooth(angle=math.radians(35)) if hasattr(bpy.ops.object, 'shade_auto_smooth') else None
for mod in list(ob.modifiers):
    try: bpy.ops.object.modifier_apply(modifier=mod.name)
    except Exception: pass
print('tris', sum(len(p.vertices) - 2 for p in me.polygons))

# ---------- UV atlas + wypalanie ----------
me.uv_layers.new(name='bake')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.004, area_weight=0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.pack_islands(margin=.003, rotate=True)
bpy.ops.object.mode_set(mode='OBJECT')

scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
scene.cycles.samples = 24; scene.render.bake.margin = 6
img_c = bpy.data.images.new('albedo', RES, RES); img_a = bpy.data.images.new('ao', RES, RES)
def target(img):
    for m in M.values():
        nt = m.node_tree; n = nt.nodes.get('BAKE') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'BAKE'; n.image = img
        nt.nodes.active = n
target(img_c); scene.render.bake.use_pass_direct = False; scene.render.bake.use_pass_indirect = False; scene.render.bake.use_pass_color = True
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
# grunt pod AO (zacienienie przy ziemi)
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -0.02)); gp = bpy.context.active_object
for o in scene.objects: o.select_set(False)
ob.select_set(True); bpy.context.view_layer.objects.active = ob
target(img_a); scene.world = bpy.data.worlds.new('w'); scene.world.light_settings.distance = 6
bpy.ops.object.bake(type='AO')
bpy.data.objects.remove(gp)

# mnożenie albedo * AO (z łagodzeniem) i zapis jako JPEG
import numpy as np
c = np.array(img_c.pixels[:]).reshape(-1, 4); a = np.array(img_a.pixels[:]).reshape(-1, 4)
ao = .35 + .65 * a[:, :1]
out = c.copy(); out[:, :3] = np.clip(c[:, :3] * ao, 0, 1)
img_o = bpy.data.images.new('lew_tex', RES, RES); img_o.pixels[:] = out.ravel()
img_o.filepath_raw = '/tmp/lew_tex.jpg'; img_o.file_format = 'JPEG'; scene.render.image_settings.quality = 82; img_o.save()

# jeden materiał z wypaloną teksturą
for m in list(me.materials): pass
fm = bpy.data.materials.new('lewiatan'); fm.use_nodes = True; nt = fm.node_tree; bs = nt.nodes['Principled BSDF']
tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load('/tmp/lew_tex.jpg'); nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
bs.inputs['Roughness'].default_value = .9
me.materials.clear(); me.materials.append(fm)
for p in me.polygons: p.material_index = 0
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_image_format='JPEG', export_jpeg_quality=74, export_texcoords=True, export_normals=True, export_materials='EXPORT')
print('ok', OUT, os.path.getsize(OUT))
