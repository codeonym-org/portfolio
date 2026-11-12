"""
The Monolith — THE SYSTEM's body — and the record shards that orbit it.

Everything is generated: no downloaded meshes. Run headless (Blender ≥ 4.2):

    blender -b -P scripts/assets/monolith.py -- <out-dir>

Writes, into <out-dir>:

    monolith.glb   an elongated obsidian crystal, Voronoi-fractured into
                   separate pieces (nodes "piece_NN"). Each piece has its
                   origin at its centroid, so the app can pull the body apart.
                   Two material slots: "shell" (the outside) and "fracture"
                   (the cut faces). Plus one node "heart": the same crystal,
                   unbroken and slightly smaller. The app makes it glow, so
                   light shows through every seam between the pieces.
    shards.glb     one small crystal per sector of the record, instanced by
                   the app. Node names are the sector ids.

Geometry is flat-shaded and tiny (a few thousand triangles in total).
"""

import math
import random
import sys

try:  # the glTF exporter needs numpy; some Blender builds only find the distro's copy
    import numpy  # noqa: F401
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")

import bmesh
import bpy
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."
SEED = 82  # the Player's level; change it and the body breaks differently
PIECES = 30
GAP = 0.05  # how far each piece pulls back from its neighbours


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name):
    mat = bpy.data.materials.new(name)
    return mat


def hull_from_points(points):
    bm = bmesh.new()
    for p in points:
        bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts)
    # the hull operator leaves interior verts behind
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def crystal_points(rng):
    """An elongated, slightly crooked seven-sided crystal, Z up, about 4 units tall."""
    sides = 7
    rings = [
        # (z, radius, jitter)
        (-2.05, 0.0, 0.0),
        (-1.25, 0.62, 0.08),
        (-0.2, 0.98, 0.07),
        (0.85, 0.9, 0.08),
        (1.55, 0.5, 0.07),
        (2.1, 0.0, 0.0),
    ]
    pts = []
    twist = 0.0
    for z, r, j in rings:
        if r == 0:
            pts.append(Vector((rng.uniform(-0.08, 0.08), rng.uniform(-0.08, 0.08), z)))
            continue
        twist += rng.uniform(0.1, 0.32)
        for i in range(sides):
            a = twist + (i / sides) * math.tau
            rr = r * (1 + rng.uniform(-j, j) * 2)
            pts.append(Vector((math.cos(a) * rr, math.sin(a) * rr, z + rng.uniform(-j, j))))
    return pts


