"""Postać człowieka do gry: części ciała zgodne ze szkieletem z makePerson (tools/blender/postac.py -> src/data_hum.js).
Współrzędne jak w grze (x – w bok, y – w górę, z – do przodu), w metrach. Każda ściana ma „region” (skóra, góra, spodnie, buty, włosy, oczy…),
kolory dobiera gra osobno dla każdej osoby. W wierzchołkach zapisane jest zacienienie (AO) liczone promieniami.
Części: tułów (m/k × tee/jacket/hoodie/coat), głowa z twarzą (m/k), 6 fryzur, ramię, przedramię z dłonią, udo, łydka z butem."""
import bpy, bmesh, math, random, base64, struct, json, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
random.seed(7)
REG = ['skin', 'top', 'topd', 'bot', 'botd', 'shoe', 'sole', 'hair', 'eyew', 'iris', 'lips', 'brow', 'slvU', 'slvF', 'cuff', 'cap', 'capd', 'zip', 'str']
RI = {r: i for i, r in enumerate(REG)}
HY = 1.665
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data_hum.js')

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def sp(x, y, z): return Vector((x, y, z))

class Part:
    """Zbiera prymitywy; każdy ma własny poziom wygładzenia, na końcu wszystko łączone w jeden obiekt."""
    def __init__(self, name): self.name = name; self.objs = []
    def _obj(self, bm, sub=0, solid=0):
        me = bpy.data.meshes.new('m'); bm.normal_update(); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('o', me); bpy.context.scene.collection.objects.link(ob)
        for r in REG:
            mt = bpy.data.materials.get('R_' + r) or bpy.data.materials.new('R_' + r); me.materials.append(mt)
        if solid:
            m = ob.modifiers.new('s', 'SOLIDIFY'); m.thickness = solid; m.offset = -1; m.use_even_offset = True
        if sub:
            m = ob.modifiers.new('ss', 'SUBSURF'); m.levels = sub; m.render_levels = sub
        self.objs.append(ob); return ob
    # --- prymitywy ---
    def loft(self, rings, N, reg, cap0=True, cap1=True, sub=1, axis='y', solid=0, keep=None):
        """rings: (t, a, f, b, cx, cz, p) – przekrój: półszerokość a (oś x), głębokość z przodu f i z tyłu b (oś z), środek (cx,cz), wykładnik superelipsy p.
        reg(t, th, x, z) -> nazwa regionu; keep(t, th) -> czy zostawić ścianę (np. linia włosów)."""
        bm = bmesh.new(); R = []
        for (t, a, f, b, cx, cz, p) in rings:
            ring = []
            for k in range(N):
                th = 2 * math.pi * k / N; c, s = math.cos(th), math.sin(th)
                x = cx + a * math.copysign(abs(c) ** (2 / p), c); d = f if s > 0 else b; z = cz + d * math.copysign(abs(s) ** (2 / p), s)
                ring.append(bm.verts.new((x, t, z)) if axis == 'y' else bm.verts.new((x, z, t)))
            R.append(ring)
        faces = []
        for i in range(len(R) - 1):
            for k in range(N):
                k2 = (k + 1) % N; tm = (rings[i][0] + rings[i + 1][0]) / 2; thm = 2 * math.pi * (k + .5) / N
                if keep and not keep(tm, thm): continue
                f = bm.faces.new((R[i][k], R[i][k2], R[i + 1][k2], R[i + 1][k]) if rings[i + 1][0] < rings[i][0] else (R[i][k2], R[i][k], R[i + 1][k], R[i + 1][k2]))
                vs = [v.co for v in f.verts]; mx = sum(v.x for v in vs) / 4; mz = sum(v.z for v in vs) / 4
                f.material_index = RI[reg(tm, thm, mx, mz)]
        down = rings[-1][0] < rings[0][0]
        for idx, cap in ((0, cap0), (len(R) - 1, cap1)):
            if not cap: continue
            t, a, f, b, cx, cz, p = rings[idx]; dt = (rings[idx][0] - rings[idx + (1 if idx == 0 else -1)][0]); c = bm.verts.new((cx, t + dt * .35, cz) if axis == 'y' else (cx, cz, t + dt * .35))
            for k in range(N):
                k2 = (k + 1) % N; first = (idx == 0)
                vv = (R[idx][k], R[idx][k2], c) if (first != down) else (R[idx][k2], R[idx][k], c)
                try:
                    fc = bm.faces.new(vv); fc.material_index = RI[reg(t, 2 * math.pi * (k + .5) / N, cx, cz)]
                except ValueError: pass
        # normalne na zewnątrz osi bryły (działa też dla otwartych powłok, np. włosów)
        tot = 0
        for f in bm.faces:
            c = f.calc_center_median(); ax = Vector((rings[0][4], c.y, rings[0][5])) if axis == 'y' else Vector((rings[0][4], rings[0][5], c.z)); tot += f.normal.dot(c - ax)
        if tot < 0:
            for f in bm.faces: f.normal_flip()
        return self._obj(bm, sub, solid)
    def ell(self, c, r, reg, seg=10, rings=6, rot=None, sub=0):
        bm = bmesh.new(); m = Matrix.Translation(Vector(c)) @ (rot or Matrix.Identity(4)) @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1, matrix=m)
        for f in bm.faces: f.material_index = RI[reg]
        return self._obj(bm, sub)
    def hull(self, pts, reg, sub=1):
        bm = bmesh.new(); vs = [bm.verts.new(p) for p in pts]; res = bmesh.ops.convex_hull(bm, input=vs)
        for g in set(res.get('geom_interior', []) + res.get('geom_unused', [])):
            if isinstance(g, bmesh.types.BMVert) and g.is_valid and not g.link_faces: bm.verts.remove(g)
        for f in bm.faces: f.material_index = RI[reg]
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self._obj(bm, sub)
    def capsule(self, p0, p1, r0, r1, reg, N=8, n=3):
        """walec z zaokrąglonymi końcami między p0 i p1 (np. palec)."""
        p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length; q = d.normalized().to_track_quat('Y', 'Z')
        M = Matrix.Translation(p0) @ q.to_matrix().to_4x4()
        rings = [(-r0 * .55, r0 * .55, r0 * .55, r0 * .55, 0, 0, 2)] + [(L * i / n, r0 + (r1 - r0) * i / n,) * 1 + (r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * i / n, 0, 0, 2) for i in range(n + 1)] + [(L + r1 * .55, r1 * .55, r1 * .55, r1 * .55, 0, 0, 2)]
        ob = self.loft(rings, N, lambda *a: reg, sub=0); ob.data.transform(M); return ob
    def export(self, target=None, ao_dist=.09, ao_rays=28):
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.objs: o.select_set(True)
        bpy.context.view_layer.objects.active = self.objs[0]
        for o in self.objs:
            bpy.context.view_layer.objects.active = o
            for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.context.view_layer.objects.active = self.objs[0]; bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        if target and tris > target:  # uproszczenie siatki do budżetu trójkątów; granice kolorów i drobne elementy twarzy zostają nietknięte
            prot = {RI[r] for r in ('eyew', 'iris', 'capd', 'brow', 'lips', 'str', 'zip')}; me = ob.data; vg = ob.vertex_groups.new(name='dec'); w = {}
            for f in me.polygons:
                for v in f.vertices: w.setdefault(v, set()).add(f.material_index)
            for v, ms in w.items(): vg.add([v], 0.0 if (len(ms) > 1 or ms & prot) else 1.0, 'REPLACE')
            d = ob.modifiers.new('d', 'DECIMATE'); d.ratio = target / tris; d.use_collapse_triangulate = True; d.vertex_group = 'dec'; d.vertex_group_factor = 1.0; bpy.ops.object.modifier_apply(modifier='d')
        bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces); bm.normal_update()
        for f in bm.faces: f.smooth = True
        bvh = BVHTree.FromBMesh(bm)
        dirs = []
        for i in range(ao_rays):  # kierunki na półsferze (rozkład cosinusowy)
            u, v = (i + .5) / ao_rays, (i * 0.618034) % 1; r = math.sqrt(u); a = 2 * math.pi * v; dirs.append((r * math.cos(a), r * math.sin(a), math.sqrt(1 - u)))
        ao = {}
        for v in bm.verts:
            n = v.normal; t = n.orthogonal().normalized(); b2 = n.cross(t); hit = 0
            for (dx, dy, dz) in dirs:
                d = (t * dx + b2 * dy + n * dz).normalized(); loc, nn, idx, dist = bvh.ray_cast(v.co + n * .0015, d, ao_dist)
                if loc is not None: hit += 1 - (dist / ao_dist) * .5
            ao[v.index] = max(0.0, 1 - hit / ao_rays)
        verts = {}; P = []; Nn = []; Rg = []; A = []; I = []
        for f in bm.faces:
            tri = []
            for v in f.verts:
                key = (v.index, f.material_index)
                if key not in verts:
                    verts[key] = len(P); P.append(tuple(v.co)); Nn.append(tuple(v.normal)); Rg.append(f.material_index); A.append(ao[v.index])
                tri.append(verts[key])
            I.append(tri)
        bm.free()
        def pack(P, Nn, I):
            n = len(P); pad = lambda x: x + b'\0' * (-len(x) % 4)
            g = pad(b''.join(struct.pack('<hhh', *[max(-32767, min(32767, round(c * 1000))) for c in p]) for p in P))
            g += pad(b''.join(struct.pack('<bbb', *[max(-127, min(127, round(c * 127))) for c in q]) for q in Nn))
            g += pad(bytes(Rg) + bytes(max(0, min(255, round(a * 255))) for a in A))
            g += b''.join(struct.pack('<HHH', *t) for t in I)
            return {'n': n, 'i': len(I) * 3, 'g': base64.b64encode(g).decode()}
        out = {self.name: pack(P, Nn, I)}
        print('ok', self.name, len(P), 'wierzch.', len(I), 'trójk.')
        bpy.data.objects.remove(ob)
        return out

