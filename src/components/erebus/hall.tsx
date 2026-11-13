"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import { AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, Raycaster, ShaderMaterial, Vector3, type Mesh, type MeshStandardMaterial, type Object3D, type PointLight } from "three";
import { HALL } from "@/erebus/hall";
import type { Quality } from "@/store/world-store";

/**
 * The hall Erebus is fought in: the throne room of the live record,
 * drained of daylight. A nave with sunken side floors, torches on the
 * walls, two fire bowls beside the throne, moonlight through the
 * windows and mist on the floor. The model is restyled here by
 * material name, so the file stays as it was made (source and
 * license: scripts/assets/README.md). Its floor plan, for the game's
 * rules, is `src/erebus/hall.ts`.
 */

export const HALL_MODEL = "/models/erebus/hall.glb";
useGLTF.preload(HALL_MODEL, false, true);

/** what the scene shares about the air: 1 while the System has put the lights out */
export const air = { dark: 0, time: 0 };

/* ── the floor is not flat: its height, measured once from the model ── */

const STEP = 0.3;
const X0 = -9;
const Z0 = -20.7;
const COLS = Math.ceil(18 / STEP) + 1;
const ROWS = Math.ceil(50 / STEP) + 1;
let heights: Float32Array | null = null;

function measure(floors: Object3D[]) {
  const grid = new Float32Array(COLS * ROWS);
  const ray = new Raycaster();
  const from = new Vector3();
  const down = new Vector3(0, -1, 0);
  ray.far = 6;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      from.set(X0 + c * STEP, 3, Z0 + r * STEP);
      ray.set(from, down);
      const hit = ray.intersectObjects(floors, false)[0];
      grid[r * COLS + c] = hit ? hit.point.y : 0;
    }
  }
  heights = grid;
}

/** how high the floor is under (x, z); 0 until the hall has loaded */
export function floorAt(x: number, z: number): number {
  if (!heights) return 0;
  const fx = Math.min(COLS - 1.001, Math.max(0, (x - X0) / STEP));
  const fz = Math.min(ROWS - 1.001, Math.max(0, (z - Z0) / STEP));
  const c = Math.floor(fx);
  const r = Math.floor(fz);
  const tx = fx - c;
  const tz = fz - r;
  const at = (rr: number, cc: number) => heights![rr * COLS + cc];
  return (at(r, c) * (1 - tx) + at(r, c + 1) * tx) * (1 - tz) + (at(r + 1, c) * (1 - tx) + at(r + 1, c + 1) * tx) * tz;
}

/* ── the stone, restyled ── */

const ARCANE = "#8b5cf6";
const EMBER = "#ff7a2f";

/** grey out the stained glass and tint it: moonlight, not daylight */
function monochrome(material: MeshBasicMaterial, tint: Color) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = { value: tint };
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uTint;").replace(
      "#include <map_fragment>",
      `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = uTint * (0.35 + pow(lum, 1.4) * 2.2);`,
    );
  };
  material.customProgramCacheKey = () => "erebus-glass";
}

