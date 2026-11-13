"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, HueSaturation, Noise, Vignette } from "@react-three/postprocessing";
import { ACESFilmicToneMapping, AdditiveBlending, Color, Vector3, type FogExp2, type HemisphereLight, type Mesh, type MeshBasicMaterial, type PointLight, type ShaderMaterial } from "three";
import { frame, game } from "@/erebus/game";
import { controls } from "@/erebus/input";
import { rngFrom } from "@/erebus/rules";
import { ARENA } from "@/erebus/sim";
import { useWorldStore, type Quality } from "@/store/world-store";
import { Foes, Hunter, Obelisks, Ruins, Soldiers } from "./models";
import { Cavern, FOG } from "./cavern";
import { Drops } from "./things";

/**
 * Erebus, drawn: a cavern with a ruin left inside it (cavern.tsx), a
 * ring of obelisks on the flat ground and statues in the dark behind
 * the rock columns. The bodies and the carved stone are models
 * (models.tsx). The simulation runs first in every frame (`Driver`),
 * then the camera follows the hunter, then everything draws what the
 * simulation says.
 */

const DPR: Record<Quality, [number, number]> = { high: [1, 2], medium: [1, 1.5], low: [0.75, 1] };

function Driver() {
  useFrame((_, delta) => frame(delta));
  return null;
}

const groundVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const groundFragment = /* glsl */ `
  uniform vec3 uHunter;
  uniform float uBurst;
  uniform float uHurt;
  varying vec3 vWorld;
  void main() {
    float d = distance(vWorld.xz, uHunter.xz);
    // the burst: one ring that runs outward from the hunter
    float wave = abs(d - uBurst * 16.0);
    vec3 col = vec3(0.62, 0.72, 0.95) * smoothstep(0.7, 0.0, wave) * (1.0 - uBurst) * step(0.001, uBurst);
    // a blow taken: the ground under the hunter darkens red for a moment
    col += vec3(0.28, 0.02, 0.01) * uHurt * smoothstep(5.0, 0.0, d);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** the air and the little light that is not fire or sky: they answer to what the System has done */
function Air() {
  const mat = useRef<ShaderMaterial>(null);
  const fog = useRef<FogExp2>(null);
  const hemi = useRef<HemisphereLight>(null);
  const lamp = useRef<PointLight>(null);
  const dark = useRef(0);
  const uniforms = useMemo(() => ({ uHunter: { value: new Vector3() }, uBurst: { value: 0 }, uHurt: { value: 0 } }), []);

  useFrame((_, delta) => {
    const sim = game.sim;
    const m = mat.current;
    if (!sim || !m || !fog.current || !hemi.current || !lamp.current) return;
    const dt = Math.min(delta, 0.05);
    dark.current += ((sim.twist?.kind === "blackout" ? 1 : 0) - dark.current) * Math.min(1, dt * 2.5);
    const d = dark.current;
    const u = m.uniforms;
    u.uHunter.value.set(sim.hunter.x, 0, sim.hunter.z);
    const burst = (sim.time - game.fx.burst) / 0.7;
    u.uBurst.value = burst > 0 && burst < 1 ? burst : 0;
    u.uHurt.value = Math.max(0, 1 - (sim.time - game.fx.hurt) * 3);
    fog.current.density = 0.015 + d * 0.06;
    hemi.current.intensity = 0.6 * (1 - d * 0.9);
    lamp.current.position.set(sim.hunter.x, 2.6, sim.hunter.z);
    lamp.current.intensity = 5 + Math.max(0, 1 - (sim.time - game.fx.level) * 0.8) * 90 + Math.max(0, 1 - (sim.time - game.fx.arise) * 0.7) * 130;
  });

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={[FOG, 0.015]} />
      <hemisphereLight ref={hemi} args={["#56657c", "#1a1410", 0.6]} />
      <pointLight ref={lamp} color="#b9c6dc" intensity={5} distance={20} decay={1.8} />
      {/* light laid over the floor: the burst, and a blow taken */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[ARENA + 2, 64]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={groundVertex} fragmentShader={groundFragment} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </>
  );
}

const emberVertex = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCentre;
  attribute float aSeed;
  varying float vLife;
  void main() {
    vec3 p = position;
    // dust: it hangs, and sinks so slowly you only see it where the light is
    float rise = 1.0 - fract(aSeed * 7.0 + uTime * (0.006 + aSeed * 0.012));
    p.y = rise * 14.0;
    // the cloud travels with the hunter
    p.xz = mod(p.xz - uCentre.xz + 35.0, 70.0) - 35.0 + uCentre.xz;
    p.x += sin(uTime * 0.21 + aSeed * 40.0) * 0.9;
    p.z += cos(uTime * 0.17 + aSeed * 23.0) * 0.9;
    vLife = sin(rise * 3.1416);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.0 + aSeed * 2.4) * (30.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const emberFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vLife * 0.2);
  }
`;

