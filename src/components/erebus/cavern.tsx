"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type InstancedMesh,
  type PointLight,
  type ShaderMaterial,
  type SpotLight,
  type Texture,
} from "three";
import { game } from "@/erebus/game";
import { rngFrom } from "@/erebus/rules";
import { ARENA } from "@/erebus/sim";

/**
 * The cavern: a chamber the rock closed over, with a ruin left inside
 * it. Raw stone all round, a break in the roof that lets a cold light
 * down, mist on the floor and a few braziers somebody keeps lit. The
 * fight happens on the flat ground in the middle; the statues stand in
 * the dark behind the rock columns. Nothing here is a model: the rock
 * is built from noise once, when the gate opens.
 * Textures: Poly Haven, CC0 (scripts/assets/README.md).
 */

export const CAVE = {
  /** rock columns, just outside the ground the hunter can reach */
  columns: ARENA + 2.8,
  /** where the statues stand */
  aisle: ARENA + 6.5,
  /** where the rock wall meets the floor, before the noise moves it */
  wall: ARENA + 14,
  height: 34,
  /** the break in the roof */
  oculus: 9,
};
/** the height of the roof above a point `r` from the centre, before the noise */
export const roofAt = (r: number) => CAVE.height * Math.pow(Math.max(0, 1 - (r / CAVE.wall) ** 2), 0.25);

const FOG = "#07090c";
const FIRE = "#ff8b3d";
const SKYLIGHT = "#a9b6c9";

const TEXTURES = [
  "/textures/erebus/rock.webp",
  "/textures/erebus/rock-normal.webp",
  "/textures/erebus/ground.webp",
  "/textures/erebus/ground-normal.webp",
  "/textures/erebus/wall.webp",
  "/textures/erebus/wall-normal.webp",
];
useTexture.preload(TEXTURES);