function desaturate(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))) * vec3(0.8, 0.82, 1.0);`,
    );
  };
  material.customProgramCacheKey = () => "erebus-desaturate";
}

/** the walls carry the windows in their colour and glow maps: grey stone, and glass that glows cold */
function moonlitGlass(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#ifdef USE_EMISSIVEMAP
          vec4 glassTexel = texture2D(emissiveMap, vEmissiveMapUv);
          float glass = dot(glassTexel.rgb, vec3(0.299, 0.587, 0.114));
          totalEmissiveRadiance *= pow(glass, 1.3) * 1.6;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "erebus-moonlit";
}

/**
 * `cheap`: matte stone lit per pixel without the metal-and-gloss model or
 * normal maps. On a laptop GPU that model, times every light, is most of
 * the frame, and in a hall this dark the difference is hard to find.
 */
function restyle(scene: Object3D, cheap: boolean) {
  const floors: Mesh[] = [];
  scene.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    // the material the file came with: kept, so the hall can be restyled again when the quality changes
    const src = ((mesh.userData.src as MeshStandardMaterial | undefined) ?? (mesh.userData.src = mesh.material)) as MeshStandardMaterial;
    const name = `${mesh.name} ${src.name}`;
    mesh.receiveShadow = true;
    mesh.castShadow = !/Glass|Chandelier|Flag/.test(name);
    if (/Glass/.test(name)) {
      const glass = new MeshBasicMaterial({ map: src.map ?? src.emissiveMap, toneMapped: false });
      monochrome(glass, new Color(ARCANE).multiplyScalar(1.05));
      mesh.material = glass;
      mesh.castShadow = false;
      return;
    }
    const matte = cheap && !/Throne/.test(name);
    const m = matte
      ? (new MeshLambertMaterial({ name: src.name, map: src.map, color: src.color, emissive: src.emissive, emissiveMap: src.emissiveMap, emissiveIntensity: src.emissiveIntensity, side: src.side, transparent: src.transparent, alphaTest: src.alphaTest }) as unknown as MeshStandardMaterial)
      : src.clone();
    if (/Carpet/.test(name)) {
      m.color = new Color("#1a1422");
      m.roughness = 0.95;
      floors.push(mesh);
    } else if (/Flag|Amblem/.test(name)) {
      m.color = new Color("#4a3384");
      m.emissive = new Color("#150a30");
      m.emissiveIntensity = 0.5;
    } else if (/Windows/.test(name)) desaturate(m);
    else if (/Throne/.test(name)) {
      m.color = new Color("#3a3552");
      m.metalness = 0.6;
      m.roughness = 0.35;
    } else if (/Wall_Base/.test(name)) {
      m.color = new Color("#8f8ea3");
      m.emissive = new Color("#7d7cff");
      m.emissiveIntensity = 1.3;
      moonlitGlass(m);
    } else if (/BaseGround/.test(name)) {
      // matte: polished boards streak every torch across the floor
      m.color = new Color("#8b8898");
      m.roughness = 1;
      m.metalness = 0;
      m.envMapIntensity = 0.4;
      floors.push(mesh);
    } else m.color = new Color(m.color).multiply(new Color("#a8a4c0"));
    mesh.material = m;
  });
  scene.updateMatrixWorld(true);
  measure(floors);
}

/* ── fire, moonlight and mist: three small shaders ── */

const noiseGlsl = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
`;

const clock = { value: 0 };
const power = { value: 1 };

function flameMaterial(seed: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: clock, uPower: power, uSeed: { value: seed }, uColor: { value: new Color(EMBER) }, uCore: { value: new Color("#ffe7b0") } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // a card that keeps its centre and faces the camera
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        mv.xy += position.xy * scale;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uPower;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform vec3 uCore;
      varying vec2 vUv;
      ${noiseGlsl}
      void main() {
        float t = uTime * 1.6 + uSeed * 7.0;
        vec2 p = vUv;
        float n = noise(vec2(p.x * 4.0 + uSeed, p.y * 3.0 - t * 2.2)) * 0.6 + noise(vec2(p.x * 9.0, p.y * 7.0 - t * 3.5)) * 0.4;
        float sway = (noise(vec2(t * 0.7, uSeed)) - 0.5) * 0.18 * p.y;
        float width = mix(0.36, 0.02, pow(p.y, 0.8));
        float d = abs(p.x - 0.5 - sway) / width;
        float body = smoothstep(1.0, 0.2, d + (n - 0.5) * 0.9 * p.y) * smoothstep(1.0, 0.55, p.y + n * 0.25) * smoothstep(0.0, 0.08, p.y);
        float hot = smoothstep(0.55, 0.0, d) * smoothstep(0.55, 0.05, p.y);
        vec3 col = mix(uColor, uCore, hot) * (1.6 + hot * 2.0);
        gl_FragColor = vec4(col, body * (0.75 + 0.25 * n) * uPower);
      }
    `,
  });
}

function shaftMaterial(strength: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    uniforms: { uTime: clock, uColor: { value: new Color("#8fa2ff") }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vWorld;
      ${noiseGlsl}
      void main() {
        float edge = pow(sin(vUv.x * 3.14159), 2.0);
        // brightest at the window, gone before the floor
        float fall = smoothstep(0.0, 0.25, vUv.y) * pow(vUv.y, 0.6);
        float drift = 0.65 + 0.35 * noise(vec2(vWorld.x * 0.6 + uTime * 0.05, vWorld.y * 0.4 - uTime * 0.08));
        gl_FragColor = vec4(uColor, edge * fall * drift * 0.16 * uStrength);
      }
    `,
  });
}

