"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, Noise, SMAA, Vignette } from "@react-three/postprocessing";
import { ACESFilmicToneMapping, AdditiveBlending, Vector3, type DirectionalLight, type FogExp2, type HemisphereLight, type Mesh, type MeshBasicMaterial, type PointLight } from "three";
import { frame, game } from "@/erebus/game";
import { HALL, halfWidthAt } from "@/erebus/hall";
import { controls } from "@/erebus/input";
import { useWorldStore, type Quality } from "@/store/world-store";
import { Hall, air, floorAt } from "./hall";
import { Foes, Hunter, Obelisks, Soldiers, Statues } from "./models";
import { Drops } from "./things";

/**
 * Erebus, drawn: the hall (hall.tsx), the obelisks along its nave, the
 * statues on its pedestals and the colossus behind the throne
 * (models.tsx). The simulation runs first in every frame (`Driver`),
 * then the camera follows the hunter without leaving the walls, then
 * everything draws what the simulation says.
 */

const DPR: Record<Quality, [number, number]> = { high: [1, 1.5], medium: [1, 1.25], low: [0.75, 1] };
/** soft shadows cost a third of the frame on a laptop GPU; hard ones cost next to nothing */
const SHADOWS: Record<Quality, "percentage" | "basic"> = { high: "percentage", medium: "basic", low: "basic" };
const FOG = "#07060f";

function Driver() {
  useFrame((_, delta) => frame(delta));
  return null;
}

/** the light that is not fire: moon, sky and the hunter's own lamp. They answer to what the System has done */
function Air() {
  const fog = useRef<FogExp2>(null);
  const hemi = useRef<HemisphereLight>(null);
  const moon = useRef<DirectionalLight>(null);
  const lamp = useRef<PointLight>(null);

  useFrame((_, delta) => {
    const sim = game.sim;
    if (!sim || !fog.current || !hemi.current || !lamp.current || !moon.current) return;
    const dt = Math.min(delta, 0.05);
    air.dark += ((sim.twist?.kind === "blackout" ? 1 : 0) - air.dark) * Math.min(1, dt * 2.5);
    const d = air.dark;
    fog.current.density = 0.024 + d * 0.07;
    hemi.current.intensity = 0.34 * (1 - d * 0.9);
    moon.current.intensity = 1.6 * (1 - d * 0.95);
    const h = sim.hunter;
    lamp.current.position.set(h.x - Math.sin(h.yaw) * 1.2, floorAt(h.x, h.z) + 2.8, h.z - Math.cos(h.yaw) * 1.2);
    lamp.current.intensity = 2.6 + Math.max(0, 1 - (sim.time - game.fx.level) * 0.8) * 40 + Math.max(0, 1 - (sim.time - game.fx.arise) * 0.7) * 60;
  });

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={[FOG, 0.024]} />
      <hemisphereLight ref={hemi} args={["#2c3060", "#0a0710", 0.34]} />
      {/* moonlight through the east windows: the one light that casts shadows, and it covers the whole hall */}
      <directionalLight
        ref={moon}
        color="#9fb0ff"
        intensity={1.6}
        position={[18, 24, 2]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0005}
        shadow-normalBias={0.05}
      />
      <pointLight ref={lamp} color="#b18cff" intensity={2.6} distance={7} decay={1.8} />
    </>
  );
}

/** reflections only: a dark studio of cold strips, so armour and stone catch a highlight */
function Reflections() {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={["#05040b"]} />
      <Lightformer intensity={0.6} color="#8f96c8" position={[0, 10, -20]} scale={[20, 6, 1]} />
      <Lightformer intensity={0.7} color="#9fb4ff" position={[20, 8, 0]} rotation-y={-Math.PI / 2} scale={[40, 3, 1]} />
      <Lightformer intensity={0.6} color="#ff9a5a" position={[-20, 4, 0]} rotation-y={Math.PI / 2} scale={[40, 2, 1]} />
    </Environment>
  );
}

/** rings on the floor under the hunter: the ward, a level or an ARISE, and the burst running outward */
function Aura() {
  const ring = useRef<Mesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const wave = useRef<Mesh>(null);
  const waveMat = useRef<MeshBasicMaterial>(null);
  useFrame((state) => {
    const sim = game.sim;
    if (!sim || !ring.current || !mat.current || !wave.current || !waveMat.current) return;
    const y = floorAt(sim.hunter.x, sim.hunter.z);
    const flash = Math.max(0, 1 - (sim.time - game.fx.level) * 0.9, 1 - (sim.time - game.fx.arise) * 0.7);
    ring.current.position.set(sim.hunter.x, y + 0.07, sim.hunter.z);
    ring.current.rotation.z = state.clock.elapsedTime * 0.8;
    ring.current.scale.setScalar(1 + (1 - flash) * (flash > 0 ? 4 : 0) + (sim.buffs.ward > 0 ? 0.25 : 0));
    mat.current.opacity = Math.max(flash, sim.buffs.ward > 0 ? 0.8 : sim.buffs.might > 0 || sim.buffs.haste > 0 ? 0.4 : 0.08);
    mat.current.color.set(flash > 0 ? "#e6cf9a" : sim.buffs.ward > 0 ? "#d9a441" : sim.buffs.might > 0 ? "#d9583a" : sim.buffs.haste > 0 ? "#7fcf9d" : "#a99cff");
    const burst = (sim.time - game.fx.burst) / 0.6;
    const on = burst > 0 && burst < 1;
    wave.current.visible = on;
    if (!on) return;
    wave.current.position.set(sim.hunter.x, y + 0.12, sim.hunter.z);
    wave.current.scale.setScalar(0.6 + burst * 6.5);
    waveMat.current.opacity = (1 - burst) * 0.9;
  });
  return (
    <>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 0.94, 48]} />
        <meshBasicMaterial ref={mat} toneMapped={false} transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={wave} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial ref={waveMat} color="#b9a8ff" toneMapped={false} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

