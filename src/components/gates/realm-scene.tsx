"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import { planets } from "@/config/realm.config";
import type { Planet } from "@/config/types";
import { airFragment, KIND_INDEX, planetFragment, planetVertex, ringFragment, ringVertex, starFragment } from "./planet-shaders";

const TAU = Math.PI * 2;
/** uncharted worlds are drawn at this fraction of their light */
const DIM = 0.5;
const STAR_RADIUS = 1.7;

/** one clock for every shader in the realm; `Flight` advances it each frame */
const time = { value: 0 };

/** shared by the planets (which write) and the camera (which reads): where each world is this frame */
const positions = planets.map(() => new Vector3());

function orbitAngle(planet: Planet, t: number) {
  return planet.phase * TAU + (t * 0.02) / Math.sqrt(planet.orbit);
}

function World({ planet, index, sealed, selected, label, still, onSelect }: { planet: Planet; index: number; sealed: boolean; selected: boolean; label?: string; still: boolean; onSelect: () => void }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const cage = useRef<Mesh>(null);
  const moons = useRef<Group>(null);
  const dim = planet.gate ? 1 : DIM;
  const [low, high, glow] = planet.palette;

  const surface = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uKind: { value: KIND_INDEX[planet.kind] },
          uLow: { value: new Color(low) },
          uHigh: { value: new Color(high) },
          uGlow: { value: new Color(glow) },
          uTime: time,
          uDim: { value: dim },
          uSeed: { value: index * 7.31 },
        },
      }),
    [planet.kind, low, high, glow, dim, index],
  );
  const air = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: airFragment,
        uniforms: { uGlow: { value: new Color(glow) }, uDim: { value: dim } },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [glow, dim],
  );
  const inner = planet.size * 1.45;
  const outer = planet.size * 2.35;
  const ring = useMemo(
    () =>
      planet.ring
        ? new ShaderMaterial({
            vertexShader: ringVertex,
            fragmentShader: ringFragment,
            uniforms: { uGlow: { value: new Color(glow) }, uInner: { value: inner }, uOuter: { value: outer }, uBroken: { value: planet.ring === "broken" ? 1 : 0 }, uDim: { value: dim } },
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
          })
        : null,
    [planet.ring, glow, inner, outer, dim],
  );
  useEffect(() => () => (surface.dispose(), air.dispose(), ring?.dispose()), [surface, air, ring]);

  useFrame(({ clock }, dt) => {
    const t = still ? 0 : clock.elapsedTime;
    const a = orbitAngle(planet, t);
    positions[index].set(Math.cos(a) * planet.orbit, 0, Math.sin(a) * planet.orbit);
    group.current?.position.copy(positions[index]);
    if (body.current && !still) body.current.rotation.y += dt * (planet.kind === "gas" ? 0.09 : 0.045);
    if (cage.current) {
      cage.current.rotation.y -= dt * 0.12;
      cage.current.rotation.x += dt * 0.05;
    }
    if (moons.current) moons.current.rotation.y = clock.elapsedTime * 0.22 + index;
  });

  return (
    <group ref={group}>
      <group rotation={[0, 0, planet.tilt]}>
        <mesh
          ref={body}
          material={surface}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          {/* the crystal world is a coarse solid so its facets show; the rest are smooth */}
          {planet.kind === "crystal" ? <icosahedronGeometry args={[planet.size, 2]} /> : <sphereGeometry args={[planet.size, 96, 64]} />}
        </mesh>
        {planet.kind !== "barren" && planet.kind !== "crystal" && (
          <mesh material={air} scale={1.16}>
            <sphereGeometry args={[planet.size, 48, 32]} />
          </mesh>
        )}
        {ring && (
          <mesh material={ring} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[inner, outer, 160, 1]} />
          </mesh>
        )}
        <group ref={moons}>
          {Array.from({ length: planet.moons ?? 0 }, (_, m) => (
            <mesh key={m} position={[Math.cos(m * 2.4) * planet.size * (2.7 + m * 0.9), (m - 0.5) * planet.size * 0.4, Math.sin(m * 2.4) * planet.size * (2.7 + m * 0.9)]}>
              <sphereGeometry args={[planet.size * (0.13 - m * 0.03), 24, 16]} />
              <meshStandardMaterial color="#8d8793" roughness={1} />
            </mesh>
          ))}
        </group>
      </group>
      {/* seen from afar, a charted world carries its name */}
      {label && (
        <Html center position={[0, planet.size * 1.9 + 1.2, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <span className="font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-white/85 uppercase">{label}</span>
        </Html>
      )}
      {/* a sealed gate: a cage of light turning around its world */}
      {sealed && (
        <mesh ref={cage}>
          <icosahedronGeometry args={[planet.size * 1.34, 1]} />
          <meshBasicMaterial color="#f3c96b" wireframe transparent opacity={selected ? 0.5 : 0.22} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Star() {
  const material = useMemo(() => new ShaderMaterial({ vertexShader: planetVertex, fragmentShader: starFragment, uniforms: { uTime: time } }), []);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group>
      <mesh material={material}>
        <sphereGeometry args={[STAR_RADIUS, 64, 48]} />
      </mesh>
      {/* the only real light in the scene: it lights the moons */}
      <pointLight color="#ffe2b8" intensity={900} decay={2} />
    </group>
  );
}

function Orbits({ selected }: { selected: number | null }) {
  const circle = useMemo(() => {
    const pts = new Float32Array(257 * 3);
    for (let i = 0; i <= 256; i++) {
      pts[i * 3] = Math.cos((i / 256) * TAU);
      pts[i * 3 + 2] = Math.sin((i / 256) * TAU);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <>
      {planets.map((p, i) => (
        <lineLoop key={p.id} geometry={circle} scale={p.orbit}>
          <lineBasicMaterial color={p.gate ? "#c9b6ff" : "#ffffff"} transparent opacity={selected === i ? 0.4 : p.gate ? 0.16 : 0.07} />
        </lineLoop>
      ))}
    </>
  );
}

function Sky() {
  const geometry = useMemo(() => {
    const count = 2200;
    const pts = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    // a fixed pseudo-random sequence: the same sky on every visit
    let seed = 82;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const a = rand() * TAU;
      const r = 150 + rand() * 60;
      const s = Math.sqrt(1 - u * u);
      pts.set([Math.cos(a) * s * r, u * r * 0.8, Math.sin(a) * s * r], i * 3);
      const warm = rand();
      const b = 0.35 + rand() * 0.65;
      col.set([b * (0.8 + warm * 0.2), b * 0.85, b * (1 - warm * 0.25)], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pts, 3));
    g.setAttribute("color", new BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

const UP = new Vector3(0, 1, 0);
const want = new Vector3();
const look = new Vector3();
const side = new Vector3();
const toStar = new Vector3();

/** flies the camera: to the selected world, or back out to see the whole realm */
function Flight({ selected, still }: { selected: number | null; still: boolean }) {
  const { camera, size } = useThree();
  const aim = useRef(new Vector3(0, 0, 0));
  const shift = useRef({ x: 0, y: 0 });
  useFrame(({ clock }, dt) => {
    time.value = clock.elapsedTime;
    const aspect = size.width / size.height;
    const narrow = aspect < 0.9;
    let sx = 0;
    let sy = 0;
    if (selected === null) {
      // far enough to hold the widest orbit, whatever the shape of the screen
      const reach = 47 * Math.max(1, 1.25 / aspect);
      want.set(0, reach * 0.62, reach * 1.02);
      look.set(0, 0, 0);
      sx = narrow ? 0 : 0.14;
      sy = narrow ? -0.12 : 0.03;
    } else {
      const p = planets[selected];
      const at = positions[selected];
      toStar.copy(at).multiplyScalar(-1).normalize();
      side.crossVectors(UP, toStar);
      const spread = (p.ring ? 2.3 : 1.25) * p.size;
      const distance = spread * (narrow ? 5.6 / aspect : 6.2);
      want.copy(toStar).multiplyScalar(0.5).addScaledVector(side, 0.82).addScaledVector(UP, 0.26).normalize().multiplyScalar(distance).add(at);
      look.copy(at);
      // room for the text: beside the world on a wide screen, under it on a narrow one
      sx = narrow ? 0 : 0.17;
      sy = narrow ? -0.085 : 0;
    }
    const k = still ? 1 : 1 - Math.exp(-dt * 2.4);
    camera.position.lerp(want, k);
    aim.current.lerp(look, k);
    shift.current.x = MathUtils.lerp(shift.current.x, sx, k);
    shift.current.y = MathUtils.lerp(shift.current.y, sy, k);
    camera.lookAt(aim.current);
    camera.rotateY(shift.current.x);
    camera.rotateX(shift.current.y);
  });
  return null;
}

export interface RealmSceneProps {
  /** index into `planets`; null shows the whole realm */
  selected: number | null;
  sealed: boolean[];
  /** the name of the gate each world holds, if any */
  names: (string | undefined)[];
  still: boolean;
  onSelect: (index: number) => void;
  onReady: () => void;
}

/** The Gate Realm in 3D: a star, seven worlds, and a camera that travels between them. */
export default function RealmScene({ selected, sealed, names, still, onSelect, onReady }: RealmSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 46, 74], fov: 36, near: 0.1, far: 600 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={onReady}
    >
      <color attach="background" args={["#030208"]} />
      <Sky />
      <Star />
      <Orbits selected={selected} />
      {planets.map((p, i) => (
        <World key={p.id} planet={p} index={i} sealed={sealed[i]} selected={selected === i} label={selected === null ? names[i] : undefined} still={still} onSelect={() => onSelect(i)} />
      ))}
      <Flight selected={selected} still={still} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.7} luminanceSmoothing={0.25} radius={0.8} />
        <Vignette darkness={0.7} offset={0.25} />
      </EffectComposer>
    </Canvas>
  );
}