function mistMaterial(strength: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: { uTime: clock, uColor: { value: new Color("#8a93c8") }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec3 vWorld;
      varying vec2 vUv;
      ${noiseGlsl}
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; } return v; }
      void main() {
        vec2 p = vWorld.xz * 0.18;
        float n = fbm(p + vec2(uTime * 0.03, uTime * 0.02)) * 0.6 + fbm(p * 1.7 - vec2(uTime * 0.05, 0.0)) * 0.4;
        float edges = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
        gl_FragColor = vec4(uColor, smoothstep(0.35, 0.85, n) * edges * 0.32 * uStrength);
      }
    `,
  });
}

/** every flame in the model, [x, y, z]: six wall torches in the nave, four by the throne */
const TORCHES: [number, number, number][] = [
  ...[6.04, 13.69, 21.54].flatMap((z): [number, number, number][] => [
    [-7.72, 4.3, z],
    [7.72, 4.3, z],
  ]),
  ...[-0.9, -4.5].flatMap((z): [number, number, number][] => [
    [-8.42, 4.95, z],
    [8.42, 4.95, z],
  ]),
];
const BOWLS: [number, number, number][] = [
  [-7.36, 3.55, -8.1],
  [7.3, 3.55, -8.1],
];
/** real lights cost every lit pixel: one for each pair of torches, on alternate walls */
const NAVE_LIGHT: [number, number, number][] = [[0, 5.5, 12]];
const TORCH_LIGHTS: [number, number, number][] = [
  [-6.6, 4.1, 21.5],
  [6.6, 4.1, 13.7],
  [-6.6, 4.1, 6],
  [6.6, 4.1, -2.7],
];

function Flame({ position, size = 1, seed }: { position: [number, number, number]; size?: number; seed: number }) {
  const mat = useMemo(() => flameMaterial(seed), [seed]);
  return (
    <mesh position={position} scale={[0.34 * size, 0.62 * size, 1]} material={mat} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/** a light that breathes with its flame, and goes down when the System puts the lights out */
function TorchLight({ position, seed, intensity }: { position: [number, number, number]; seed: number; intensity: number }) {
  const light = useRef<PointLight>(null);
  useFrame(({ clock: c }) => {
    const t = c.elapsedTime * 7 + seed * 13;
    if (light.current) light.current.intensity = intensity * (0.86 + Math.sin(t) * 0.06 + Math.sin(t * 2.7) * 0.05) * (1 - air.dark * 0.9);
  });
  return <pointLight ref={light} position={position} color={EMBER} intensity={intensity} distance={intensity > 50 ? 30 : intensity > 30 ? 20 : 15} decay={1.7} />;
}

export function Hall({ quality }: { quality: Quality }) {
  const { scene } = useGLTF(HALL_MODEL, false, true);
  const cheap = quality !== "high";
  useMemo(() => restyle(scene, cheap), [scene, cheap]);
  const mist = useMemo(() => mistMaterial(quality === "low" ? 0.45 : 0.6), [quality]);
  const thin = useMemo(() => mistMaterial(0.3), []);
  const shaft = useMemo(() => shaftMaterial(quality === "high" ? 1 : 0.7), [quality]);
  useFrame((state) => {
    clock.value = state.clock.elapsedTime;
    power.value = 1 - air.dark * 0.75;
  });
  // fewer and stronger as the quality falls: the hall keeps its warmth, the pixel shader loses its loops
  const lights = quality === "high" ? TORCH_LIGHTS : quality === "medium" ? [TORCH_LIGHTS[1], TORCH_LIGHTS[2]] : NAVE_LIGHT;
  const torch = quality === "high" ? 24 : quality === "medium" ? 38 : 60;
  const length = HALL.south - HALL.north;
  const middle = (HALL.south + HALL.north) / 2;

  return (
    <group>
      <primitive object={scene} />
      {TORCHES.map((p, i) => (
        <Flame key={i} position={p} seed={i} />
      ))}
      {BOWLS.map((p, i) => (
        <Flame key={`b${i}`} position={p} size={2.2} seed={20 + i} />
      ))}
      {lights.map((p, i) => (
        <TorchLight key={`${quality}${i}`} position={p} seed={i} intensity={torch} />
      ))}
      {/* one light for both fire bowls, over the dais */}
      <TorchLight position={[0, 4.6, -7.4]} seed={9} intensity={36} />
      {/* moonlight through the high windows, as slanted slabs */}
      {quality !== "low" &&
        [-1.5, 5.5, 12.5, 19.5].map((z) => (
          <mesh key={z} position={[2.4, 8.2, z]} rotation={[0, 0, 0.62]} material={shaft}>
            <planeGeometry args={[2.2, 17, 1, 1]} />
          </mesh>
        ))}
      {/* mist: one sheet over the sunken floors, one over the nave and the dais */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 14]} material={mist} renderOrder={2}>
        <planeGeometry args={[HALL.halfWidth * 2, 19]} />
      </mesh>
      {quality !== "low" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, middle]} material={thin} renderOrder={2}>
          <planeGeometry args={[HALL.halfWidth * 2, length]} />
        </mesh>
      )}
      <Sparkles count={quality === "low" ? 60 : 180} scale={[15, 12, 44]} position={[0, 6, 4]} size={2.2} speed={0.18} color="#c9bcff" opacity={0.45} />
    </group>
  );
}