# ---------------- ciało ----------------
SEXES = {
    'm': dict(T=[(.84, .10, .07, .08, 0, 0, 2.2), (.88, .155, .09, .105, 0, 0, 2.3), (.94, .168, .095, .118, 0, -.005, 2.4), (1.00, .166, .095, .112, 0, -.004, 2.4), (1.06, .154, .093, .1, 0, 0, 2.4),
               (1.12, .15, .096, .095, 0, .004, 2.5), (1.20, .158, .104, .095, 0, .008, 2.5), (1.28, .17, .115, .1, 0, .01, 2.6), (1.35, .18, .12, .104, 0, .008, 2.6), (1.41, .188, .108, .106, 0, 0, 2.7),
               (1.46, .178, .088, .1, 0, -.006, 2.6), (1.50, .12, .07, .08, 0, -.012, 2.2), (1.535, .07, .056, .06, 0, -.012, 2.0)],
              neck=.052, head=[(-.125, .03, .045, .02, 0, .035, 2), (-.112, .052, .075, .035, 0, .012, 2.1), (-.09, .068, .088, .055, 0, .004, 2.2), (-.065, .079, .097, .072, 0, 0, 2.3),
                               (-.04, .085, .102, .085, 0, -.002, 2.3), (-.015, .089, .104, .095, 0, -.004, 2.3), (.012, .092, .103, .1, 0, -.006, 2.3), (.04, .094, .1, .104, 0, -.008, 2.3),
                               (.068, .092, .092, .104, 0, -.01, 2.3), (.094, .083, .076, .095, 0, -.012, 2.2), (.114, .062, .052, .07, 0, -.012, 2.1), (.128, .03, .024, .034, 0, -.012, 2)],
              lips=(.019, .0058), brow=.0065),
    'f': dict(T=[(.84, .105, .07, .085, 0, 0, 2.2), (.88, .165, .09, .115, 0, 0, 2.3), (.94, .18, .095, .127, 0, -.006, 2.4), (1.00, .172, .092, .118, 0, -.005, 2.4), (1.06, .148, .088, .098, 0, 0, 2.4),
               (1.12, .132, .088, .088, 0, .003, 2.4), (1.20, .14, .098, .088, 0, .006, 2.5), (1.26, .152, .118, .092, 0, .01, 2.6), (1.32, .158, .128, .095, 0, .012, 2.7), (1.37, .162, .116, .096, 0, .006, 2.7), (1.41, .166, .098, .097, 0, 0, 2.6),
               (1.45, .158, .082, .093, 0, -.006, 2.5), (1.49, .108, .066, .074, 0, -.011, 2.2), (1.525, .064, .052, .056, 0, -.011, 2.0)],
              neck=.046, head=[(-.12, .028, .042, .02, 0, .032, 2), (-.108, .048, .07, .035, 0, .01, 2.1), (-.088, .063, .085, .054, 0, .003, 2.2), (-.064, .075, .094, .07, 0, 0, 2.3),
                               (-.04, .082, .099, .082, 0, -.002, 2.3), (-.015, .086, .101, .092, 0, -.004, 2.3), (.012, .089, .1, .097, 0, -.006, 2.3), (.04, .09, .097, .1, 0, -.008, 2.3),
                               (.068, .088, .089, .1, 0, -.01, 2.3), (.094, .08, .073, .092, 0, -.012, 2.2), (.114, .06, .05, .068, 0, -.012, 2.1), (.126, .03, .024, .033, 0, -.012, 2)],
              lips=(.018, .0065), brow=.0042),
}

