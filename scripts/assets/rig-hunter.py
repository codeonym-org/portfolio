# knight.glb (Mixamo rig + clips + sword) and a static hooded figure in A-pose -> hunter.glb: the figure skinned to that rig
#   blender -b -P rig_hunter.py -- <knight.glb> <dark_hooded_rogue.glb> <out dir>
import sys, math
try:
    import numpy
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")
import bpy, numpy as np
from mathutils import Matrix, Vector

knight, rogue, out = sys.argv[sys.argv.index("--") + 1:][:3]
HEIGHT = 1.9          # the figure's hood peak; puts its hips and shoulders on the rig's
ARMS_DOWN = 80        # degrees from the rig's T-pose to the figure's hanging arms
TRIS = 26000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=knight)
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == "ARMATURE")
body = [o for o in sc.objects if o.type == "MESH" and o.name.startswith("Paladin")]
for o in list(sc.objects):
    if o.type == "MESH" and o.name in ("Icosphere", "Igris_plume"):
        bpy.data.objects.remove(o)

before = set(sc.objects)
bpy.ops.import_scene.gltf(filepath=rogue)
new = [o for o in sc.objects if o not in before]
meshes = [o for o in new if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw; o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
fig = meshes[0]
for o in list(sc.objects):
    if o.type == "EMPTY": bpy.data.objects.remove(o)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
co = np.array([v.co[:] for v in fig.data.vertices])
s = HEIGHT / (co[:, 2].max() - co[:, 2].min())
centre = (co.min(0) + co.max(0)) / 2
fig.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation((-centre[0], -centre[1], -co[:, 2].min())))
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode="OBJECT")
tris = sum(len(p.vertices) - 2 for p in fig.data.polygons)
dec = fig.modifiers.new("dec", "DECIMATE"); dec.ratio = min(1, TRIS / tris)
bpy.ops.object.modifier_apply(modifier="dec")
fig.name = "Hunter"; fig.data.name = "Hunter"
for m in fig.data.materials: m.name = "Hunter_MAT"
print("FIG tris", sum(len(p.vertices) - 2 for p in fig.data.polygons))

# the rig, posed as the figure stands
if arm.animation_data: arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix()
bpy.context.view_layer.update()
for name, sign in (("mixamorig:LeftArm", 1), ("mixamorig:RightArm", -1)):
    pb = arm.pose.bones[name]
    world = arm.matrix_world @ pb.matrix
    head = world.to_translation()
    turn = Matrix.Translation(head) @ Matrix.Rotation(math.radians(ARMS_DOWN) * sign, 4, "Y") @ Matrix.Translation(-head)
    pb.matrix = arm.matrix_world.inverted() @ turn @ world
    bpy.context.view_layer.update()
print("HAND", (arm.matrix_world @ arm.pose.bones["mixamorig:LeftHand"].matrix).to_translation())

# weights: on a copy of the rig whose rest pose is that pose
bpy.ops.object.select_all(action="DESELECT")
twin = arm.copy(); twin.data = arm.data.copy(); sc.collection.objects.link(twin)
bpy.context.view_layer.objects.active = twin; twin.select_set(True)
bpy.ops.object.mode_set(mode="POSE"); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
fig.select_set(True); twin.select_set(True); bpy.context.view_layer.objects.active = twin
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
weighted = sum(1 for v in fig.data.vertices if any(g.weight > 0 for g in v.groups))
print("WEIGHTED", weighted, "of", len(fig.data.vertices))
if weighted < len(fig.data.vertices) * 0.98:
    raise SystemExit("automatic weights failed")
bpy.ops.object.select_all(action="DESELECT"); fig.select_set(True); bpy.context.view_layer.objects.active = fig
bpy.ops.object.vertex_group_limit_total(limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)

# the hands hang beside the hips, so the automatic weights tie cloth, pouch and even boots to the arms: undo that by region
def chain(name):
    for side in ("Left", "Right"):
        if any(name == f"mixamorig:{side}{part}" for part in ("Arm", "ForeArm", "Hand")) or name.startswith(f"mixamorig:{side}Hand"):
            return side
    return None