/** a copy of a texture that repeats; the loaded one is shared and stays as it is */
function tiled(source: Texture, x: number, y: number, color: boolean) {
  const t = source.clone();
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(x, y);
  if (color) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/* ── noise, for the shape of the rock ── */

const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return mix(
    mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
    mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy),
    fz,
  );
}
/** -1..1, four octaves */
function fbm(x: number, y: number, z: number) {
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < 4; i++) {
    sum += amp * (noise(x, y, z) * 2 - 1);
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
/** 0..1, sharp ridges: the ledges and seams of the wall */
const ridged = (x: number, y: number, z: number) => 1 - Math.abs(noise(x, y, z) * 2 - 1);

/* ── the rock, built once ── */

/** the wall and the roof in one skin: a dome pushed in and out by noise, seen from inside */
function shell() {
  const around = 192;
  const up = 40;
  const pos = new Float32Array((around + 1) * (up + 1) * 3);
  const uv = new Float32Array((around + 1) * (up + 1) * 2);
  const col = new Float32Array((around + 1) * (up + 1) * 3);
  // the roof stops at the edge of the break
  const top = Math.pow(1 - (CAVE.oculus / CAVE.wall) ** 2, 0.25);
  let n = 0;
  for (let j = 0; j <= up; j++) {
    const t = (j / up) * top;
    for (let i = 0; i <= around; i++) {
      const a = (i / around) * Math.PI * 2;
      const sx = Math.sin(a);
      const cz = Math.cos(a);
      const base = CAVE.wall * Math.sqrt(Math.max(0, 1 - t ** 4));
      // the seam is hidden by sampling the noise on the circle, not on the angle
      const big = fbm(sx * 2.2 + 11, t * 2.4, cz * 2.2);
      const ledge = ridged(sx * 6 + 3, t * 9, cz * 6);
      // the rock stands back behind the colossus (north) and is cut flat where the door is set (south)
      const niche = Math.max(0, -cz) ** 16;
      const gate = Math.max(0, cz) ** 30 * (1 - Math.min(1, t * 1.6));
      let push = big * 5.5 + ledge * 1.6 - 0.8;
      push += (-3.5 - push) * niche + (2.4 - push) * gate;
      const r = Math.max(CAVE.oculus * 0.8, base - push * (0.35 + 0.65 * Math.min(1, base / 20)));
      const y = t * CAVE.height + fbm(sx * 3, 7, cz * 3) * 1.2 * t;
      pos[n * 3] = sx * r;
      pos[n * 3 + 1] = j === 0 ? -0.5 : y;
      pos[n * 3 + 2] = cz * r;
      uv[n * 2] = (i / around) * 34;
      uv[n * 2 + 1] = (j / up) * 8;
      // recesses are darker than what stands proud, and the foot of the wall darker still
      const shade = Math.min(1, 0.5 + push * 0.09 + ledge * 0.25) * (0.45 + 0.55 * Math.min(1, y / 5));
      col[n * 3] = col[n * 3 + 1] = col[n * 3 + 2] = Math.max(0.12, shade);
      n++;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < up; j++)
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i;
      const b = a + around + 1;
      // wound to face the centre
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** the floor: flat where the fight is, heaped with fallen rock toward the wall */
function ground() {
  const around = 144;
  const out = 44;
  const reach = CAVE.wall + 8;
  const pos = new Float32Array((around * out + 1) * 3);
  const uv = new Float32Array((around * out + 1) * 2);
  const col = new Float32Array((around * out + 1) * 3);
  col[0] = col[1] = col[2] = 1;
  let n = 1;
  for (let j = 1; j <= out; j++) {
    const r = (j / out) ** 0.85 * reach;
    for (let i = 0; i < around; i++) {
      const a = (i / around) * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const rise = smooth(Math.min(1, Math.max(0, (r - (ARENA + 9.5)) / 9)));
      const rough = smooth(Math.min(1, Math.max(0, (r - (ARENA + 1.5)) / 5)));
      pos[n * 3] = x;
      pos[n * 3 + 1] = rise * (3.2 + fbm(x * 0.21, 2, z * 0.21) * 3.4) + rough * fbm(x * 0.5, 9, z * 0.5) * 0.22;
      pos[n * 3 + 2] = z;
      uv[n * 2] = x / 7;
      uv[n * 2 + 1] = z / 7;
      // damp, dark patches, and the dark that gathers against the wall
      const stain = 0.72 + fbm(x * 0.09, 4, z * 0.09) * 0.42;
      col[n * 3] = col[n * 3 + 1] = col[n * 3 + 2] = Math.max(0.2, stain * (1 - rise * 0.45));
      n++;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < around; i++) index.push(0, 1 + i, 1 + ((i + 1) % around));
  for (let j = 0; j < out - 1; j++)
    for (let i = 0; i < around; i++) {
      const a = 1 + j * around + i;
      const b = 1 + j * around + ((i + 1) % around);
      index.push(a, a + around, b, b, a + around, b + around);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** a unit-high column of rock, waisted in the middle where the drip stone met */
function column() {
  const g = new CylinderGeometry(1, 1, 1, 18, 22, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.5;
    const a = Math.atan2(p.getX(i), p.getZ(i));
    const flare = 1 + 4.2 * Math.abs(y - 0.45) ** 2.4;
    const r = flare * (1 + fbm(Math.sin(a) * 1.6, y * 7, Math.cos(a) * 1.6) * 0.34 + ridged(Math.sin(a) * 4, y * 16, Math.cos(a) * 4) * 0.1);
    p.setXYZ(i, Math.sin(a) * r, y - 0.5, Math.cos(a) * r);
  }
  g.computeVertexNormals();
  return g;
}

/** a unit-high spike of drip stone, point down; turned over it is a stalagmite */
function spike() {
  const g = new CylinderGeometry(1, 0.02, 1, 9, 7, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.5;
    const a = Math.atan2(p.getX(i), p.getZ(i));
    const r = Math.pow(y, 1.7) * (1 + fbm(Math.sin(a) * 2, y * 5, Math.cos(a) * 2) * 0.45) + 0.02;
    p.setXYZ(i, Math.sin(a) * r, y - 0.5, Math.cos(a) * r);
  }
  g.computeVertexNormals();
  return g;
}

function boulder() {
  const g = new IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const r = 1 + fbm(x * 1.3 + 5, y * 1.3, z * 1.3) * 0.5 + ridged(x * 3, y * 3, z * 3) * 0.12;
    p.setXYZ(i, x * r, y * r * 0.72, z * r);
  }
  g.computeVertexNormals();
  return g;
}

/* ── where things stand ── */

/** keep the way to the door and to the dais free of loose rock */
const clear = (a: number) => (Math.abs(Math.sin(a)) < 0.24 ? a + 0.55 : a);

const COLUMNS = 9;
const SPIKES = 110;
const GROWTHS = 46;
const BOULDERS = 34;
/** the braziers: angle (turns) and distance from the centre */
const BRAZIERS: [number, number][] = [
  [0.11, ARENA - 2.2],
  [0.37, ARENA - 1.6],
  [0.63, ARENA - 2.4],
  [0.88, ARENA - 1.8],
];

const flameVertex = /* glsl */ `
  attribute float aSeed;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    // a card that always faces the camera, standing on its base
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += position.xy * vec2(1.5, 2.6) + vec2(0.0, 1.1);
    gl_Position = projectionMatrix * mv;
  }
`;
const flameFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  varying vec2 vUv;
  varying float vSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - vec2(0.5, 0.0);
    float t = uTime * 1.9 + vSeed * 17.0;
    float n = noise(vec2(p.x * 5.0 + vSeed * 9.0, p.y * 3.5 - t)) * 0.6 + noise(vec2(p.x * 11.0, p.y * 7.0 - t * 1.7)) * 0.4;
    // a tongue: wide at the coals, torn thin at the top
    p.x += (n - 0.5) * 0.3 * p.y;
    float width = 0.3 * (1.0 - p.y) * (0.55 + 0.45 * n);
    float body = smoothstep(width, width * 0.15, abs(p.x)) * smoothstep(1.0, 0.25, p.y + (1.0 - n) * 0.45) * smoothstep(0.0, 0.07, p.y);
    vec3 col = mix(vec3(0.75, 0.13, 0.02), vec3(1.0, 0.55, 0.14), body);
    col = mix(col, vec3(1.0, 0.9, 0.62), smoothstep(0.55, 1.0, body) * (1.0 - p.y));
    gl_FragColor = vec4(col * body * 2.4 * uPower, body);
  }
`;

const shaftVertex = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vView;
  varying vec3 vObj;
  void main() {
    vObj = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const shaftFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  varying vec3 vNormalV;
  varying vec3 vView;
  varying vec3 vObj;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    // thick where you look through the middle of the beam, nothing at its edge
    float through = pow(abs(dot(normalize(vNormalV), vView)), 4.0);
    float a = atan(vObj.x, vObj.z);
    float streak = 0.55 + 0.45 * noise(vec2(a * 5.0, uTime * 0.05)) * noise(vec2(a * 13.0 + 4.0, -uTime * 0.03) + 2.0) * 2.0;
    // stronger under the roof, gone into the mist at the floor
    float h = vObj.y + 0.5;
    float fall = smoothstep(0.0, 0.3, h) * (0.35 + 0.65 * h);
    gl_FragColor = vec4(uColor * through * streak * fall * uPower, 1.0);
  }
`;

const mistVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const mistFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  uniform vec3 uFire[4];
  uniform float uSeed;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
  void main() {
    vec2 p = vWorld.xz;
    vec2 drift = vec2(uTime * 0.22, uTime * 0.09) + uSeed * 31.0;
    float n = fbm(p * 0.085 + drift * 0.1 + noise(p * 0.05 - drift * 0.06) * 1.4);
    float bank = smoothstep(0.42, 0.85, n);
    // mist has no light of its own: it shows what falls on it
    float sky = smoothstep(30.0, 2.0, length(p));
    vec3 lit = uColor * (0.08 + sky * 0.5);
    for (int i = 0; i < 4; i++) lit += vec3(1.0, 0.5, 0.2) * 0.5 * smoothstep(17.0, 1.0, distance(p, uFire[i].xz));
    // thin out close to the eye, so it never becomes a sheet across the screen
    float close = smoothstep(2.5, 11.0, distance(vWorld, cameraPosition));
    float edge = smoothstep(${(CAVE.wall + 2).toFixed(1)}, ${(CAVE.wall - 14).toFixed(1)}, length(p));
    gl_FragColor = vec4(lit * uPower, bank * 0.4 * close * edge);
  }
`;

const tint = new Color();
const TWIST: Record<string, string> = { frenzy: "#ff8a4a", calm: "#6f9dff", time_slow: "#63d6c8", echo_rain: "#7fd0ff", mirror: "#b98cff", giants: "#ff6a7a", tremor: "#ff7a5a" };

export function Cavern() {
  const [rock, rockN, soil, soilN, cut, cutN] = useTexture(TEXTURES);
  const maps = useMemo(
    () => ({
      rock: tiled(rock, 1, 1, true),
      rockN: tiled(rockN, 1, 1, false),
      soil: tiled(soil, 1, 1, true),
      soilN: tiled(soilN, 1, 1, false),
      column: tiled(rock, 3, 5, true),
      columnN: tiled(rockN, 3, 5, false),
      lump: tiled(rock, 2, 2, true),
      lumpN: tiled(rockN, 2, 2, false),
      cut: tiled(cut, 3, 1, true),
      cutN: tiled(cutN, 3, 1, false),
    }),
    [rock, rockN, soil, soilN, cut, cutN],
  );
  const geo = useMemo(() => ({ shell: shell(), ground: ground(), column: column(), spike: spike(), boulder: boulder() }), []);
  const braziers = useMemo(() => BRAZIERS.map(([turn, r]) => ({ x: Math.sin(turn * Math.PI * 2) * r, z: Math.cos(turn * Math.PI * 2) * r })), []);
  const seeds = useMemo(() => new Float32Array(braziers.map((_, i) => i / braziers.length)), [braziers]);

  const columns = useRef<InstancedMesh>(null);
  const spikes = useRef<InstancedMesh>(null);
  const growths = useRef<InstancedMesh>(null);
  const boulders = useRef<InstancedMesh>(null);
  const bowls = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const coals = useRef<InstancedMesh>(null);
  const flames = useRef<InstancedMesh>(null);
  const flameMat = useRef<ShaderMaterial>(null);
  const shaftMat = useRef<ShaderMaterial>(null);
  const mistMats = useRef<(ShaderMaterial | null)[]>([]);
  const fires = useRef<(PointLight | null)[]>([]);
  const sky = useRef<SpotLight>(null);
  const dark = useRef(0);
  const skyColor = useRef(new Color(SKYLIGHT));

  const flameUniforms = useMemo(() => ({ uTime: { value: 0 }, uPower: { value: 1 } }), []);
  const shaftUniforms = useMemo(() => ({ uTime: { value: 0 }, uPower: { value: 1 }, uColor: { value: new Color(SKYLIGHT) } }), []);
  const mistUniforms = useMemo(
    () =>
      [0, 1].map((i) => ({
        uTime: { value: 0 },
        uPower: { value: 1 },
        uColor: { value: new Color(SKYLIGHT) },
        uSeed: { value: i * 0.37 },
        uFire: { value: braziers.map((b) => new Vector3(b.x, 0, b.z)) },
      })),
    [braziers],
  );

  useLayoutEffect(() => {
    const o = new Object3D();
    const r = rngFrom(71);
    const put = (m: InstancedMesh | null, i: number) => {
      o.updateMatrix();
      m?.setMatrixAt(i, o.matrix);
    };
    for (let i = 0; i < COLUMNS; i++) {
      const a = ((i + 0.5 + (r() - 0.5) * 0.5) / COLUMNS) * Math.PI * 2;
      const d = CAVE.columns + r() * 2.2;
      const h = roofAt(d) + 3;
      const w = 1.25 + r() * 0.7;
      o.position.set(Math.sin(a) * d, h / 2 - 0.5, Math.cos(a) * d);
      o.rotation.set(0, r() * 6.28, 0);
      o.scale.set(w, h, w * (0.8 + r() * 0.4));
      put(columns.current, i);
    }
    for (let i = 0; i < SPIKES; i++) {
      // more of them toward the wall, none in the break
      const d = CAVE.oculus + 4 + Math.sqrt(r()) * (CAVE.wall - CAVE.oculus - 9);
      const a = r() * Math.PI * 2;
      const len = 1.5 + r() * r() * 9;
      o.position.set(Math.sin(a) * d, roofAt(d) - len / 2 + 1.2, Math.cos(a) * d);
      o.rotation.set((r() - 0.5) * 0.12, r() * 6.28, (r() - 0.5) * 0.12);
      o.scale.set(0.35 + len * 0.11, len, 0.35 + len * 0.11);
      put(spikes.current, i);
    }
    for (let i = 0; i < GROWTHS; i++) {
      const d = ARENA + 2.5 + r() * 11;
      const a = clear(r() * Math.PI * 2);
      const len = 0.7 + r() * r() * 4.2;
      o.position.set(Math.sin(a) * d, len / 2 - 0.25, Math.cos(a) * d);
      o.rotation.set(Math.PI + (r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2);
      o.scale.set(0.3 + len * 0.16, len, 0.3 + len * 0.16);
      put(growths.current, i);
    }
    for (let i = 0; i < BOULDERS; i++) {
      const d = ARENA + 2 + r() * 12;
      const a = clear(r() * Math.PI * 2);
      const s = 0.5 + r() * r() * 2.6;
      o.position.set(Math.sin(a) * d, s * 0.25, Math.cos(a) * d);
      o.rotation.set(r() * 0.6, r() * 6.28, r() * 0.6);
      o.scale.set(s, s * (0.7 + r() * 0.5), s * (0.8 + r() * 0.4));
      put(boulders.current, i);
    }
    braziers.forEach((b, i) => {
      o.rotation.set(0, i * 1.3, 0);
      o.scale.setScalar(1);
      o.position.set(b.x, 1.35, b.z);
      put(bowls.current, i);
      o.position.set(b.x, 0.62, b.z);
      put(legs.current, i);
      o.position.set(b.x, 1.56, b.z);
      put(coals.current, i);
      o.position.set(b.x, 1.5, b.z);
      put(flames.current, i);
    });
    for (const m of [columns, spikes, growths, boulders, bowls, legs, coals, flames]) if (m.current) m.current.instanceMatrix.needsUpdate = true;
  }, [braziers]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const twist = game.sim?.twist?.kind;
    // the System turning the light off takes the fires and the sky with it
    dark.current += ((twist === "blackout" ? 1 : 0) - dark.current) * Math.min(1, delta * 2.5);
    const power = 1 - dark.current * 0.94;
    if (flameMat.current) {
      flameMat.current.uniforms.uTime.value = t;
      flameMat.current.uniforms.uPower.value = power;
    }
    fires.current.forEach((l, i) => {
      if (!l) return;
      const flicker = 0.82 + Math.sin(t * 9.3 + i * 2.1) * 0.07 + Math.sin(t * 23.7 + i * 5.3) * 0.06 + Math.sin(t * 3.1 + i) * 0.05;
      l.intensity = 330 * flicker * power;
    });
    // what the System has done to the world shows in the light that falls through the roof
    skyColor.current.lerp(tint.set(SKYLIGHT).lerp(tint2.set(TWIST[twist ?? ""] ?? SKYLIGHT), 0.6), Math.min(1, delta * 2));
    if (sky.current) {
      sky.current.color.copy(skyColor.current);
      sky.current.intensity = 3400 * power;
    }
    if (shaftMat.current) {
      shaftMat.current.uniforms.uTime.value = t;
      shaftMat.current.uniforms.uPower.value = 0.34 * power;
      shaftMat.current.uniforms.uColor.value.copy(skyColor.current);
    }
    for (const m of mistMats.current) {
      if (!m) continue;
      m.uniforms.uTime.value = t;
      m.uniforms.uPower.value = power;
      m.uniforms.uColor.value.copy(skyColor.current);
    }
  });

  return (
    <>
      <mesh geometry={geo.ground} position={[0, -0.02, 0]}>
        <meshStandardMaterial map={maps.soil} normalMap={maps.soilN} normalScale={[1.6, 1.6]} color="#8d8a86" roughness={0.82} metalness={0} vertexColors />
      </mesh>
      <mesh geometry={geo.shell}>
        <meshStandardMaterial map={maps.rock} normalMap={maps.rockN} normalScale={[1.5, 1.5]} color="#9a9794" roughness={0.96} vertexColors side={DoubleSide} />
      </mesh>
      {/* what is above the break: nothing you can see, only where the light comes from */}
      <mesh position={[0, CAVE.height + 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CAVE.oculus * 2.2, 32]} />
        <meshBasicMaterial color="#27303d" fog={false} />
      </mesh>

      <instancedMesh ref={columns} args={[geo.column, undefined, COLUMNS]} frustumCulled={false}>
        <meshStandardMaterial map={maps.column} normalMap={maps.columnN} normalScale={[1.4, 1.4]} color="#8a8784" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={spikes} args={[geo.spike, undefined, SPIKES]} frustumCulled={false}>
        <meshStandardMaterial map={maps.lump} normalMap={maps.lumpN} color="#7d7a78" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={growths} args={[geo.spike, undefined, GROWTHS]} frustumCulled={false}>
        <meshStandardMaterial map={maps.lump} normalMap={maps.lumpN} color="#77746f" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={boulders} args={[geo.boulder, undefined, BOULDERS]} frustumCulled={false}>
        <meshStandardMaterial map={maps.lump} normalMap={maps.lumpN} normalScale={[1.4, 1.4]} color="#807d7a" roughness={0.95} />
      </instancedMesh>

      {/* the braziers: black iron, coals, and a flame that is a shader on a card */}
      <instancedMesh ref={bowls} args={[undefined, undefined, BRAZIERS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.72, 0.36, 0.5, 10, 1, true]} />
        <meshStandardMaterial color="#141210" roughness={0.55} metalness={0.85} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, BRAZIERS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.1, 0.62, 1.25, 3, 1, true]} />
        <meshStandardMaterial color="#100e0d" roughness={0.6} metalness={0.85} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={coals} args={[undefined, undefined, BRAZIERS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.66, 0.66, 0.06, 10]} />
        <meshBasicMaterial color="#ff5a1c" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[undefined, undefined, BRAZIERS.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        </planeGeometry>
        <shaderMaterial ref={flameMat} uniforms={flameUniforms} vertexShader={flameVertex} fragmentShader={flameFragment} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </instancedMesh>
      {braziers.map((b, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            fires.current[i] = l;
          }}
          color={FIRE}
          intensity={330}
          distance={60}
          decay={1.9}
          position={[b.x * 0.96, 3.4, b.z * 0.96]}
        />
      ))}

      {/* the light through the roof: a lamp, and the air it shows up */}
      <spotLight ref={sky} color={SKYLIGHT} intensity={3400} distance={90} decay={1.6} angle={0.42} penumbra={1} position={[3, CAVE.height + 14, -2]} />
      <mesh position={[0, CAVE.height / 2, 0]}>
        <cylinderGeometry args={[CAVE.oculus * 0.8, CAVE.oculus * 1.75, CAVE.height, 40, 1, true]} />
        <shaderMaterial ref={shaftMat} uniforms={shaftUniforms} vertexShader={shaftVertex} fragmentShader={shaftFragment} transparent depthWrite={false} blending={AdditiveBlending} side={BackSide} />
      </mesh>

      {/* mist lying on the floor, in two sheets that drift at their own pace */}
      {[0.3, 0.75].map((y, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={2}>
          <circleGeometry args={[CAVE.wall + 2, 48]} />
          <shaderMaterial
            ref={(m) => {
              mistMats.current[i] = m;
            }}
            uniforms={mistUniforms[i]}
            vertexShader={mistVertex}
            fragmentShader={mistFragment}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* the ruin: a dais at the north end, where the colossus stands */}
      <group position={[0, 0, -CAVE.aisle]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.4 + i * 0.8, 0]} rotation={[0, i * 0.07, 0]}>
            <cylinderGeometry args={[5.6 - i * 0.9, 5.9 - i * 0.9, 0.8, 8]} />
            <meshStandardMaterial map={maps.cut} normalMap={maps.cutN} color="#6b6966" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* the door at the south end: iron set in the rock. It closed behind you. */}
      <group position={[0, 0, CAVE.wall - 3.6]}>
        <mesh position={[0, 6.5, 0.4]}>
          <boxGeometry args={[9, 13, 1]} />
          <meshStandardMaterial color="#12110f" roughness={0.6} metalness={0.8} />
        </mesh>
        {[-3, 0, 3].map((x) => (
          <mesh key={x} position={[x, 6.5, -0.15]}>
            <boxGeometry args={[0.35, 13, 0.2]} />
            <meshStandardMaterial color="#1c1a17" roughness={0.5} metalness={0.9} />
          </mesh>
        ))}
        {[-5.4, 5.4].map((x) => (
          <mesh key={x} position={[x, 6.8, 0]}>
            <boxGeometry args={[2.2, 13.6, 2.4]} />
            <meshStandardMaterial map={maps.cut} normalMap={maps.cutN} color="#6b6966" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 14.2, 0]}>
          <boxGeometry args={[13.4, 1.8, 2.8]} />
          <meshStandardMaterial map={maps.cut} normalMap={maps.cutN} color="#6b6966" roughness={0.95} />
        </mesh>
      </group>
    </>
  );
}
const tint2 = new Color();

export { FOG };
