"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Line, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { AdditiveBlending, CatmullRomCurve3, Color, DoubleSide, Group, MathUtils, Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, TubeGeometry, Vector3, Vector4 } from "three";
import { useWorldStore } from "@/store/world-store";
import type { Point } from "./world-line";

/**
 * ── SPACE-TIME, DRAWN ─────────────────────────────────────────
 * The scene behind the transcript and the history: a grid that every
 * event bends (a well under each one), the thread that links the
 * events in the order they happened, a bead on the thread for each,
 * and the stars. For the history, the far end is the edge of the
 * seven days: a dark disc the thread runs into.
 *
 * The panes are HTML, not part of this scene: each frame, every event
 * is projected to the screen and its element (`anchors`) is put there,
 * at the size its distance gives it.
 */

export interface SceneProps {
  /** the events, oldest first */
  points: Point[];
  /** the thread before the first event, furthest first */
  tail: Point[];
  /** how much each event bends the grid */
  masses: number[];
  /** the event in front */
  focus: number;
  /** the edge of the seven days, when it is shown */
  horizon: Point | null;
  /** how far under the event in front the camera looks: the further, the higher the event is on the screen */
  drop: number;
  /** travelling to another conversation */
  warp: boolean;
  /** the last event is still being written */
  live: boolean;
  /** one element per event, placed each frame */
  anchors: RefObject<(HTMLElement | null)[]>;
  horizonAnchor: RefObject<HTMLElement | null>;
}

const FOV = 50;
const FLOOR = -2.6;
const MAX_WELLS = 24;
/** how high the camera stands over the thread */
const EYE = 1.6;

const CYAN = new Color(0.3, 0.85, 1);
const VIOLET = new Color(0.62, 0.42, 1);

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** how far the camera stands from the event in front, so that one unit of space is `unit` pixels there */
function standOff(height: number, width: number) {
  const unit = width < 640 ? 118 : 150;
  return height / (2 * Math.tan(MathUtils.degToRad(FOV / 2)) * unit);
}

/* ── what changes every frame: plain functions on three's own objects ── */

const setTime = (material: ShaderMaterial, time: number) => {
  material.uniforms.uTime.value = time;
};

const easeHead = (material: ShaderMaterial, head: number, ease: number) => {
  material.uniforms.uHead.value = MathUtils.lerp(material.uniforms.uHead.value as number, head, ease);
};

/** the wells of the grid: the events nearest the one in front */
function setWells(material: ShaderMaterial, points: Point[], masses: number[], focus: number) {
  const wells = material.uniforms.uWells.value as Vector4[];
  const from = Math.max(0, Math.min(focus - Math.floor(MAX_WELLS / 2), points.length - MAX_WELLS));
  const shown = points.slice(from, from + MAX_WELLS);
  shown.forEach((p, n) => {
    const i = from + n;
    wells[n].set(p.x, p.z, (masses[i] ?? 0.5) * (i === focus ? 1.5 : 1), 1.8 + (masses[i] ?? 0.5));
  });
  material.uniforms.uCount.value = shown.length;
  const f = points[focus];
  (material.uniforms.uFocus.value as Vector3).set(f?.x ?? 0, 0, f?.z ?? 0);
}

interface RigState {
  pointer: { x: number; y: number };
  look: Vector3 | null;
  want: Vector3;
  aim: Vector3;
  v: Vector3;
}

/** move the camera toward its place in front of the event in focus; returns how deep that event is seen when it has arrived */
function driveCamera(cam: PerspectiveCamera, rig: RigState, p: Point, drop: number, size: { width: number; height: number }, delta: number, warp: boolean, still: boolean): number {
  const { want, aim, v, pointer } = rig;
  const away = standOff(size.height, size.width);
  const sway = still ? 0 : 1;
  want.set(p.x + pointer.x * 0.4 * sway, p.y + EYE - pointer.y * 0.25 * sway, p.z + away - (warp ? 7 : 0));
  aim.set(p.x, p.y - drop, p.z);

  // the first frame starts further back, and comes in
  if (!rig.look) {
    rig.look = aim.clone();
    cam.position.copy(want).add(v.set(0, 2.5, still ? 0 : 9));
  }
  const ease = still ? 1 : 1 - Math.exp(-delta * (warp ? 6 : 3.4));
  cam.position.lerp(want, ease);
  rig.look.lerp(aim, ease);
  cam.lookAt(rig.look);
  const fov = MathUtils.lerp(cam.fov, warp ? 112 : FOV, still ? 1 : 1 - Math.exp(-delta * 5));
  if (Math.abs(fov - cam.fov) > 0.01) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  cam.updateMatrixWorld();
  return (EYE * (EYE + drop) + away * away) / Math.hypot(EYE + drop, away);
}