def ring_at(T, t, grow=0):
    """pierścień przekroju na wysokości t (interpolacja) – dodatkowe pierścienie wyznaczają proste granice kolorów."""
    for a, b in zip(T, T[1:]):
        if a[0] <= t <= b[0]:
            k = (t - a[0]) / (b[0] - a[0]); r = tuple(a[i] + (b[i] - a[i]) * k for i in range(7)); return (t, r[1] + grow, r[2] + grow, r[3] + grow) + r[4:]
    return T[-1]

def torso(sex, style):
    S = SEXES[sex]; P = Part('torso_%s_%s' % (sex, style)); coat = style == 'coat'
    def reg(t, th, x, z):
        s = math.sin(th)
        if t < 1.02 and not coat: return 'bot'
        if style == 'tee' and t > 1.497: return 'skin'
        if style in ('jacket', 'coat') and s > .9 and abs(x) < .009: return 'zip' if style == 'jacket' else 'topd'
        if style in ('jacket', 'hoodie') and 1.02 <= t < 1.055: return 'topd'
        return 'top'
    T = sorted(S['T'] + [ring_at(S['T'], 1.012), ring_at(S['T'], 1.028, .007 if not coat else 0), ring_at(S['T'], 1.49), ring_at(S['T'], 1.504)], key=lambda r: r[0])
    P.loft(T, 14, reg, sub=1)
    # szyja
    nk = S['neck']; P.loft([(1.49, nk + .004, nk + .004, nk + .006, 0, -.01, 2), (1.55, nk, nk, nk + .004, 0, -.012, 2), (1.625, nk - .004, nk - .004, nk, 0, -.014, 2)], 12, lambda *a: 'skin', False, False, sub=1)
    if style == 'jacket':  # stójka
        P.loft([(1.485, .082, .072, .085, 0, -.012, 2.2), (1.56, .072, .062, .078, 0, -.016, 2.2)], 16, lambda t, th, x, z: 'topd', False, False, sub=1, solid=.006, keep=lambda t, th: math.sin(th) < .93)
    if style == 'hoodie':  # kaptur zwinięty na plecach, kieszeń kangurka, sznurki
        P.ell((0, 1.515, -.085), (.125, .06, .07), 'top', 16, 10, sub=1)
        P.loft([(1.49, .085, .074, .085, 0, -.012, 2.2), (1.53, .072, .06, .074, 0, -.016, 2.2)], 16, lambda *a: 'topd', False, False, sub=1, solid=.006)
        fz = lambda y: .006 + (.096 if y < 1.16 else .1)
        P.hull([(sx * w, y, fz(y) + dz) for sx in (-1, 1) for (w, y, dz) in ((.12, 1.07, .0), (.12, 1.07, .012), (.09, 1.19, .0), (.09, 1.19, .01))], 'topd', sub=0)
        for sx in (-1, 1): P.capsule((sx * .03, 1.49, .075), (sx * .034, 1.36, .1), .0045, .004, 'str', 6, 2)
    if coat:  # poła płaszcza do kolan, guziki, wyłożony kołnierz
        T = S['T']; P.loft([(1.02, T[4][1] + .012, T[4][2] + .01, T[4][3] + .012, 0, 0, 2.4), (.92, T[2][1] + .016, T[2][2] + .012, T[2][3] + .014, 0, -.005, 2.4), (.78, T[2][1] + .03, .115, .135, 0, -.006, 2.4), (.64, T[2][1] + .045, .125, .145, 0, -.006, 2.4)], 18,
                           lambda t, th, x, z: 'topd' if math.sin(th) > .97 else 'top', False, False, sub=1, solid=.008)
        for y in (1.3, 1.2, 1.1, .98, .86): P.ell((.03, y, .118 if y > 1.15 else .112), (.009, .009, .005), 'topd', 8, 6)
        P.loft([(1.43, .14, .1, .1, 0, -.004, 2.3), (1.505, .09, .075, .086, 0, -.012, 2.2), (1.55, .085, .07, .08, 0, -.016, 2.2)], 18, lambda *a: 'topd', False, False, sub=1, solid=.007, keep=lambda t, th: math.sin(th) < .85)
    if style == 'tee':
        P.loft([(1.495, .073, .066, .072, 0, -.012, 2.1), (1.505, .072, .064, .071, 0, -.012, 2.1)], 16, lambda *a: 'top', False, False, sub=0, solid=.004)
    return P.export(1150 if sex == 'm' else 1250)

