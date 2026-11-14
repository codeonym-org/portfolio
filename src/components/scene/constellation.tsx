"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { type BufferGeometry, Color, type Group, type Mesh, MeshStandardMaterial } from "three";
import { quests } from "@/config/quests.config";
import type { SectorId } from "@/config/types";
import { sectorById, sectors } from "@/config/world.config";
import { play } from "@/lib/audio";
import { nodeKeyOf } from "@/record/case-file";
import { damp, haloPoints, orbitPoint, seeded, type Vec3 } from "@/record/layout";
import { boundOrbit, inspectTargetOf, nodesOfSector, recordNodes, type RecordNode } from "@/record/nodes";
import { live, useWorldStore } from "@/store/world-store";
import { COLORS, hueColor, toneColor, view } from "./view";

export const SHARDS_URL = "/models/record/shards.glb";

/** where every shard is right now ([x, y, z] per node) — the beams aim at these */
export const nodePositions = new Float32Array(recordNodes.length * 3);
/** how large every shard is drawn right now — the Hologram sizes its aura by it */
export const nodeScale = new Float32Array(recordNodes.length);
/** a shard a beam just reached flares, then cools */
export const nodeFlash = new Float32Array(recordNodes.length);

/**
 * One material per shard, for the page's lifetime — its glow is written
 * every frame. Dark glass that glows at its edges: the emissive term is
 * weighted by a fresnel, so each facet lights differently as it turns.
 */
const materials = recordNodes.map((n) => {
  const hue = new Color(hueColor[n.hue]);
  const mat = new MeshStandardMaterial({
    color: new Color(COLORS.obsidian).lerp(hue, 0.12),
    roughness: 0.12,
    metalness: 0.1,
    envMapIntensity: 1.1,
    emissive: hue,
    emissiveIntensity: 0,
    flatShading: true,
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      /* glsl */ `#include <emissivemap_fragment>
      float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
      totalEmissiveRadiance *= 0.16 + pow(rim, 1.6) * 2.4;`,
    );
  };
  return mat;
});

/** the first shard of each sector carries the sector's beacon */
const leaders = new Map<string, SectorId>(sectors.map((s) => [nodesOfSector(s.id)[0].key, s.id]));
const questOrder = new Map(quests.map((q, i) => [q.id, i]));

type Side = "top" | "bottom" | "left" | "right";

function sideOf([x, y]: Vec3): Side {
  if (x < -0.8) return "left";
  if (x > 0.8) return "right";
  return y >= 0 ? "top" : "bottom";
}

/** what touching a shard does — the same for a click in the sky and a row in the palette */
export function activateNode(node: RecordNode) {
  const s = useWorldStore.getState();
  const target = inspectTargetOf(node);
  if (target) {
    play("blade", { volume: 0.3 });
    s.setInspect(target);
  } else {
    s.openSector(node.sector);
  }
}

function Beacon({ sector }: { sector: SectorId }) {
  const def = sectorById[sector];
  const openSector = useWorldStore((s) => s.openSector);
  const count = nodesOfSector(sector).length;
  return (
    <Html center zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
      <button
        type="button"
        className="beacon"
        style={{ ["--hue" as string]: toneColor[def.tone] }}
        onPointerEnter={() => play("hover")}
        onClick={() => openSector(sector)}
      >
        <span className="beacon__tick" />
        <span className="beacon__name">{def.name}</span>
        <span className="beacon__meta">
          {def.section}
          {count > 1 ? ` · ${count}` : ""}
        </span>
      </button>
    </Html>
  );
}

function Label({ node, side, note }: { node: RecordNode; side: Side; note?: string }) {
  return (
    <Html center zIndexRange={[14, 0]} style={{ pointerEvents: "none" }}>
      <div className={`shard-label shard-label--${side}`} style={{ ["--hue" as string]: hueColor[node.hue] }}>
        <span className="shard-label__name">{node.label}</span>
        <span className="shard-label__sub">{note ?? node.sub}</span>
      </div>
    </Html>
  );
}

/**
 * The record in orbit: one shard per entity. At rest each rides its
 * sector's ring. Bringing a sector or a case forward pulls its shards
 * into a halo around the Monolith, facing the visitor; everything
 * else dims and keeps turning.
 */