/** put an event's pane where the event is on the screen, at the size its distance gives it */
function place(el: HTMLElement | null, at: Point, cam: PerspectiveCamera, size: { width: number; height: number }, rest: number, min: number, max: number, v: Vector3) {
  if (!el) return;
  const depth = -v.set(at.x, at.y, at.z).applyMatrix4(cam.matrixWorldInverse).z;
  if (depth < 1) {
    el.style.visibility = "hidden";
    return;
  }
  v.set(at.x, at.y, at.z).project(cam);
  const x = (v.x * 0.5 + 0.5) * size.width;
  const y = (-v.y * 0.5 + 0.5) * size.height;
  const scale = Math.max(min, Math.min(max, rest / depth));
  el.style.visibility = "visible";
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)}) translate(-50%, 0)`;
}

/* ── the grid ─────────────────────────────────────────────── */

const gridVertex = /* glsl */ `
  uniform vec4 uWells[${MAX_WELLS}];
  uniform int uCount;
  uniform float uTime;
  uniform vec3 uFocus;
  varying vec3 vWorld;
  varying float vDip;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    float dip = 0.0;
    for (int i = 0; i < ${MAX_WELLS}; i++) {
      if (i >= uCount) break;
      vec2 d = w.xz - uWells[i].xy;
      dip += uWells[i].z / (1.0 + dot(d, d) / uWells[i].w);
    }
    // a wave leaving the event in front
    float r = distance(w.xz, uFocus.xz);
    dip += 0.07 * sin(r * 2.1 - uTime * 2.2) * exp(-r * 0.2);
    w.y -= dip;
    vWorld = w.xyz;
    vDip = dip;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const gridFragment = /* glsl */ `
  uniform vec3 uCyan;
  uniform vec3 uViolet;
  uniform vec3 uFocus;
  uniform float uTime;
  varying vec3 vWorld;
  varying float vDip;
  float lines(vec2 p, float width) {
    vec2 g = abs(fract(p - 0.5) - 0.5) / (fwidth(p) * width);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    float fine = lines(vWorld.xz, 1.1);
    float coarse = lines(vWorld.xz / 6.0, 1.6);
    float away = distance(vWorld.xz, cameraPosition.xz);
    float fade = exp(-away * 0.042);
    float depth = clamp(vDip * 1.4, 0.0, 1.0);
    vec3 colour = mix(uCyan, uViolet, depth);
    // a ring of light running out from the event in front
    float r = distance(vWorld.xz, uFocus.xz);
    float ring = smoothstep(0.5, 0.0, abs(r - mod(uTime * 3.0, 26.0))) * exp(-r * 0.09);
    float light = (fine * 0.5 + coarse * 0.6) * (0.5 + depth * 1.6 + ring * 2.0);
    gl_FragColor = vec4(colour * light * fade, 1.0);
  }
`;