function Dust({ count }: { count: number }) {
  const mat = useRef<ShaderMaterial>(null);
  const [positions, seeds] = useMemo(() => {
    const r = rngFrom(9);
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = r() * 70;
      p[i * 3 + 2] = r() * 70;
      s[i] = r();
    }
    return [p, s];
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uCentre: { value: new Vector3() }, uColor: { value: new Color("#8fa0b8") } }), []);
  useFrame((state) => {
    const sim = game.sim;
    if (!mat.current || !sim) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uCentre.value.set(sim.hunter.x, 0, sim.hunter.z);
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={emberVertex} fragmentShader={emberFragment} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

/** rings on the ground under the hunter: the ward, and the flash of a level or an ARISE */
function Aura() {
  const ring = useRef<Mesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  useFrame((state) => {
    const sim = game.sim;
    if (!sim || !ring.current || !mat.current) return;
    const flash = Math.max(0, 1 - (sim.time - game.fx.level) * 0.9, 1 - (sim.time - game.fx.arise) * 0.7);
    ring.current.position.set(sim.hunter.x, 0.07, sim.hunter.z);
    ring.current.rotation.z = state.clock.elapsedTime * 0.8;
    ring.current.scale.setScalar(1 + (1 - flash) * (flash > 0 ? 5 : 0) + (sim.buffs.ward > 0 ? 0.25 : 0));
    mat.current.opacity = Math.max(flash, sim.buffs.ward > 0 ? 0.8 : sim.buffs.might > 0 || sim.buffs.haste > 0 ? 0.4 : 0.1);
    mat.current.color.set(flash > 0 ? "#e6cf9a" : sim.buffs.ward > 0 ? "#d9a441" : sim.buffs.might > 0 ? "#d9583a" : sim.buffs.haste > 0 ? "#7fcf9d" : "#9fb4d6");
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.0, 1.05, 48]} />
      <meshBasicMaterial ref={mat} toneMapped={false} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

const target = new Vector3();
const want = new Vector3();
function Rig() {
  const focus = useRef(new Vector3(0, 1.4, 0));
  useFrame((state, delta) => {
    const sim = game.sim;
    if (!sim) return;
    const dt = Math.min(delta, 0.05);
    target.set(sim.hunter.x, 1.5, sim.hunter.z);
    focus.current.lerp(target, Math.min(1, dt * 9));
    const flat = Math.cos(controls.pitch) * controls.distance;
    want.set(focus.current.x + Math.sin(controls.yaw) * flat, focus.current.y + Math.sin(controls.pitch) * controls.distance, focus.current.z + Math.cos(controls.yaw) * flat);
    const shake = game.fx.shake * 0.35;
    state.camera.position.set(want.x + (Math.random() - 0.5) * shake, want.y + (Math.random() - 0.5) * shake, want.z + (Math.random() - 0.5) * shake);
    state.camera.lookAt(focus.current);
  });
  return null;
}

export function World() {
  const quality = useWorldStore((s) => s.quality);
  const setQuality = useWorldStore((s) => s.setQuality);
  return (
    <Canvas
      style={{ touchAction: "none" }}
      dpr={DPR[quality]}
      camera={{ position: [0, 9, -12], fov: 50, near: 0.2, far: 400 }}
      gl={{ antialias: quality === "low", powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
    >
      <PerformanceMonitor
        flipflops={2}
        bounds={() => [35, 60]}
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
      <Dust count={quality === "low" ? 140 : 380} />
      <Aura />
      <Drops />
      <Suspense fallback={null}>
        <Obelisks />
        <Hunter />
        <Soldiers />
        <Foes />
        <Ruins />
        <Cavern />
      </Suspense>
      {quality !== "low" && (
        <EffectComposer multisampling={quality === "high" ? 4 : 0}>
          <Bloom mipmapBlur intensity={quality === "high" ? 0.55 : 0.45} luminanceThreshold={0.78} luminanceSmoothing={0.25} radius={0.65} />
          <HueSaturation saturation={-0.12} />
          <Noise opacity={0.07} premultiply />
          <Vignette darkness={0.86} offset={0.22} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