def fracture(hull, rng):
    """Voronoi cells of the hull: each cell is the hull cut by the bisector planes of its seed."""
    seeds = []
    while len(seeds) < PIECES:
        z = rng.uniform(-1.9, 1.95)
        # fewer, larger pieces at the tips
        r = (1 - abs(z) / 2.2) * 0.95
        a = rng.uniform(0, math.tau)
        d = math.sqrt(rng.random()) * r
        p = Vector((math.cos(a) * d, math.sin(a) * d, z))
        if all((p - q).length > 0.42 for q in seeds):
            seeds.append(p)

    cells = []
    for i, p in enumerate(seeds):
        bm = hull.copy()
        for f in bm.faces:
            f.material_index = 0
        for j, q in enumerate(seeds):
            if i == j or not bm.faces:
                continue
            mid = (p + q) / 2
            normal = (q - p).normalized()
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            cut = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=mid, plane_no=normal, clear_outer=True, dist=1e-5)
            edges = [e for e in cut["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
            if edges:
                filled = bmesh.ops.holes_fill(bm, edges=edges, sides=0)
                for f in filled["faces"]:
                    f.material_index = 1
        if len(bm.faces) >= 4:
            cells.append(bm)
        else:
            bm.free()
    return cells


def add_object(name, bm, materials, shrink=0.0):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    centroid = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
    for v in bm.verts:
        v.co = (v.co - centroid) * (1 - shrink)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in materials:
        mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    obj.location = centroid
    bpy.context.scene.collection.objects.link(obj)
    return obj


def export(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="EXPORT",
        export_animations=False,
        export_draco_mesh_compression_enable=False,
    )
    print(f"wrote {path}")


def build_monolith():
    reset()
    rng = random.Random(SEED)
    shell = material("shell")
    crack = material("fracture")
    hull = hull_from_points(crystal_points(rng))
    cells = fracture(hull, rng)
    heart = hull.copy()
    hull.free()
    # widest gaps relative to size, so small and large pieces separate evenly
    for i, bm in enumerate(cells):
        first = next(iter(bm.verts)).co
        size = max((v.co - first).length for v in bm.verts)
        add_object(f"piece_{i:02d}", bm, [shell, crack], shrink=min(0.12, GAP / max(size, 0.2)))
    for v in heart.verts:
        v.co *= 0.965
    add_object("heart", heart, [material("heart")])
    print(f"monolith: {len(cells)} pieces, {sum(len(o.data.polygons) for o in bpy.data.objects)} faces")
    export(f"{OUT}/monolith.glb")


def ring_points(z, r, n, phase=0.0, squash=1.0):
    return [Vector((math.cos(phase + i / n * math.tau) * r, math.sin(phase + i / n * math.tau) * r * squash, z)) for i in range(n)]


def build_shards():
    """One silhouette per sector, each about one unit tall, Z up."""
    reset()
    rng = random.Random(SEED + 1)
    mat = material("shard")

    def jitter(points, amount):
        return [p + Vector((rng.uniform(-amount, amount), rng.uniform(-amount, amount), rng.uniform(-amount, amount))) for p in points]

    shapes = {
        # the Player: a balanced, symmetrical seed
        "status": [Vector((0, 0, 0.62)), Vector((0, 0, -0.62))] + ring_points(0.0, 0.42, 6),
        # the chronicle: a tall obelisk, one per chapter
        "experience": [Vector((0, 0, 0.75))] + ring_points(0.45, 0.2, 4, 0.78) + ring_points(-0.6, 0.26, 4, 0.78) + [Vector((0, 0, -0.7))],
        # the shadows (projects): a long blade
        "projects": jitter(
            [Vector((0, 0, 0.95)), Vector((0, 0, -0.75))] + ring_points(0.25, 0.3, 5, 0.3, 0.45) + ring_points(-0.35, 0.22, 5, 0.9, 0.5),
            0.03,
        ),
        # the arsenal (skills): a small sliver, there are many of them
        "skills": jitter([Vector((0, 0, 0.5)), Vector((0, 0, -0.5))] + ring_points(0.08, 0.2, 3, 0.4), 0.04),
        # the vault (inventory): a cut gem — table, crown, girdle, pavilion
        "inventory": ring_points(0.3, 0.26, 8) + ring_points(0.1, 0.5, 8, math.pi / 8) + [Vector((0, 0, -0.55))],
    }
    for name, points in shapes.items():
        add_object(name, hull_from_points(points), [mat])

    # the gate (contact): a faceted ring you could step through
    bm = bmesh.new()
    major, minor, seg, sides = 0.46, 0.085, 10, 4
    grid = []
    for i in range(seg):
        a = i / seg * math.tau
        ring = []
        for j in range(sides):
            b = j / sides * math.tau + math.pi / 4
            r = major + math.cos(b) * minor
            ring.append(bm.verts.new((math.cos(a) * r, math.sin(b) * minor * 1.6, math.sin(a) * r)))
        grid.append(ring)
    for i in range(seg):
        for j in range(sides):
            bm.faces.new((grid[i][j], grid[(i + 1) % seg][j], grid[(i + 1) % seg][(j + 1) % sides], grid[i][(j + 1) % sides]))
    add_object("contact", bm, [mat])

    for obj in bpy.data.objects:
        obj.location = (0, 0, 0)
    export(f"{OUT}/shards.glb")


build_monolith()
build_shards()