function Grid({ points, masses, focus }: Pick<SceneProps, "points" | "masses" | "focus">) {
  const mesh = useRef<Mesh>(null);
  const still = useMemo(() => reduced(), []);
  const geometry = useMemo(() => new PlaneGeometry(170, 170, 240, 240).rotateX(-Math.PI / 2), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: gridVertex,
        fragmentShader: gridFragment,
        uniforms: {
          uWells: { value: Array.from({ length: MAX_WELLS }, () => new Vector4(0, 0, 0, 1)) },
          uCount: { value: 0 },
          uTime: { value: 0 },
          uFocus: { value: new Vector3() },
          uCyan: { value: CYAN },
          uViolet: { value: VIOLET },
        },
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    [],
  );
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  useEffect(() => setWells(material, points, masses, focus), [material, points, masses, focus]);

  useFrame(({ camera, clock }) => {
    if (!still) setTime(material, clock.elapsedTime);
    // the plane goes with the camera; its lines are drawn from where they are in the world, so they stay put
    if (mesh.current) mesh.current.position.set(Math.round(camera.position.x), FLOOR, Math.round(camera.position.z) - 40);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ── the thread ───────────────────────────────────────────── */

const threadVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const threadFragment = /* glsl */ `
  uniform float uTime;
  uniform float uFar;
  uniform float uNear;
  uniform float uLength;
  uniform float uGain;
  uniform float uHead;
  uniform vec3 uCyan;
  uniform vec3 uViolet;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    // out of the distance: nothing at the far end, full at the first event
    float fade = smoothstep(uFar, uNear, vWorld.z);
    // and it ends just past the event in front: what came later is behind the viewer
    fade *= 1.0 - smoothstep(uHead + 0.3, uHead + 1.7, vWorld.z);
    // light running along the thread, toward the present
    float flow = pow(0.5 + 0.5 * sin(vUv.x * uLength * 1.5 - uTime * 3.2), 8.0);
    vec3 colour = mix(uViolet, uCyan, fade);
    gl_FragColor = vec4(colour * (0.7 + 2.6 * flow) * uGain * fade, 1.0);
  }
`;

function Thread({ points, tail, focus }: Pick<SceneProps, "points" | "tail" | "focus">) {
  const still = useMemo(() => reduced(), []);
  const built = useMemo(() => {
    const all = [...tail, ...points].map((p) => new Vector3(p.x, p.y, p.z));
    if (all.length < 2) return null;
    const curve = new CatmullRomCurve3(all, false, "catmullrom", 0.5);
    const length = curve.getLength();
    const segments = Math.min(1600, Math.max(40, Math.round(length * 6)));
    const make = (radius: number, gain: number) =>
      new Mesh(
        new TubeGeometry(curve, segments, radius, 6, false),
        new ShaderMaterial({
          vertexShader: threadVertex,
          fragmentShader: threadFragment,
          uniforms: {
            uTime: { value: 0 },
            uFar: { value: tail[0]?.z ?? all[0].z },
            uNear: { value: points[0]?.z ?? all[all.length - 1].z },
            uLength: { value: length },
            uGain: { value: gain },
            uHead: { value: points[points.length - 1]?.z ?? 0 },
            uCyan: { value: CYAN },
            uViolet: { value: VIOLET },
          },
          blending: AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      );
    // the thread, and the light around it
    return [make(0.022, 1), make(0.085, 0.16)];
  }, [points, tail]);

  useEffect(
    () => () => {
      built?.forEach((m) => {
        m.geometry.dispose();
        (m.material as ShaderMaterial).dispose();
      });
    },
    [built],
  );
  const head = points[focus]?.z ?? 0;
  useFrame(({ clock }, delta) => {
    built?.forEach((m) => {
      if (!still) setTime(m.material as ShaderMaterial, clock.elapsedTime);
      easeHead(m.material as ShaderMaterial, head, still ? 1 : 1 - Math.exp(-delta * 3.4));
    });
  });

  return built ? (
    <>
      {built.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  ) : null;
}

/* ── the events ───────────────────────────────────────────── */

function Bead({ point, mass, front, live }: { point: Point; mass: number; front: boolean; live: boolean }) {
  const ring = useRef<Group>(null);
  const still = useMemo(() => reduced(), []);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const beat = still ? 1 : 1 + 0.16 * Math.sin(clock.elapsedTime * (live ? 7 : 2.4));
    ring.current.scale.setScalar(beat);
  });
  const size = 0.045 + mass * 0.055;
  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh scale={front ? 1.15 : 1}>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial color={front ? [1.5, 2, 2.4] : [0.8, 1.5, 2]} toneMapped={false} />
      </mesh>
      {front && (
        <Billboard>
          <group ref={ring}>
            <mesh>
              <ringGeometry args={[size * 2.6, size * 2.6 + 0.01, 64]} />
              <meshBasicMaterial color={[0.9, 1.6, 2]} toneMapped={false} transparent opacity={0.9} side={DoubleSide} />
            </mesh>
            <mesh>
              <ringGeometry args={[size * 4, size * 4 + 0.006, 64, 1, 0.4, 4.2]} />
              <meshBasicMaterial color={[1.1, 0.8, 2]} toneMapped={false} transparent opacity={0.7} side={DoubleSide} />
            </mesh>
          </group>
        </Billboard>
      )}
      {/* where this event stands on the grid */}
      <Line points={[[0, -size, 0], [0, FLOOR - point.y - mass * 0.55, 0]]} color="#7fd8ff" lineWidth={1} transparent opacity={front ? 0.55 : 0.22} dashed dashSize={0.09} gapSize={0.07} />
    </group>
  );
}

/* ── the edge of the seven days ───────────────────────────── */

const horizonFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCyan;
  uniform vec3 uViolet;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float angle = atan(p.y, p.x);
    // the dark disc, and the light that turns around it
    float hole = smoothstep(0.56, 0.5, r);
    float rim = smoothstep(0.5, 0.56, r) * smoothstep(1.0, 0.58, r);
    float swirl = 0.55 + 0.45 * sin(angle * 3.0 - uTime * 0.7 + r * 16.0);
    float edge = smoothstep(0.07, 0.0, abs(r - 0.56));
    vec3 colour = mix(uViolet, uCyan, swirl) * rim * (0.35 + 0.6 * swirl) + vec3(1.0, 1.4, 1.7) * edge;
    gl_FragColor = vec4(colour, max(hole, clamp(rim + edge, 0.0, 1.0)));
  }
`;

function Horizon({ at }: { at: Point }) {
  const still = useMemo(() => reduced(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: horizonFragment,
        uniforms: { uTime: { value: 0 }, uCyan: { value: CYAN }, uViolet: { value: VIOLET } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (!still) setTime(material, clock.elapsedTime);
  });
  return (
    <Billboard position={[at.x, at.y, at.z]}>
      <mesh material={material}>
        <planeGeometry args={[8.5, 8.5]} />
      </mesh>
    </Billboard>
  );
}

/* ── the camera, and the panes it carries ─────────────────── */

function Rig({ points, focus, horizon, drop, warp, anchors, horizonAnchor }: Pick<SceneProps, "points" | "focus" | "horizon" | "drop" | "warp" | "anchors" | "horizonAnchor">) {
  const sky = useRef<Group>(null);
  const rig = useRef<RigState>({ pointer: { x: 0, y: 0 }, look: null, want: new Vector3(), aim: new Vector3(), v: new Vector3() });
  const still = useMemo(() => reduced(), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      rig.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      rig.current.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, size }, delta) => {
    const cam = camera as PerspectiveCamera;
    const rest = driveCamera(cam, rig.current, points[focus] ?? { x: 0, y: 0, z: 0 }, drop, size, delta, warp, still);
    sky.current?.position.copy(cam.position);
    const list = anchors.current;
    for (let i = 0; i < list.length; i++) if (points[i]) place(list[i], points[i], cam, size, rest, 0, 1.12, rig.current.v);
    if (horizon) place(horizonAnchor.current, { x: horizon.x, y: horizon.y + 1.15, z: horizon.z }, cam, size, rest, 0.6, 1, rig.current.v);
  });

  return (
    <group ref={sky}>
      <Stars radius={70} depth={60} count={2600} factor={3.2} saturation={0.6} fade speed={still ? 0 : 0.7} />
    </group>
  );
}

export default function SpaceTimeScene(props: SceneProps) {
  const quality = useWorldStore((s) => s.quality);
  return (
    <Canvas
      className="!absolute inset-0"
      style={{ pointerEvents: "none" }}
      dpr={quality === "low" ? 1 : [1, 1.75]}
      camera={{ fov: FOV, near: 0.1, far: 500, position: [0, 4, 16] }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#03040c"]} />
      <Rig points={props.points} focus={props.focus} horizon={props.horizon} drop={props.drop} warp={props.warp} anchors={props.anchors} horizonAnchor={props.horizonAnchor} />
      <Grid points={props.points} masses={props.masses} focus={props.focus} />
      <Thread points={props.points} tail={props.tail} focus={props.focus} />
      {/* the event in front and the ones before it; what came later is behind the viewer */}
      {props.points.map((p, i) =>
        i > props.focus || i < props.focus - 14 ? null : <Bead key={i} point={p} mass={props.masses[i] ?? 0.5} front={i === props.focus} live={props.live && i === props.points.length - 1} />,
      )}
      {props.horizon && <Horizon at={props.horizon} />}
      {quality !== "low" && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.72} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