def head(sex):
    S = SEXES[sex]; P = Part('head_' + sex); k = 1.0
    P.loft([(HY + r[0], r[1], r[2], r[3], r[4], r[5], r[6]) for r in S['head']], 16, lambda *a: 'skin', sub=1)
    zf = lambda dy: next(r[2] for r in S['head'] if r[0] >= dy) - .006
    for sx in (-1, 1):
        ex = sx * .033; ey = HY + .012; ez = zf(.012) - .006
        P.ell((ex, ey, ez), (.0145, .0098, .0088), 'eyew', 12, 8)
        P.ell((ex, ey, ez + .0058), (.0076, .0076, .0036), 'iris', 12, 6)
        P.ell((ex, ey, ez + .0078), (.0032, .0032, .0018), 'capd', 8, 4)
        if sex == 'f': P.ell((ex, ey + .0085, ez + .0035), (.0165, .0022, .0095), 'capd', 12, 4)
        P.ell((ex, ey + .0068, ez + .0012), (.0165, .006, .0102), 'skin', 12, 6, sub=0)     # powieka górna
        P.ell((ex, ey - .0072, ez + .0005), (.0145, .0032, .0085), 'skin', 12, 6, sub=0)     # powieka dolna
        P.hull([(sx * .016, HY + .036, zf(.036) + .004), (sx * .05, HY + .04, zf(.04) - .004), (sx * .034, HY + .044, zf(.044) + .004), (sx * .016, HY + .036 + S['brow'] * 1.4, zf(.036) + .002),
                (sx * .05, HY + .04 + S['brow'] * .6, zf(.04) - .005), (sx * .034, HY + .044 + S['brow'], zf(.044) + .001)], 'brow', sub=0)
        P.ell((sx * (S['head'][6][1] + .001), HY - .002, -.008), (.009, .026, .016), 'skin', 12, 8, rot=Matrix.Rotation(sx * -.3, 4, 'Y'), sub=0)  # uszy
    nz = zf(-.02) + .006; ns = .95 if sex == 'f' else 1.0
    P.hull([(0, HY + .032, zf(.032) + .002), (-.007, HY + .025, zf(.025) + .002), (.007, HY + .025, zf(.025) + .002), (0, HY - .016, nz + .022 * ns), (-.017 * ns, HY - .028, nz), (.017 * ns, HY - .028, nz),
            (0, HY - .033, nz + .012 * ns), (-.008, HY - .034, nz + .006), (.008, HY - .034, nz + .006)], 'skin', sub=1)
    for sx in (-1, 1): P.ell((sx * .0135 * ns, HY - .027, nz + .003), (.0085, .0075, .0085), 'skin', 10, 6)  # skrzydełka nosa
    lw, lt = S['lips']; lz = zf(-.05) + .002
    P.ell((0, HY - .046, lz), (lw, lt * .8, .008), 'lips', 14, 6, sub=0)
    P.ell((0, HY - .055, lz - .002), (lw * .9, lt, .008), 'lips', 14, 6, sub=0)
    return P.export(1350)

