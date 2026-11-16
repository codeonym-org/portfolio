"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import {
  Bone,
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFSoftShadowMap,
  Quaternion,
  Vector3,
} from "three";
import { useVoiceStore, voiceLive } from "@/components/agent/voice/voice-store";
import { useWorldStore } from "@/store/world-store";
import { headUniforms, JAW, rigHead } from "./head-shader";
import { mouthLive, useInterview } from "./interview-store";
import { Office, prepare } from "./office-world";

/**
 * ── THE INTERVIEW ROOM ────────────────────────────────────────
 * A bright office. He sits behind a desk (a laptop and his
 * papers on it) facing the stranger, who sits where the camera is,
 * like the panel in a real interview. He is one Rodin model made from
 * a photo of him seated, with a small rig (hips, spine, neck, head).
 * All his movement is by hand: breathing, a slow sway, his gaze
 * following the stranger, glances at the laptop, leaning in to
 * listen, nods as he speaks, blinks, and the jaw with his voice.
 * The room and its furniture are in office-world.
 */

const MODELS = { avatar: "/models/office/avatar.glb" };
const DRACO = "/draco/";

/** how the scan sits in the room: its size, where it is, and the head's rest pitch (the scan looks up a little) */
const SEAT = { scale: 0.48, position: [0, 0.16, 0.08] as const, chin: 0.04 };
/** his head around its bone, in model units: for the windows that keep clear of his face */
const FACE = { centre: new Vector3(0, 0.28, 0.06), half: new Vector3(0.26, 0.34, 0.3) };

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

/** turn a bone by a rotation given in world axes, on top of what the animation set */
function turn(bone: Object3D, world: Quaternion) {
  const parent = new Quaternion();
  bone.parent?.getWorldQuaternion(parent);
  const local = parent.clone().invert().multiply(world).multiply(parent);
  bone.quaternion.premultiply(local);
}

const euler = (pitch: number, yaw: number, roll: number) =>
  new Quaternion().setFromAxisAngle(Y, yaw).multiply(new Quaternion().setFromAxisAngle(X, pitch)).multiply(new Quaternion().setFromAxisAngle(Z, roll));

