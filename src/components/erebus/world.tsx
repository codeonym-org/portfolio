"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ACESFilmicToneMapping, AdditiveBlending, BackSide, Color, Object3D, Vector3, type DirectionalLight, type Fog, type HemisphereLight, type InstancedMesh, type Mesh, type MeshBasicMaterial, type PointLight, type ShaderMaterial } from "three";
import { frame, game } from "@/erebus/game";
import { controls } from "@/erebus/input";
import { rngFrom } from "@/erebus/rules";
import { ARENA } from "@/erebus/sim";
import { useWorldStore, type Quality } from "@/store/world-store";
import { Foes, Hunter, Obelisks, Ruins, Soldiers } from "./models";
import { Drops } from "./things";

/**
 * Erebus, drawn: a black plateau cracked by something still burning
 * underneath, a ring of obelisks, ruins at the rim, a broken moon.
 * The ground is a shader; the bodies and the stone are models
 * (models.tsx). The
 * simulation runs first in every frame (`Driver`), then the camera
 * follows the hunter, then everything draws what the simulation says.
 */

const SKY = "#06040a";
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
  uniform float uTime;
  uniform vec3 uCrack;
  uniform vec3 uSky;
  uniform vec3 uHunter;
  uniform float uHeat;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uArena;
  uniform float uBurst;
  varying vec3 vWorld;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  // distance to the nearest cell border: the cracks
  float cracks(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    vec2 nearest;
    float best = 8.0;
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 r = g + hash2(n + g) - f;
        float d = dot(r, r);
        if (d < best) { best = d; nearest = r; }
      }
    float edge = 8.0;
    for (int j = -2; j <= 2; j++)
      for (int i = -2; i <= 2; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 r = g + hash2(n + g) - f;
        if (dot(nearest - r, nearest - r) > 0.0001) edge = min(edge, dot(0.5 * (nearest + r), normalize(r - nearest)));
      }
    return edge;
  }

  void main() {
    vec2 p = vWorld.xz;
    float radius = length(p);
    float big = cracks(p * 0.11);
    float small = cracks(p * 0.42 + 7.3);
    float pulse = 0.6 + 0.4 * sin(uTime * 0.7 + radius * 0.15);
    float glow = smoothstep(0.02, 0.0, big) * 1.15 + smoothstep(0.016, 0.0, small) * 0.1;
    // heat bleeding out of the wide cracks
    glow += smoothstep(0.3, 0.0, big) * 0.045;
    vec3 rock = vec3(0.026, 0.022, 0.034) + 0.022 * smoothstep(0.0, 0.5, small);
    // the hunter's own light on the ground
    float near = 1.0 - smoothstep(0.0, 11.0, distance(p, uHunter.xz));
    rock += vec3(0.02, 0.035, 0.07) * near;
    vec3 col = rock + uCrack * glow * pulse * uHeat;
    // the edge of the plateau
    float rim = smoothstep(0.5, 0.0, abs(radius - uArena));
    col += uCrack * rim * 1.4;
    col *= 1.0 - 0.75 * smoothstep(uArena, uArena + 26.0, radius);
    // the burst: a ring that runs outward from the hunter
    float wave = abs(distance(p, uHunter.xz) - uBurst * 16.0);
    col += vec3(0.55, 0.45, 1.0) * smoothstep(0.9, 0.0, wave) * (1.0 - uBurst) * step(0.001, uBurst);
    float fog = smoothstep(uFogNear, uFogFar, distance(vWorld, cameraPosition));
    gl_FragColor = vec4(mix(col, uSky, fog), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const CRACK: Record<string, string> = { default: "#ff3a14", frenzy: "#ff7a10", calm: "#2f7dff", time_slow: "#35d6c4", echo_rain: "#5fd8ff", mirror: "#c04cff", giants: "#ff2a5a", tremor: "#ff2a10", blackout: "#5a0d06" };

/** the ground, the light and the fog: they all answer to what the System has done to the world */
function Plateau() {
  const mat = useRef<ShaderMaterial>(null);
  const fog = useRef<Fog>(null);
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const lamp = useRef<PointLight>(null);
  const dark = useRef(0);
  const crack = useRef(new Color(CRACK.default));
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCrack: { value: new Color(CRACK.default) },
      uSky: { value: new Color(SKY) },
      uHunter: { value: new Vector3() },
      uHeat: { value: 1 },
      uFogNear: { value: 34 },
      uFogFar: { value: 120 },
      uArena: { value: ARENA },
      uBurst: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const sim = game.sim;
    const m = mat.current;
    if (!sim || !m || !fog.current || !hemi.current || !sun.current || !lamp.current) return;
    const dt = Math.min(delta, 0.05);
    const twist = sim.twist?.kind;
    dark.current += ((twist === "blackout" ? 1 : 0) - dark.current) * Math.min(1, dt * 2.5);
    const d = dark.current;
    crack.current.lerp(tint.set(CRACK[twist ?? "default"] ?? CRACK.default), Math.min(1, dt * 3));
    const u = m.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uCrack.value.copy(crack.current);
    u.uHunter.value.set(sim.hunter.x, 0, sim.hunter.z);
    u.uHeat.value = 1 + (twist === "frenzy" || twist === "tremor" ? 0.8 : 0) + Math.max(0, 1 - (sim.time - game.fx.hurt) * 3) * 0.8;
    const burst = (sim.time - game.fx.burst) / 0.7;
    u.uBurst.value = burst > 0 && burst < 1 ? burst : 0;
    const near = 34 - d * 28;
    const far = 120 - d * 96;
    u.uFogNear.value = fog.current.near = near;
    u.uFogFar.value = fog.current.far = far;
    hemi.current.intensity = 0.7 * (1 - d * 0.9);
    sun.current.intensity = 1.5 * (1 - d * 0.95);
    lamp.current.position.set(sim.hunter.x, 2.4, sim.hunter.z);
    lamp.current.intensity = 26 + Math.max(0, 1 - (sim.time - game.fx.level) * 0.8) * 120 + Math.max(0, 1 - (sim.time - game.fx.arise) * 0.7) * 160;
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={[SKY, 34, 120]} />
      <hemisphereLight ref={hemi} args={["#4a4470", "#120608", 0.7]} />
      <directionalLight ref={sun} color="#b9c6ff" intensity={1.5} position={[-30, 50, -20]} />
      <pointLight ref={lamp} color="#7aa8ff" intensity={26} distance={16} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ARENA + 46, 96]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={groundVertex} fragmentShader={groundFragment} />
      </mesh>
    </>
  );
}
const tint = new Color();