def hair(style, sex='m'):
    S = SEXES[sex]; P = Part('hair_' + style); H = S['head']
    def grow(off, extra_low=None, flat_below=None):
        rings = []
        for r in H[2:]:
            rings.append((HY + r[0], r[1] + off, r[2] + off, r[3] + off, r[4], r[5], r[6]))
        if extra_low:
            base = H[5]
            for dy in extra_low: rings.insert(0, (HY + dy, base[1] + off, base[2] + off * .5, base[3] + off, 0, -.004, 2.3))
        return rings
    def lim(th, front, side, back):
        s = math.sin(th); return side + (front - side) * s if s > 0 else side + (back - side) * (-s)
    if style in ('short', 'buzz'):
        off = .011 if style == 'short' else .004
        P.loft(grow(off), 22, lambda *a: 'hair', cap0=False, sub=1, solid=.007, keep=lambda t, th: t - HY > lim(th, .062, .028, -.07))
        if style == 'short':  # trochę objętości na czubku
            P.ell((0, HY + .095, .01), (.085, .045, .09), 'hair', 14, 8, sub=1)
    elif style == 'bob':
        P.loft(grow(.019, [-.07, -.05, -.03]), 22, lambda *a: 'hair', cap0=False, sub=1, solid=.008, keep=lambda t, th: t - HY > lim(th, .058, -.075, -.075) and not (math.sin(th) > .55 and t - HY < .045))
    elif style == 'long':
        P.loft(grow(.016, [-.26, -.2, -.14, -.08, -.04]), 22, lambda *a: 'hair', cap0=False, sub=1, solid=.009,
               keep=lambda t, th: t - HY > lim(th, .06, -.26, -.26) and not (math.sin(th) > .35 and t - HY < .03) and not (math.sin(th) > -.1 and t - HY < -.11))
    elif style == 'pony':
        P.loft(grow(.009), 22, lambda *a: 'hair', cap0=False, sub=1, solid=.006, keep=lambda t, th: t - HY > lim(th, .062, .02, -.06))
        P.ell((0, HY + .02, -.112), (.026, .028, .022), 'brow', 10, 6)
        pts = [(0, HY + .025, -.12), (0, HY - .03, -.15), (0, HY - .1, -.155), (0, HY - .17, -.14)]
        for i in range(3): P.capsule(pts[i], pts[i + 1], .03 - i * .007, .025 - i * .007, 'hair', 10, 2)
    elif style == 'cap':
        P.loft(grow(.016), 22, lambda *a: 'cap', cap0=False, sub=1, solid=.006, keep=lambda t, th: t - HY > lim(th, .046, .032, .03))
        P.loft(grow(.009), 22, lambda *a: 'hair', cap0=False, sub=1, solid=.005, keep=lambda t, th: lim(th, .062, .02, -.07) < t - HY < .04)
        br = []
        for i in range(11):
            a = math.radians(-80 + 16 * i); ca = math.cos(a)
            br += [(.1 * math.sin(a), HY + .048 - .016 * ca, .07 + .105 * ca), (.092 * math.sin(a), HY + .05, .06 + .045 * ca)]
        P.hull(br + [(x, y - .006, z) for (x, y, z) in br], 'capd', sub=0)
        P.ell((0, HY + .132, -.008), (.009, .005, .009), 'capd', 8, 4)
    return P.export(600 if style in ('long', 'pony', 'cap') else 480)

