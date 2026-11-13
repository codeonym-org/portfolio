"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, Object3D, type InstancedMesh } from "three";
import { game } from "@/erebus/game";

/**
 * The small things on the cavern floor: what enemies drop, what they throw,
 * the ground that is about to break and the pillars of light. Each
 * kind is one instanced mesh, rewritten every frame from the
 * simulation. The bodies are in models.tsx.
 */

const dummy = new Object3D();
const color = new Color();
const hidden = () => {
  dummy.position.set(0, -50, 0);
  dummy.scale.setScalar(0.0001);
  dummy.updateMatrix();
};

const PICKUP: Record<string, string> = { echo: "#7fc4e0", heal: "#74c796", rune: "#d9a441" };
const MAX_DROPS = 60;
const MAX_SHOTS = 30;
const MAX_HAZARDS = 24;
const MAX_BEAMS = 20;

export function Drops() {
  const drops = useRef<InstancedMesh>(null);
  const shots = useRef<InstancedMesh>(null);
  const rings = useRef<InstancedMesh>(null);
  const fills = useRef<InstancedMesh>(null);
  const beams = useRef<InstancedMesh>(null);

  useFrame((state) => {
    const sim = game.sim;
    const d = drops.current;
    const s = shots.current;
    const r = rings.current;
    const f = fills.current;
    const b = beams.current;
    if (!sim || !d || !s || !r || !f || !b) return;
    const t = state.clock.elapsedTime;
    let beam = 0;
    const pillar = (x: number, z: number, radius: number, height: number, hex: string) => {
      if (beam >= MAX_BEAMS) return;
      dummy.position.set(x, height / 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(radius * (1 + Math.sin(t * 3 + x) * 0.12), height, radius * (1 + Math.sin(t * 3 + x) * 0.12));
      dummy.updateMatrix();
      b.setMatrixAt(beam, dummy.matrix);
      b.setColorAt(beam++, color.set(hex));
    };

    for (let i = 0; i < MAX_DROPS; i++) {
      const p = sim.pickups[i];
      if (!p) hidden();
      else {
        const size = p.kind === "rune" ? 0.42 : p.kind === "heal" ? 0.24 : 0.16;
        dummy.position.set(p.x, 0.9 + Math.sin(t * 2.5 + p.id) * 0.18, p.z);
        dummy.rotation.set(0, t * 1.8 + p.id, 0);
        dummy.scale.set(size, size * 1.5, size);
        dummy.updateMatrix();
        d.setColorAt(i, color.set(PICKUP[p.kind]));
        if (p.kind === "rune") pillar(p.x, p.z, 0.07, 4, "#c9983f");
      }
      d.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < MAX_SHOTS; i++) {
      const p = sim.shots[i];
      if (!p) hidden();
      else {
        dummy.position.set(p.x, 1.1, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.2);
        dummy.updateMatrix();
      }
      s.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < MAX_HAZARDS; i++) {
      const z = sim.hazards[i];
      if (!z) {
        hidden();
        r.setMatrixAt(i, dummy.matrix);
        f.setMatrixAt(i, dummy.matrix);
        continue;
      }
      dummy.position.set(z.x, 0.06, z.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(z.r);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.05;
      dummy.scale.setScalar(z.r * Math.min(1, 1 - z.t / z.total));
      dummy.updateMatrix();
      f.setMatrixAt(i, dummy.matrix);
    }

    for (const o of sim.obelisks) {
      if (o.revealed) pillar(o.x, o.z, 0.55, 30, "#a9a0d8");
      else if (o.state === "fallen") pillar(o.x, o.z, 0.7, 30, "#6fb4d9");
    }
    if (sim.quest?.type === "reach") pillar(sim.quest.x, sim.quest.z, 1.0, 30, "#d7e2ee");
    for (let i = beam; i < MAX_BEAMS; i++) {
      hidden();
      b.setMatrixAt(i, dummy.matrix);
    }
    for (const m of [d, s, r, f, b]) m.instanceMatrix.needsUpdate = true;
    if (d.instanceColor) d.instanceColor.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={drops} args={[undefined, undefined, MAX_DROPS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={shots} args={[undefined, undefined, MAX_SHOTS]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#a3bd6a" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={rings} args={[undefined, undefined, MAX_HAZARDS]} frustumCulled={false}>
        <ringGeometry args={[0.93, 1, 40]} />
        <meshBasicMaterial color="#d8402f" toneMapped={false} transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={fills} args={[undefined, undefined, MAX_HAZARDS]} frustumCulled={false}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial color="#d8402f" toneMapped={false} transparent opacity={0.28} blending={AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={beams} args={[undefined, undefined, MAX_BEAMS]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 12, 1, true]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
