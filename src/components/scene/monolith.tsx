"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
  type PointLight,
  type Sprite,
  Vector3,
} from "three";
import { damp, seeded } from "@/record/layout";
import { live, useWorldStore } from "@/store/world-store";
import { COLORS, view } from "./view";

export const MONOLITH_URL = "/models/record/monolith.glb";

/** the outside of the body, and the cut faces that glow as it opens — written every frame */
const shell = new MeshPhysicalMaterial({
  color: "#040308",
  roughness: 0.14,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  envMapIntensity: 0.3,
  flatShading: true,
});
const crack = new MeshStandardMaterial({
  color: "#06030f",
  roughness: 0.5,
  emissive: new Color(COLORS.arcane),
  emissiveIntensity: 1,
  flatShading: true,
});
/** the unbroken crystal inside: it glows, so every seam between the pieces is a line of light */
const HEART_COLOR = new Color(COLORS.arcane).lerp(new Color(COLORS.arcaneHot), 0.35);
const heartGlow = new MeshBasicMaterial({ color: HEART_COLOR.clone(), toneMapped: false });
/** every ridge and every break of the body, traced in light */
const seams = new LineBasicMaterial({ color: HEART_COLOR.clone(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

interface Piece {
  object: Object3D;
  rest: Vector3;
  away: Vector3;
  axis: Vector3;
  reach: number;
  turn: number;
  phase: number;
}

/** a soft round glow, drawn once — the nucleus reads even with post-processing off */
function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(200,170,255,0.55)");
  g.addColorStop(0.6, "rgba(120,80,255,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/**
 * THE SYSTEM's body: an obsidian crystal broken into thirty pieces
 * (built in Blender, see scripts/assets/monolith.py). At rest it is
 * almost sealed and only the seams glow. It opens while the System
 * thinks, breathes with its voice, and opens while the System thinks.
 */
export function Monolith() {
  const { scene } = useGLTF(MONOLITH_URL, false, false);
  const body = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const halo = useRef<Sprite>(null);
  const nucleus = useRef<Mesh>(null);

  const pieces = useMemo(() => {
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const name = (o.material as { name?: string }).name;
      o.material = name === "heart" ? heartGlow : name === "fracture" ? crack : shell;
      if (name === "shell" && !o.userData.seamed) {
        o.userData.seamed = true;
        o.add(new LineSegments(new EdgesGeometry(o.geometry, 24), seams));
      }
    });
    const parts = scene.children.filter((o) => o.name.startsWith("piece"));
    const pieces: Piece[] = parts.map((object, i) => {
      const rest = object.position.clone();
      // pieces leave sideways more than up or down, so the body opens like a flower, not a line
      const away = rest.clone().multiply(new Vector3(1, 0.5, 1));
      if (away.lengthSq() < 1e-4) away.set(0, 1, 0);
      away.normalize();
      return {
        object,
        rest,
        away,
        axis: new Vector3(seeded(i, 3) - 0.5, seeded(i, 4) - 0.5, seeded(i, 5) - 0.5).normalize(),
        reach: 0.7 + seeded(i, 6) * 1.1,
        turn: (seeded(i, 7) - 0.5) * 2.4,
        phase: seeded(i, 8) * Math.PI * 2,
      };
    });
    return pieces;
  }, [scene]);

  const glow = useMemo(() => glowTexture(), []);
  const core = useMemo(() => new MeshBasicMaterial({ color: new Color(COLORS.arcaneHot).multiplyScalar(3), toneMapped: false }), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const s = useWorldStore.getState();

    // how far open the body wants to be
    let want = 0.03 + Math.sin(t * 0.7) * 0.012;
    if (live.agentBusy) want = 0.3 + Math.sin(t * 4.2) * 0.05;
    want = Math.max(want, (live.voiceSurge - 1) * 0.075);
    if (s.hovered === "monolith") want += 0.07;
    // opening is quick, sealing is slow and heavy
    view.open = damp(view.open, want, want > view.open ? 5 : 1.5, dt);
    const open = view.open;

    for (const p of pieces) {
      const drift = Math.sin(t * 0.9 + p.phase) * 0.03 * (0.4 + open * 2);
      const d = open * p.reach * 1.25 + drift;
      p.object.position.set(p.rest.x + p.away.x * d, p.rest.y + p.away.y * d, p.rest.z + p.away.z * d);
      p.object.quaternion.setFromAxisAngle(p.axis, open * p.turn + drift * 0.6);
    }

    if (body.current) {
      body.current.rotation.y = t * 0.09 + view.spin * 0.35;
      body.current.position.y = Math.sin(t * 0.5) * 0.08;
    }
    crack.emissiveIntensity = 0.35 + Math.min(open, 1.2) * 1.6;
    seams.color.copy(HEART_COLOR).multiplyScalar(1.5 + Math.sin(t * 1.6) * 0.3 + Math.min(open, 1.2) * 2.2);
    shell.envMapIntensity = 0.3 + open * 0.5;
    // the heart breathes at rest and burns when the body opens
    heartGlow.color.copy(HEART_COLOR).multiplyScalar(1.9 + Math.sin(t * 1.6) * 0.35 + Math.min(open, 1.2) * 3.2 + (live.agentBusy ? Math.sin(t * 11) * 0.5 : 0) + live.heart * 3);
    // while the voice is live the heart beats with the pulse line
    const heart = 0.5 + Math.min(open, 1.4) * 2.4 + (live.agentBusy ? Math.sin(t * 9) * 0.12 : 0) + live.heart * 0.9;
    if (light.current) light.current.intensity = 4 + heart * 26;
    if (nucleus.current) nucleus.current.scale.setScalar(0.5 + heart * 0.42);
    if (halo.current) {
      halo.current.scale.setScalar(3.2 + heart * 2.8);
      halo.current.material.opacity = 0.1 + Math.min(heart, 3) * 0.16;
    }
  });

  const setHovered = useWorldStore((s) => s.setHovered);

  return (
    <group ref={body}>
      <primitive
        object={scene}
        onPointerOver={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          setHovered("monolith");
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(e: { stopPropagation: () => void; delta: number }) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          const s = useWorldStore.getState();
          if (s.sector || s.caseFile || s.brief) s.closeFocus();
          else window.dispatchEvent(new Event("system:focus-prompt"));
        }}
      />
      <mesh ref={nucleus} material={core}>
        <icosahedronGeometry args={[0.3, 2]} />
      </mesh>
      <sprite ref={halo}>
        <spriteMaterial map={glow} blending={AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
      <pointLight ref={light} color={COLORS.arcane} distance={14} decay={2} />
    </group>
  );
}

useGLTF.preload(MONOLITH_URL, false, false);