# ---------------- kończyny (prawa strona; lewa = odbicie w grze) ----------------
def upper_arm():
    P = Part('uarm')
    rings = [(.04, .028, .03, .03, -.008, 0, 2), (.02, .05, .054, .052, -.006, 0, 2), (-.03, .056, .058, .056, -.002, 0, 2), (-.08, .054, .058, .053, 0, .003, 2), (-.105, .052, .058, .052, 0, .004, 2), (-.15, .047, .054, .048, 0, .005, 2),
             (-.22, .044, .046, .044, 0, .002, 2), (-.27, .042, .044, .042, 0, 0, 2), (-.315, .038, .038, .038, 0, 0, 2)]
    P.loft(rings, 14, lambda t, th, x, z: 'top' if t > -.105 else 'slvU', sub=1)
    P.loft([(-.1, .052, .058, .053, 0, .005, 2), (-.112, .05, .056, .05, 0, .005, 2)], 14, lambda *a: 'top', False, False, sub=0, solid=.004)  # rąbek rękawa koszulki
    return P.export(320)

def forearm():
    P = Part('farm')
    rings = [(.035, .037, .037, .037, 0, 0, 2), (.0, .043, .045, .043, 0, 0, 2), (-.06, .046, .043, .042, 0, 0, 2), (-.13, .039, .035, .035, 0, 0, 2), (-.19, .031, .028, .028, 0, 0, 2), (-.2, .03, .027, .027, 0, 0, 2), (-.232, .027, .023, .024, 0, 0, 2), (-.245, .02, .02, .02, 0, 0, 2)]
    P.loft(rings, 14, lambda t, th, x, z: 'cuff' if t < -.19 else 'slvF', sub=1)
    # dłoń: śródręcze (cienkie w osi x – dłoń zwrócona do uda), palce i kciuk
    P.loft([(-.228, .017, .024, .022, -.002, 0, 2.2), (-.25, .018, .033, .03, -.003, .002, 2.6), (-.285, .016, .037, .033, -.004, .002, 2.8), (-.31, .013, .035, .031, -.006, .001, 2.6)], 12, lambda *a: 'skin', sub=1)
    for z, L, r in ((.025, .07, .0082), (.009, .078, .0085), (-.007, .074, .0082), (-.022, .06, .0075)):
        P.capsule((-.006, -.305, z), (-.022, -.305 - L, z + .003), r, r * .82, 'skin', 6, 2)
    P.capsule((-.012, -.252, .03), (-.03, -.316, .051), .0105, .008, 'skin', 6, 2)
    return P.export(640)