const target = new Vector3();
const want = new Vector3();
const WALL = 0.8;
/** behind the hunter, drag to turn, wheel to zoom; it never leaves the hall */
function Rig() {
  const focus = useRef(new Vector3(HALL.spawn[0], 1.6, HALL.spawn[1]));
  const at = useRef(new Vector3(HALL.spawn[0], 4, HALL.spawn[1] + 6));
  useFrame((state, delta) => {
    const sim = game.sim;
    if (!sim) return;
    const dt = Math.min(delta, 0.05);
    const ground = floorAt(sim.hunter.x, sim.hunter.z);
    target.set(sim.hunter.x, ground + 1.7, sim.hunter.z);
    focus.current.lerp(target, Math.min(1, dt * 9));
    const flat = Math.cos(controls.pitch) * controls.distance;
    want.set(focus.current.x + Math.sin(controls.yaw) * flat, focus.current.y + Math.sin(controls.pitch) * controls.distance, focus.current.z + Math.cos(controls.yaw) * flat);
    // inside the walls, under the vault, above the floor it stands over
    want.z = Math.min(HALL.south + 1.4, Math.max(HALL.north + WALL, want.z));
    const hw = halfWidthAt(Math.min(HALL.south, want.z)) - WALL;
    want.x = Math.min(hw, Math.max(-hw, want.x));
    // a wall has pushed it closer than it wanted: it goes up instead, to see over what stands near
    const squeezed = Math.max(0, flat - Math.hypot(want.x - focus.current.x, want.z - focus.current.z));
    want.y = Math.min(HALL.ceiling, Math.max(floorAt(want.x, want.z) + 0.9, want.y + squeezed * 0.75));
    at.current.lerp(want, Math.min(1, dt * 10));
    const shake = game.fx.shake * 0.28;
    state.camera.position.set(at.current.x + (Math.random() - 0.5) * shake, at.current.y + (Math.random() - 0.5) * shake, at.current.z + (Math.random() - 0.5) * shake);
    state.camera.lookAt(focus.current);
  });
  return null;
}

function Effects({ quality }: { quality: Quality }) {
  if (quality === "low") return null;
  const high = quality === "high";
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* contact shadows under every body and step: the dearest pass, so only on high, at half size */}
      {high ? <N8AO aoRadius={1.2} intensity={2.4} distanceFalloff={0.6} quality="performance" halfRes /> : <></>}
      <Bloom mipmapBlur intensity={high ? 0.85 : 0.7} luminanceThreshold={0.72} luminanceSmoothing={0.25} radius={0.7} />
      <HueSaturation saturation={-0.14} />
      <BrightnessContrast brightness={0.02} contrast={0.12} />
      <Vignette offset={0.22} darkness={0.74} />
      <Noise opacity={0.04} premultiply />
      {high ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

export function World() {
  const quality = useWorldStore((s) => s.quality);
  const setQuality = useWorldStore((s) => s.setQuality);
  return (
    <Canvas
      style={{ touchAction: "none" }}
      shadows={SHADOWS[quality]}
      dpr={DPR[quality]}
      camera={{ position: [HALL.spawn[0], 4, HALL.spawn[1] + 6], fov: 50, near: 0.2, far: 160 }}
      gl={{ antialias: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <PerformanceMonitor
        flipflops={2}
        bounds={() => [42, 60]}
        onDecline={() => {
          // a backgrounded tab starves the frame loop: that is not the GPU struggling
          if (document.hidden) return;
          const q = useWorldStore.getState().quality;
          setQuality(q === "high" ? "medium" : "low");
        }}
      />
      <color attach="background" args={[FOG]} />
      <Driver />
      <Rig />
      <Air />
      <Aura />
      <Drops />
      <Suspense fallback={null}>
        <Reflections />
        <Hall quality={quality} />
        <Obelisks />
        <Statues />
        <Hunter />
        <Soldiers />
        <Foes />
      </Suspense>
      <Effects quality={quality} />
    </Canvas>
  );
}