export function Constellation() {
  const gltf = useGLTF(SHARDS_URL, false, false);
  const sector = useWorldStore((s) => s.sector);
  const caseFile = useWorldStore((s) => s.caseFile);
  const hovered = useWorldStore((s) => s.hovered);
  const chosen = useWorldStore((s) => s.chosen);
  const setHovered = useWorldStore((s) => s.setHovered);

  const groups = useRef<(Group | null)[]>([]);

  const geometry = useMemo(() => {
    const out = {} as Record<SectorId, BufferGeometry>;
    for (const s of sectors) out[s.id] = (gltf.nodes[s.id] as Mesh).geometry;
    return out;
  }, [gltf]);

  /** node key → its place in the halo (unscaled), when something is brought forward */
  const formation = useMemo(() => {
    const keys = caseFile ? caseFile.evidence.map(nodeKeyOf) : sector ? nodesOfSector(sector).map((n) => n.key) : [];
    const points = haloPoints(keys.length);
    return new Map(keys.map((k, i) => [k, points[i]]));
  }, [sector, caseFile]);

  const notes = useMemo(() => new Map(caseFile?.evidence.map((e, i) => [nodeKeyOf(e), `evidence ${String(i + 1).padStart(2, "0")}`]) ?? []), [caseFile]);

  const scratch = useMemo<Vec3>(() => [0, 0, 0], []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const cos = Math.cos(view.spin);
    const sin = Math.sin(view.spin);
    const focused = formation.size > 0;
    const state = useWorldStore.getState();

    for (let i = 0; i < recordNodes.length; i++) {
      const node = recordNodes[i];
      const group = groups.current[i];
      if (!group) continue;
      const place = formation.get(node.key);
      const isQuest = node.kind === "quest";

      let x: number, y: number, z: number;
      if (place) {
        x = place[0] * view.haloScale;
        y = place[1] * view.haloScale * view.haloSquash;
        z = place[2];
      } else {
        // projects ride close to the Monolith; everything else keeps its sector's ring
        const orbit = isQuest ? boundOrbit(questOrder.get(node.id) ?? 0) : node.orbit;
        orbitPoint(orbit, t, scratch, isQuest ? Math.max(view.orbitScale, 0.8) : view.orbitScale);
        x = scratch[0] * cos + scratch[2] * sin;
        y = scratch[1];
        z = -scratch[0] * sin + scratch[2] * cos;
      }
      const lambda = place ? 2.6 + seeded(i, 9) * 2.2 : 2.2;
      const p = group.position;
      p.set(damp(p.x, x, lambda, dt), damp(p.y, y, lambda, dt), damp(p.z, z, lambda, dt));
      nodePositions[i * 3] = p.x;
      nodePositions[i * 3 + 1] = p.y;
      nodePositions[i * 3 + 2] = p.z;

      // glow: every shard is lit; what is brought forward burns
      let glow = 0.8;
      if (focused) glow = place ? 1.6 : glow * 0.3;
      // the project on display burns hottest of all (its aura is drawn by the Hologram)
      const onDisplay = isQuest && state.chosen === node.id;
      if (onDisplay) glow = Math.max(glow, 2.4);
      if (state.hovered === node.key) glow = Math.max(glow * 1.6, 2.2);
      nodeFlash[i] *= Math.exp(-dt * 2.2);
      glow += nodeFlash[i] * 3.5;
      const mat = materials[i];
      mat.emissiveIntensity = damp(mat.emissiveIntensity, glow, 7, dt);

      const big = (place ? (node.kind === "skill" ? 1.7 : 1.3) : 1) * (onDisplay ? (place ? 1.2 : 1.45) : state.hovered === node.key ? 1.4 : 1);
      const scale = damp(group.scale.x, node.size * big, 6, dt);
      group.scale.setScalar(scale);
      nodeScale[i] = scale;

      const mesh = group.children[0];
      mesh.rotation.y += dt * (0.25 + seeded(i, 10) * 0.5);
      const lean = place ? 0 : (seeded(i, 11) - 0.5) * 1.3;
      mesh.rotation.z = damp(mesh.rotation.z, lean, 3, dt);
      mesh.rotation.x = damp(mesh.rotation.x, place ? 0 : (seeded(i, 12) - 0.5) * 0.9, 3, dt);
    }

    if (live.shock > 0) live.shock = Math.max(0, live.shock - dt * 0.9);
  });

  const over = (node: RecordNode) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (view.dragging) return;
    setHovered(node.key);
    play("hover", { volume: 0.12 });
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(null);
    document.body.style.cursor = "";
  };
  const click = (node: RecordNode) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    activateNode(node);
  };

  const showFormationLabels = formation.size > 0 && formation.size <= 12;

  return (
    <group>
      {recordNodes.map((node, i) => {
        const place = formation.get(node.key);
        const beacon = !formation.size ? leaders.get(node.key) : undefined;
        // the project on display is named by its hologram's card, not a label
        const onDisplay = node.kind === "quest" && chosen === node.id;
        const labeled = !onDisplay && (hovered === node.key || (showFormationLabels && !!place));
        return (
          <group
            key={node.key}
            ref={(g) => {
              groups.current[i] = g;
            }}
            scale={0.001}
          >
            <mesh geometry={geometry[node.shape]} material={materials[i]} />
            <mesh visible={false} onPointerOver={over(node)} onPointerOut={out} onClick={click(node)}>
              <sphereGeometry args={[node.kind === "skill" ? 1.9 : 1.1, 8, 6]} />
            </mesh>
            {beacon && hovered !== node.key && <Beacon sector={beacon} />}
            {labeled && <Label node={node} side={place ? sideOf(place) : "top"} note={notes.get(node.key)} />}
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload(SHARDS_URL, false, false);