names = {g.index: g.name for g in fig.vertex_groups}
index = {g.name: g.index for g in fig.vertex_groups}
fixed = 0
for v in fig.data.vertices:
    w = fig.matrix_world @ v.co
    arm_zone = abs(w.x) > 0.205 and 0.84 < w.z < 1.27
    upper = w.z > 1.3
    side = "Left" if w.x > 0 else "Right"
    drop = []
    for g in v.groups:
        c = chain(names[g.group])
        if c and not ((arm_zone or upper) and c == side): drop.append(g.group)
        elif not c and arm_zone and "Shoulder" not in names[g.group]: drop.append(g.group)
    if not drop: continue
    fixed += 1
    for gi in drop: fig.vertex_groups[gi].remove([v.index])
    if not any(g.weight > 0 for g in v.groups):
        fig.vertex_groups[index[f"mixamorig:{side}ForeArm" if arm_zone else "mixamorig:Hips"]].add([v.index], 1.0, "REPLACE")
print("REWEIGHTED", fixed)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=0.5, repeat=2)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.vertex_group_limit_total(limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)

# the bare hands of the source are a mannequin's: gloves, as a vertex colour the material multiplies in
gloves = fig.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
for v in fig.data.vertices:
    hand = sum(g.weight for g in v.groups if "Hand" in names[g.group])
    k = 1 - 0.88 * min(1, hand * 1.5)
    gloves.data[v.index].color = (k, k, k, 1)
fig.data.color_attributes.active_color = gloves

# the figure is bound in that pose; give it the shape it has when the rig is at rest
world_co = np.array([(fig.matrix_world @ v.co)[:] for v in fig.data.vertices])
inv = np.array(arm.matrix_world.inverted())
local = world_co @ inv[:3, :3].T + inv[:3, 3]
skin = {}
for g in fig.vertex_groups:
    pb = arm.pose.bones.get(g.name)
    if pb: skin[g.index] = np.array(pb.matrix @ pb.bone.matrix_local.inverted())
rest = np.empty_like(local)
for i, v in enumerate(fig.data.vertices):
    m = np.zeros((4, 4)); total = 0
    for g in v.groups:
        if g.group in skin and g.weight > 0:
            m += skin[g.group] * g.weight; total += g.weight
    m = m / total if total else np.eye(4)
    rest[i] = (np.linalg.inv(m) @ np.append(local[i], 1))[:3]
for mod in list(fig.modifiers): fig.modifiers.remove(mod)
fig.parent = None
fig.matrix_world = arm.matrix_world.copy()
for i, v in enumerate(fig.data.vertices): v.co = rest[i]
fig.parent = arm
fig.matrix_parent_inverse = Matrix()
fig.matrix_world = arm.matrix_world.copy()
fig.modifiers.new("Armature", "ARMATURE").object = arm
bpy.data.objects.remove(twin)
for o in body: bpy.data.objects.remove(o)
for pb in arm.pose.bones: pb.matrix_basis = Matrix()
for p in fig.data.polygons: p.use_smooth = True

try:
    bpy.ops.export_scene.gltf(filepath=out + "/hunter.glb", export_format="GLB", export_yup=True, export_animations=True, export_vertex_color="ACTIVE", export_active_vertex_color_when_no_material=True)
except TypeError as e:
    print("VCOL", e)
    bpy.ops.export_scene.gltf(filepath=out + "/hunter.glb", export_format="GLB", export_yup=True, export_animations=True)

# previews: three moments of three clips
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x = 520; sc.render.resolution_y = 620
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 2.6
shots = {"front": ((0, -6, 1.0), (math.pi / 2, 0, 0)), "side": ((6, 0, 1.0), (math.pi / 2, 0, math.pi / 2))}
def clip(name):
    a = bpy.data.actions.get(name)
    if not arm.animation_data: arm.animation_data_create()
    for t in arm.animation_data.nla_tracks: t.mute = True
    arm.animation_data.action = a
    try:
        arm.animation_data.action_slot = a.slots[0]
    except Exception as e:
        print("SLOT", e)
    return a
for name, frac, view in (("rest", 0, "front"), ("Idle", 0.3, "front"), ("Slash", 0.5, "front"), ("Run", 0.3, "side"), ("Spin", 0.5, "front"), ("Kneel", 0.9, "side"), ("PowerUp", 0.5, "front"), ("StandUp", 0.3, "side")):
    if name != "rest":
        a = clip(name); f0, f1 = a.frame_range; sc.frame_set(int(f0 + (f1 - f0) * frac))
    cam.location, cam.rotation_euler = shots[view]
    sc.render.filepath = f"{out}/{name}-{view}.png"
    bpy.ops.render.render(write_still=True)