def thigh():
    P = Part('thigh')
    rings = [(.03, .06, .06, .07, 0, -.008, 2), (.0, .088, .085, .098, 0, -.01, 2.1), (-.06, .086, .085, .09, 0, -.006, 2.1), (-.16, .078, .08, .078, 0, 0, 2), (-.3, .066, .068, .064, 0, .002, 2),
             (-.42, .057, .06, .056, 0, .004, 2), (-.47, .045, .045, .045, 0, .004, 2)]
    P.loft(rings, 14, lambda *a: 'bot', sub=1)
    return P.export(260)

def shin():
    P = Part('shin')
    rings = [(.035, .045, .05, .045, 0, .004, 2), (.0, .058, .062, .058, 0, .004, 2), (-.08, .059, .056, .068, 0, -.006, 2), (-.18, .053, .05, .058, 0, -.004, 2), (-.3, .044, .042, .044, 0, 0, 2),
             (-.39, .046, .045, .047, 0, 0, 2), (-.405, .047, .046, .048, 0, 0, 2), (-.42, .036, .036, .036, 0, 0, 2)]
    P.loft(rings, 14, lambda t, th, x, z: 'botd' if t < -.39 else 'bot', sub=1)
    Z = [-.072, -.04, .0, .04, .08, .115, .145, .165]; W = [.034, .041, .044, .046, .048, .046, .037, .02]; T = [-.41, -.405, -.42, -.44, -.455, -.466, -.475, -.482]
    up = []
    for z, w, t in zip(Z, W, T): up += [(-w, t, z), (w, t, z), (-w * .95, -.484, z), (w * .95, -.484, z), (0, t + .006, z)]
    P.hull(up, 'shoe', sub=1)
    so = []
    for z, w in zip([-.076] + Z[1:] + [.172], [.036] + [x + .004 for x in W[1:]] + [.016]): so += [(-w, -.483, z), (w, -.483, z), (-w, -.5, z), (w, -.5, z)]
    P.hull(so, 'sole', sub=0)
    for i in range(4): P.capsule((-.03, -.425 - i * .011, .03 + i * .018), (.03, -.425 - i * .011, .03 + i * .018), .0028, .0028, 'str', 6, 1)  # sznurówki
    return P.export(540)

if __name__ == '__main__':
    out = {}
    reset()
    for sex in ('m', 'f'):
        for st in ('tee', 'jacket', 'hoodie', 'coat'): out.update(torso(sex, st)); reset()
        out.update(head(sex)); reset()
    for st in ('short', 'buzz', 'bob', 'long', 'pony', 'cap'): out.update(hair(st)); reset()
    out.update(upper_arm()); reset(); out.update(forearm()); reset(); out.update(thigh()); reset(); out.update(shin()); reset()
    js = '/* postać człowieka z Blendera (tools/blender/postac.py) */\nconst HUM_REG=%s;\nconst HUM={};\n' % json.dumps(REG) + ''.join('HUM[%s]=%s;\n' % (json.dumps(k), json.dumps(v, separators=(',', ':'))) for k, v in out.items())
    open(OUT, 'w', encoding='utf-8').write(js); print('zapisano', OUT, len(js) // 1024, 'kB')
