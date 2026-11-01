"""Wspólne narzędzia do modeli Blendera (Trębaczew 3D).
Współrzędne jak w grze: x, y (w górę), z. Blender: bx=x, by=-z, bz=y (eksport glTF z +Y w górę przywraca układ gry)."""
import bpy, bmesh, math, os, random
import numpy as np
OUTDIR = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'models')

class Model:
    def __init__(self, name):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.name = name; self.bm = bmesh.new(); self.mats = {}; self.order = []
    @staticmethod
    def lin(h):
        h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
        return tuple(((v / 12.92) if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c) + (1,)
    def mat(self, key, hexc, noise=0, scale=40, brick=None, grad=None):
        """Materiał proceduralny (wypalany): kolor, szum, cegiełki/listwy (brick=(w,h,mortar_hex)), gradient (grad=(hex1,hex2))."""
        if key in self.mats: return key
        m = bpy.data.materials.new(key); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = .8
        c = self.lin(hexc)
        if brick:
            tc = nt.nodes.new('ShaderNodeTexCoord'); br = nt.nodes.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1
            br.inputs['Brick Width'].default_value = brick[0]; br.inputs['Row Height'].default_value = brick[1]; br.inputs['Mortar Size'].default_value = brick[3] if len(brick) > 3 else .012
            br.inputs['Color1'].default_value = c; br.inputs['Color2'].default_value = tuple(v * .86 for v in c[:3]) + (1,); br.inputs['Mortar'].default_value = self.lin(brick[2])
            nt.links.new(tc.outputs['Object'], br.inputs['Vector']); nt.links.new(br.outputs['Color'], bs.inputs['Base Color'])
        elif grad:
            tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); r = nt.nodes.new('ShaderNodeValToRGB')
            r.color_ramp.elements[0].color = self.lin(grad[0]); r.color_ramp.elements[1].color = self.lin(grad[1]); nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs[2], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bs.inputs['Base Color'])
        elif noise:
            n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 6
            r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = tuple(v * (1 - noise) for v in c[:3]) + (1,); r.color_ramp.elements[1].color = tuple(min(1, v * (1 + noise)) for v in c[:3]) + (1,)
            nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bs.inputs['Base Color'])
        else: bs.inputs['Base Color'].default_value = c
        self.mats[key] = m; return key
    def _faces(self, pts, faces, mk):
        if mk not in self.order: self.order.append(mk)
        vs = [self.bm.verts.new((p[0], -p[2], p[1])) for p in pts]
        for f in faces:
            try: self.bm.faces.new([vs[i] for i in f]).material_index = self.order.index(mk)
            except ValueError: pass
    def box(self, x0, x1, y0, y1, z0, z1, mk):
        p = [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)]
        self._faces(p, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], mk)
    def quad(self, p, mk): self._faces(p, [(0, 1, 2, 3)], mk)
    def tri(self, p, mk): self._faces(p, [(0, 1, 2)], mk)
    def prism(self, p, depth_vec, mk):
        """Bryła z wielokąta p (lista punktów) przesuniętego o wektor depth_vec."""
        n = len(p); q = [(a[0] + depth_vec[0], a[1] + depth_vec[1], a[2] + depth_vec[2]) for a in p]
        faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        self._faces(p + q, faces, mk)
    def cyl(self, x, y0, y1, z, r0, r1=None, seg=8, mk='x', axis='y'):
        r1 = r0 if r1 is None else r1; pts = []; faces = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            if axis == 'y': pts.append((x + r0 * math.cos(a), y0, z + r0 * math.sin(a)))
            else: pts.append((y0, x + r0 * math.cos(a), z + r0 * math.sin(a)))
        for i in range(seg):
            a = 2 * math.pi * i / seg
            if axis == 'y': pts.append((x + r1 * math.cos(a), y1, z + r1 * math.sin(a)))
            else: pts.append((y1, x + r1 * math.cos(a), z + r1 * math.sin(a)))
        for i in range(seg): faces.append((i, (i + 1) % seg, seg + (i + 1) % seg, seg + i))
        faces.append(tuple(range(seg - 1, -1, -1))); faces.append(tuple(range(seg, 2 * seg)))
        self._faces(pts, faces, mk)
    def finish(self, res=512, quality=74, ao_dist=1.0, samples=24, ao_min=.32, bevel=0):
        me = bpy.data.meshes.new(self.name); self.bm.normal_update(); self.bm.to_mesh(me); self.bm.free()
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        for k in self.order: me.materials.append(self.mats[k])
        bpy.context.view_layer.objects.active = ob; ob.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=.0003); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
        if bevel:
            bv = ob.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 1; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50); bpy.ops.object.modifier_apply(modifier='bv')
        me.uv_layers.new(name='bake'); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.002); bpy.ops.uv.pack_islands(margin=.002); bpy.ops.object.mode_set(mode='OBJECT')
        sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.render.bake.margin = 4
        ic = bpy.data.images.new('c', res, res); ia = bpy.data.images.new('a', res, res)
        def target(img):
            for m in self.mats.values():
                n = m.node_tree.nodes.get('BK') or m.node_tree.nodes.new('ShaderNodeTexImage'); n.name = 'BK'; n.image = img; m.node_tree.nodes.active = n
        target(ic); sc.render.bake.use_pass_direct = False; sc.render.bake.use_pass_indirect = False; sc.render.bake.use_pass_color = True
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
        target(ia); sc.world = bpy.data.worlds.new('w'); sc.world.light_settings.distance = ao_dist; bpy.ops.object.bake(type='AO')
        c = np.array(ic.pixels[:]).reshape(-1, 4); a = np.array(ia.pixels[:]).reshape(-1, 4); o = c.copy(); o[:, :3] = np.clip(c[:, :3] * (ao_min + (1 - ao_min) * a[:, :1]), 0, 1)
        io = bpy.data.images.new(self.name + '_tex', res, res); io.pixels[:] = o.ravel(); tmp = '/tmp/%s_tex.jpg' % self.name; io.filepath_raw = tmp; io.file_format = 'JPEG'; io.save()
        fm = bpy.data.materials.new(self.name); fm.use_nodes = True; nt = fm.node_tree; tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(tmp); nt.links.new(tx.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
        me.materials.clear(); me.materials.append(fm)
        for p in me.polygons: p.material_index = 0
        out = os.path.join(OUTDIR, self.name + '.glb'); os.makedirs(OUTDIR, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_image_format='JPEG', export_jpeg_quality=quality)
        print('ok', self.name, os.path.getsize(out), 'tris', sum(len(p.vertices) - 2 for p in me.polygons))