const SPIRES = 90;
/** obsidian spires around the plateau: the wall of the arena */
function Spires() {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const r = rngFrom(41);
    const o = new Object3D();
    for (let i = 0; i < SPIRES; i++) {
      const a = r() * Math.PI * 2;
      const d = ARENA + 12 + Math.pow(r(), 1.6) * 34;
      const h = 3 + r() * 9 + (d - ARENA) * 0.35;
      o.position.set(Math.sin(a) * d, h / 2 - 0.4, Math.cos(a) * d);
      o.rotation.set((r() - 0.5) * 0.35, r() * 6.28, (r() - 0.5) * 0.35);
      o.scale.set(0.8 + r() * 1.8, h, 0.8 + r() * 1.8);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SPIRES]} frustumCulled={false}>
      <coneGeometry args={[1, 1, 5]} />
      <meshStandardMaterial color="#0a0910" roughness={0.35} metalness={0.6} flatShading />
    </instancedMesh>
  );
}

const emberVertex = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCentre;
  attribute float aSeed;
  varying float vLife;
  void main() {
    vec3 p = position;
    float rise = fract(aSeed + uTime * (0.03 + aSeed * 0.05));
    p.y = rise * 16.0;
    // the cloud of embers travels with the hunter
    p.xz = mod(p.xz - uCentre.xz + 35.0, 70.0) - 35.0 + uCentre.xz;
    p.x += sin(uTime * 0.6 + aSeed * 40.0) * 0.8;
    vLife = sin(rise * 3.1416);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.0 + aSeed * 5.0) * (30.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const emberFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(uColor * 1.6, smoothstep(0.5, 0.0, d) * vLife * 0.8);
  }
`;

function Embers({ count }: { count: number }) {
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
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uCentre: { value: new Vector3() }, uColor: { value: new Color("#ff6a2a") } }), []);
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

/** a moon with a piece missing, low over the rim */
function Moon() {
  return (
    <group position={[-70, 46, -150]}>
      <mesh>
        <sphereGeometry args={[22, 40, 32]} />
        <meshStandardMaterial color="#1b1420" emissive="#2a0f12" emissiveIntensity={0.7} roughness={1} fog={false} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[22, 32, 24]} />
        <meshBasicMaterial color="#ff3a14" transparent opacity={0.07} side={BackSide} blending={AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <mesh position={[15, 12, 12]}>
        <sphereGeometry args={[10, 24, 20]} />
        <meshBasicMaterial color={SKY} fog={false} />
      </mesh>
    </group>
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
    mat.current.opacity = Math.max(flash, sim.buffs.ward > 0 ? 0.8 : sim.buffs.might > 0 || sim.buffs.haste > 0 ? 0.5 : 0.22);
    mat.current.color.set(flash > 0 ? "#f5d27a" : sim.buffs.ward > 0 ? "#f5b83d" : sim.buffs.might > 0 ? "#ff5a3a" : sim.buffs.haste > 0 ? "#5dff9b" : "#5f9bff");
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.95, 1.08, 6]} />
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
      gl={{ antialias: quality === "low", powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
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
      <color attach="background" args={[SKY]} />
      <Driver />
      <Rig />
      <Plateau />
      <Spires />
      <Moon />
      <Stars radius={160} depth={60} count={quality === "low" ? 700 : 1800} factor={5} saturation={0} fade speed={0.4} />
      <Embers count={quality === "low" ? 120 : 320} />
      <Aura />
      <Drops />
      <Suspense fallback={null}>
        <Obelisks />
        <Hunter />
        <Soldiers />
        <Foes />
        <Ruins />
      </Suspense>
      {quality !== "low" && (
        <EffectComposer multisampling={quality === "high" ? 4 : 0}>
          <Bloom mipmapBlur intensity={quality === "high" ? 1.05 : 0.8} luminanceThreshold={0.62} luminanceSmoothing={0.3} radius={0.7} />
          <Vignette darkness={0.78} offset={0.2} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