function Avatar() {
  const gltf = useGLTF(MODELS.avatar, DRACO);
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  /** a life: when he next blinks, where he looks when nobody moves */
  const life = useRef({ nextBlink: 1.5, blinkAt: -1, double: false, glanceAt: 6, glanceUntil: 0, shiftAt: 9, shift: 0, shiftTarget: 0 });
  const bones = useMemo(() => {
    const find = (name: string) => gltf.scene.getObjectByName(name) as Bone | undefined;
    return { head: find("Head"), neck: find("Neck"), chest: find("Spine2"), spine: find("Spine1") };
  }, [gltf.scene]);
  /** where each of those bones rests: every frame starts from there */
  const rest = useMemo(() => new Map(Object.values(bones).filter((b): b is Bone => !!b).map((b) => [b, b.quaternion.clone()])), [bones]);
  const motion = useRef({ yaw: 0, pitch: 0, roll: 0, lean: 0 });

  useEffect(() => {
    prepare(gltf.scene);
    const body = gltf.scene.getObjectByName("body") as Mesh | undefined;
    const material = body?.material as MeshStandardMaterial | undefined;
    if (body) body.frustumCulled = false;
    if (material) rigHead(material);
    useInterview.getState().set({ present: true });
    useWorldStore.getState().setReady();
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("mouth");
    mouthLive.forced = forced === null ? null : Math.min(1, Math.max(0, Number(forced) || 0));
    const blink = params.get("blink");
    if (blink !== null) life.current.nextBlink = Infinity;
    if (blink !== null) headUniforms.uBlink.value = Math.min(1, Math.max(0, Number(blink) || 0));
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, [gltf, life]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const L = life.current;
    rest.forEach((q, b) => b.quaternion.copy(q));
    gltf.scene.updateMatrixWorld(true);

    const phase = useVoiceStore.getState().phase;
    const level = voiceLive.level;
    const speaking = phase === "speaking";
    const listening = phase === "listening" || phase === "decoding";
    const thinking = phase === "thinking";

    // ── blinks: every 2–6 s, sometimes twice; a blink takes 150 ms ──
    if (Number.isFinite(L.nextBlink)) {
      if (t >= L.nextBlink && L.blinkAt < 0) L.blinkAt = t;
      if (L.blinkAt >= 0) {
        const k = (t - L.blinkAt) / 0.15;
        headUniforms.uBlink.value = k < 0.4 ? k / 0.4 : Math.max(0, 1 - (k - 0.4) / 0.6);
        if (k >= 1) {
          L.blinkAt = -1;
          headUniforms.uBlink.value = 0;
          L.double = !L.double && Math.random() < 0.18;
          L.nextBlink = t + (L.double ? 0.18 : 2 + Math.random() * 4 + (listening ? 1 : 0));
        }
      }
    }

    // ── the jaw follows his voice ──
    const target = mouthLive.forced ?? (speaking ? Math.min(1, Math.max(0, (level - 0.04) * 1.9)) : 0);
    mouthLive.open += (target - mouthLive.open) * Math.min(1, dt * (target > mouthLive.open ? 28 : 16));
    headUniforms.uJaw.value = mouthLive.open * JAW.angle;

    // ── where he looks: at the stranger (the pointer), now and then at his laptop ──
    if (t > L.glanceAt && !speaking && !listening) {
      L.glanceUntil = t + 1.1 + Math.random() * 0.9;
      L.glanceAt = t + 7 + Math.random() * 8;
    }
    const glancing = t < L.glanceUntil;
    if (t > L.shiftAt) {
      L.shiftTarget = (Math.random() - 0.5) * 0.12;
      L.shiftAt = t + 6 + Math.random() * 7;
    }
    L.shift += (L.shiftTarget - L.shift) * Math.min(1, dt * 0.8);

    const m = motion.current;
    const k = Math.min(1, dt * (glancing ? 4 : 2.4));
    const yaw = glancing ? -0.12 : pointer.current.x * 0.3 + L.shift + (thinking ? 0.18 * Math.sin(t * 0.5) : 0);
    const pitch =
      (glancing ? 0.38 : pointer.current.y * 0.12) + (thinking ? -0.08 : 0) + (speaking ? Math.sin(t * 5.3) * level * 0.06 + Math.sin(t * 1.7) * 0.02 : 0);
    const roll = listening ? -0.07 : speaking ? Math.sin(t * 0.9) * 0.03 : Math.sin(t * 0.37) * 0.015;
    const lean = listening ? 0.1 : speaking ? 0.05 + level * 0.03 : thinking ? -0.02 : 0;
    m.yaw += (yaw - m.yaw) * k;
    m.pitch += (pitch - m.pitch) * k;
    m.roll += (roll - m.roll) * k;
    m.lean += (lean - m.lean) * Math.min(1, dt * 1.5);

    const breath = Math.sin(t * 1.25);
    // nobody sits still: a slow sway of the whole trunk
    const sway = Math.sin(t * 0.31) * 0.012 + Math.sin(t * 0.83) * 0.005;
    if (bones.spine) turn(bones.spine, euler(m.lean * 0.5 + breath * 0.008, m.yaw * 0.12, sway));
    if (bones.chest) turn(bones.chest, euler(m.lean * 0.5 - breath * 0.012, m.yaw * 0.18, m.roll * 0.2));
    if (bones.neck) turn(bones.neck, euler(m.pitch * 0.4, m.yaw * 0.3, m.roll * 0.4));
    if (bones.head) turn(bones.head, euler(SEAT.chin + m.pitch * 0.6, m.yaw * 0.45, m.roll * 0.6 - sway * 0.6));
  });

  return (
    <group ref={group} scale={SEAT.scale} position={SEAT.position}>
      <primitive object={gltf.scene} />
    </group>
  );
}

