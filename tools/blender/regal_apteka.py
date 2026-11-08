"""Regał apteczny z lekami (wnętrze Apteki Magnolia) - generowany w Blenderze.
Uruchomienie: python3 tools/blender/regal_apteka.py  ->  src/models/regal.glb
Układ jak w grze: x - szerokość (2 m), y - w górę, z - do przodu (front regału na +z), środek tyłu w (0,0,0)."""
import bpy, bmesh, math, os, random
random.seed(7)
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'models', 'regal.glb'); RES = 512
W, HT, DP = 2.0, 2.45, .46
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
def B(x, y, z): return (x, -z, y)
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]; return tuple(((v / 12.92) if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c) + (1,)
mats = {}
def M(name, hexc, rough=.7, noise=0):
    if name in mats: return name
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = rough
    if noise:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 60; n.inputs['Detail'].default_value = 6
        n.noise_dimensions = '3D'; r = nt.nodes.new('ShaderNodeValToRGB'); c = lin(hexc); r.color_ramp.elements[0].color = tuple(v * (1 - noise) for v in c[:3]) + (1,); r.color_ramp.elements[1].color = tuple(min(1, v * (1 + noise)) for v in c[:3]) + (1,)
        nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bs.inputs['Base Color'])
    else: bs.inputs['Base Color'].default_value = lin(hexc)
    mats[name] = m; return name
bm = bmesh.new(); order = []
def box(x0, x1, y0, y1, z0, z1, mk):
    if mk not in order: order.append(mk)
    v = [bm.verts.new(B(*p)) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)]]
    for f in [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
        try: bm.faces.new([v[i] for i in f]).material_index = order.index(mk)
        except ValueError: pass
wood = M('wood', '#e9e4da', .6, .04); dark = M('dark', '#6b4a32', .6, .08); back = M('back', '#cfe3d6', .8); knob = M('knob', '#b8b8b2', .3); green = M('green', '#2a9a5a', .5)
t = .03
# korpus: boki, góra, cokół, plecy
for x in (-W / 2, W / 2 - t): box(x, x + t, 0, HT, 0, DP, wood)
box(-W / 2, W / 2, HT - .05, HT, 0, DP + .03, wood); box(-W / 2 + t, W / 2 - t, 0, .1, .03, DP - .02, dark)
box(-W / 2 + t, W / 2 - t, .1, HT - .05, 0, .015, back)
# listwa z zielonym paskiem u góry
box(-W / 2, W / 2, HT - .2, HT - .05, DP, DP + .03, green)
# szuflady (dolna część): 2 rzędy po 5
for r in range(2):
    for c in range(5):
        x0 = -W / 2 + t + c * (W - 2 * t) / 5 + .006; x1 = x0 + (W - 2 * t) / 5 - .012; y0 = .12 + r * .26; y1 = y0 + .24
        box(x0, x1, y0, y1, DP - .02, DP, dark); box((x0 + x1) / 2 - .05, (x0 + x1) / 2 + .05, (y0 + y1) / 2 - .012, (y0 + y1) / 2 + .012, DP, DP + .02, knob)
# blat nad szufladami
box(-W / 2 + t, W / 2 - t, .64, .67, 0, DP + .02, wood)
# półki z lekami
PAL = ['#ffffff', '#f4f4f0', '#d9ecf7', '#fde2e4', '#e3f4dc', '#fff3c4', '#ffe0c2', '#e6e0f5', '#ffffff']
BAND = ['#2a7ad5', '#d8452a', '#2a9a5a', '#f2a417', '#8a4fc0', '#e0457b', '#1aa3a3', '#c62a24']
for i, h in enumerate(PAL): M('pk%d' % i, h, .5)
for i, h in enumerate(BAND): M('bd%d' % i, h, .5)
shelves = [.67, 1.02, 1.37, 1.72, 2.05]
for si, y in enumerate(shelves):
    if si: box(-W / 2 + t, W / 2 - t, y - .02, y, 0, DP - .02, wood)
    top = (shelves[si + 1] - .03) if si + 1 < len(shelves) else HT - .22
    x = -W / 2 + t + .02
    while x < W / 2 - t - .08:
        w = random.choice([.05, .06, .07, .08, .1, .12]); h = min(top - y - .02, random.choice([.1, .12, .14, .16, .2, .24])); d = random.uniform(.12, .2)
        if random.random() < .08: x += w * .7; continue
        n = 1; z0 = DP - .04 - d
        for k in range(n):
            zz = z0 - k * (d + .005)
            if zz < .03: break
            pk = 'pk%d' % random.randrange(len(PAL)); bd = 'bd%d' % random.randrange(len(BAND))
            box(x, x + w, y, y + h, zz, zz + d, pk)
            box(x - .001, x + w + .001, y + h * .55, y + h * .78, zz + d - .002, zz + d + .003, bd)   # kolorowy pasek na froncie
        x += w + .006
me = bpy.data.meshes.new('regal'); bm.normal_update(); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new('regal', me); scene.collection.objects.link(ob)
for k in order: me.materials.append(mats[k])
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
# (bez fazowania - mniej wierzchołków)
me.uv_layers.new(name='bake'); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.002); bpy.ops.uv.pack_islands(margin=.002); bpy.ops.object.mode_set(mode='OBJECT')
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 32; scene.render.bake.margin = 4
ic = bpy.data.images.new('c', RES, RES); ia = bpy.data.images.new('a', RES, RES)
def target(img):
    for m in mats.values():
        n = m.node_tree.nodes.get('BK') or m.node_tree.nodes.new('ShaderNodeTexImage'); n.name = 'BK'; n.image = img; m.node_tree.nodes.active = n
target(ic); scene.render.bake.use_pass_direct = False; scene.render.bake.use_pass_indirect = False; scene.render.bake.use_pass_color = True
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
target(ia); scene.world = bpy.data.worlds.new('w'); scene.world.light_settings.distance = .6; bpy.ops.object.bake(type='AO')
import numpy as np
c = np.array(ic.pixels[:]).reshape(-1, 4); a = np.array(ia.pixels[:]).reshape(-1, 4); o = c.copy(); o[:, :3] = np.clip(c[:, :3] * (.3 + .7 * a[:, :1]), 0, 1)
io = bpy.data.images.new('regal_tex', RES, RES); io.pixels[:] = o.ravel(); io.filepath_raw = '/tmp/regal_tex.jpg'; io.file_format = 'JPEG'; io.save()
fm = bpy.data.materials.new('regal'); fm.use_nodes = True; nt = fm.node_tree; tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load('/tmp/regal_tex.jpg'); nt.links.new(tx.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
me.materials.clear(); me.materials.append(fm)
for p in me.polygons: p.material_index = 0
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_image_format='JPEG', export_jpeg_quality=76)
print('ok', OUT, os.path.getsize(OUT), 'tris', sum(len(p.vertices) - 2 for p in me.polygons))
