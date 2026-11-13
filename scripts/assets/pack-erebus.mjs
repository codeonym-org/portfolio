/**
 * Packs the models of the Erebus gate for the web (credits: scripts/assets/README.md).
 * Keeps only the clips the game plays, starts each clip at zero, shrinks the
 * textures to WebP and compresses meshes and animation with meshopt (the
 * decoder ships with three, so nothing is fetched from a CDN).
 *
 *   npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 draco3dgltf meshoptimizer sharp
 *   IN_DIR=<downloads> OUT_DIR=<repo>/public/models/erebus node pack-erebus.mjs
 *   ONLY=golem.glb …   repacks just those outputs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRDracoMeshCompression, KHRMaterialsSpecular } from "@gltf-transform/extensions";
import { dedup, flatten, meshopt, prune, resample, textureCompress, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const IN = process.env.IN_DIR ?? ".";
const OUT = process.env.OUT_DIR ?? ".";
const ONLY = process.env.ONLY?.split(",");

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

/** keep the named clips (source name → name in the game) and start each at zero */
function clips(doc, keep) {
  for (const anim of doc.getRoot().listAnimations()) {
    const name = keep[anim.getName()];
    if (!name) {
      anim.dispose();
      continue;
    }
    anim.setName(name);
    const inputs = new Set(anim.listSamplers().map((s) => s.getInput()));
    let start = Infinity;
    for (const acc of inputs) start = Math.min(start, acc.getMin([])[0]);
    for (const acc of inputs) {
      // an accessor shared with another clip must not be shifted twice
      const own = acc.listParents().filter((p) => p.propertyType === "AnimationSampler").every((s) => anim.listSamplers().includes(s));
      const target = own ? acc : acc.clone();
      if (!own) anim.listSamplers().filter((s) => s.getInput() === acc).forEach((s) => s.setInput(target));
      target.setArray(target.getArray().map((t) => t - start));
    }
  }
}

async function pack(input, output, { skinned = false, size = 512, keep = null, drop = [] } = {}) {
  if (ONLY && !ONLY.includes(output)) return;
  const doc = await io.read(join(IN, input));
  // specular maps barely register here, and the old sources are draco: both go
  const gone = [KHRMaterialsSpecular.EXTENSION_NAME, KHRDracoMeshCompression.EXTENSION_NAME];
  doc.getRoot().listExtensionsUsed().filter((e) => gone.includes(e.extensionName)).forEach((e) => e.dispose());
  for (const node of doc.getRoot().listNodes()) if (drop.includes(node.getName())) node.dispose();
  if (keep) clips(doc, keep);
  // flatten would detach joints from their skeleton: static meshes only
  if (!skinned) await doc.transform(flatten());
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    resample({ tolerance: 0.002 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], quality: 78 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const bytes = await io.writeBinary(doc);
  writeFileSync(join(OUT, output), bytes);
  const anims = doc.getRoot().listAnimations().map((a) => `${a.getName()} ${Math.max(...a.listSamplers().map((s) => s.getInput().getMax([])[0])).toFixed(2)}s`);
  console.log(`  ${output.padEnd(12)} ${(bytes.byteLength / 1024) | 0} KB  ${anims.join(", ")}`);
}

// the hunter: a hooded figure with no skeleton (it glides), and the blade that fights for it
await pack("death_star_asuirila_shadow_wraith.glb", "hunter.glb", { size: 1024 });
await pack("sword_of_the_defeated.glb", "blade.glb");
// shadow soldiers and the fallen knights: one Mixamo rig, without the plume
await pack("knight.glb", "knight.glb", { skinned: true, keep: { Idle: "Idle", Run: "Run", Slash: "Slash", StandUp: "Rise" }, drop: ["Igris_plume"] });
await pack("drugdor_the_golem_animated.glb", "golem.glb", { skinned: true, keep: { Walk: "Walk", Attack3: "Attack", Attack2: "Smash", IdlePieces: "Idle" } });
await pack("obelisk.glb", "obelisk.glb");
await pack("stylized_ruined_pillar.glb", "pillar.glb");
await pack("stylized_ruin_remains.glb", "remains.glb");