/** frames the room for the screen, and tells the windows where his face is */
function Framing() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const box = useMemo(() => new Box3(), []);
  const corner = useMemo(() => new Vector3(), []);
  const size3 = useMemo(() => new Vector3(), []);
  const head = useRef<Object3D | null>(null);
  const last = useRef("");
  const tick = useRef(0);

  useEffect(() => {
    const portrait = size.width / size.height < 0.85;
    // the stranger sits across the desk, a little to his left: the laptop stays beside him, not in front
    camera.position.set(portrait ? -0.1 : -0.32, portrait ? 0.36 : 0.55, portrait ? 3.4 : 2.5);
    camera.lookAt(portrait ? 0.05 : 0.04, portrait ? -0.12 : 0.2, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame(() => {
    if (++tick.current % 6) return;
    head.current ??= scene.getObjectByName("Head") ?? null;
    if (!head.current) return;
    head.current.getWorldPosition(corner).addScaledVector(FACE.centre, SEAT.scale);
    box.setFromCenterAndSize(corner, size3.copy(FACE.half).multiplyScalar(SEAT.scale * 2));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const sx = ((corner.x + 1) / 2) * size.width;
      const sy = ((1 - corner.y) / 2) * size.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const key = [x0, y0, x1, y1].map((v) => Math.round(v / 4)).join(",");
    if (key === last.current) return;
    last.current = key;
    useInterview.getState().set({ face: { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) } });
  });
  return null;
}

/** postprocessing's ToneMappingMode.NEUTRAL (the package is not ours to import): the same curve the renderer uses without effects */
const NEUTRAL = 8;

/** what a camera adds: shade where surfaces meet, a glow around the lamps, darker corners */
function Effects() {
  const quality = useWorldStore((s) => s.quality);
  if (quality === "low") return null;
  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0}>
      {quality === "high" ? <N8AO aoRadius={0.3} distanceFalloff={0.7} intensity={2.4} quality="medium" halfRes /> : <></>}
      <Bloom mipmapBlur intensity={0.3} luminanceThreshold={1} luminanceSmoothing={0.25} radius={0.65} />
      <Vignette darkness={0.42} offset={0.32} />
      <ToneMapping mode={NEUTRAL} />
    </EffectComposer>
  );
}

export default function OfficeStage() {
  const present = useInterview((s) => s.present);
  return (
    <Canvas
      className="!fixed inset-0 transition-opacity duration-1000"
      style={{ opacity: present ? 1 : 0 }}
      dpr={[1, 1.75]}
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ fov: 34, near: 0.05, far: 30, position: [0, 0.45, 2.4] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: NeutralToneMapping, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={["#9fb0b1"]} />
      <hemisphereLight args={["#ffffff", "#8d9794", 1.5]} />
      {/* the key: a large soft lamp in front of him, a little above his eyes, from the stranger's left */}
      <spotLight
        position={[-1.1, 1.15, 2.6]}
        angle={0.55}
        penumbra={1}
        intensity={11}
        distance={7}
        decay={1.5}
        color="#fff0e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={6}
      />
      {/* the fill, from the other side, so no half of his face is dark */}
      <pointLight position={[1.3, 0.7, 2.2]} intensity={3.2} distance={6} decay={1.5} color="#ffeede" />
      {/* daylight from a window out of frame, as a faint cool rim behind him */}
      <directionalLight position={[1.6, 0.9, -1.4]} intensity={0.5} color="#dbe6ff" />
      {/* the ceiling lights: one over the far wall, one over him */}
      <pointLight position={[-0.6, 1.8, -2]} intensity={5} distance={6} decay={1.6} color="#ffffff" />
      <pointLight position={[0.4, 1.8, -0.4]} intensity={3} distance={5} decay={1.6} color="#fff6ec" />
      <Environment resolution={128} environmentIntensity={0.7}>
        <Lightformer form="rect" intensity={2} color="#ffe6cc" position={[0, 2.5, 3]} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#7f9fd8" position={[1.4, 0.6, -3]} scale={[1.5, 1.6, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Office />
        <Avatar />
      </Suspense>
      <Framing />
      <Effects />
    </Canvas>
  );
}

useGLTF.preload(MODELS.avatar, DRACO);
