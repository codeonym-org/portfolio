"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import {
  AdditiveAnimationBlendMode,
  AnimationClip,
  AnimationMixer,
  AnimationUtils,
  Bone,
  LoopRepeat,
  Box3,
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
import { mouthLive, useInterview } from "./interview-store";
import { Office, prepare } from "./office-world";

/**
 * ── THE INTERVIEW ROOM ────────────────────────────────────────
 * A bright office. He sits behind a desk (a laptop and his
 * papers on it) facing the stranger, who sits where the camera is,
 * like the panel in a real interview. He is one Rodin model made from
 * a photo of him seated, rigged in Rodin (its humanoid skeleton and
 * its idle clip), with two shapes of his face made on the mesh: the jaw
 * open (the lips part, his mouth and teeth behind them) and the eyes
 * shut.
 * While he listens or waits he breathes, his head moves a little and
 * now and then he glances at his laptop. While he speaks every clip
 * stops and he looks the stranger in the eyes. He blinks, and the jaw
 * follows his voice.
 * The room and its furniture are in office-world.
 */

const MODELS = { avatar: "/models/office/avatar.glb" };
const DRACO = "/draco/";

/** how the model sits in the room: its size and where it is */
const SEAT = { scale: 0.48, position: [0, 0.16, 0.08] as const };
/** his face in the model, in model units: for the windows that keep clear of his face */
const FACE = { centre: new Vector3(-0.06, 0.62, -0.14), half: new Vector3(0.26, 0.34, 0.3) };
/** between his eyes, and the way his face points, in the model at rest (his head is turned a little in the model) */
const EYES = { between: new Vector3(-0.068, 0.596, 0.038), forward: new Vector3(-0.165, 0, 0.986).normalize() };
/** the face centre, carried by the head bone (set once the model is loaded) */
const faceInHead = new Vector3();

/** his face's two shapes, made on the mesh: the jaw open as wide as he opens it to speak, the eyes shut */
const SHAPES = { jaw: "jawOpen", blink: "blink" } as const;
/** how far the jaw opens for the loudest syllable */
const JAW_MAX = 0.75;

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

/** turn a bone by a rotation given in world axes, on top of what the animation set */
function turn(bone: Object3D, world: Quaternion) {
  const parent = new Quaternion();
  bone.parent?.getWorldQuaternion(parent);
  const local = parent.clone().invert().multiply(world).multiply(parent);
  bone.quaternion.premultiply(local);
  bone.updateMatrixWorld(true);
}

const euler = (pitch: number, yaw: number, roll: number) =>
  new Quaternion().setFromAxisAngle(Y, yaw).multiply(new Quaternion().setFromAxisAngle(X, pitch)).multiply(new Quaternion().setFromAxisAngle(Z, roll));

/**
 * His idle, from Rodin's humanoid set, made for a man standing. He sits
 * with his hands on the desk, so it plays as a change from its first
 * frame on the trunk, the neck and the head only: the breathing and the
 * sway without the stance.
 */
const IDLE = "human_000093";
const TRUNK = /^(Spine|Spine1|Spine2|Neck|Head)\.quaternion$/;

function seated(clip: AnimationClip) {
  const c = clip.clone();
  c.tracks = c.tracks.filter((t) => TRUNK.test(t.name));
  AnimationUtils.makeClipAdditive(c, 0);
  return c;
}

const _q = new Quaternion();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();

function Avatar() {
  const gltf = useGLTF(MODELS.avatar, DRACO);
  const camera = useThree((s) => s.camera);
  /** a life: when he next blinks, when he glances at his laptop, a slow drift of his head */
  const life = useRef({ nextBlink: 1.5, blinkAt: -1, double: false, glanceAt: 6, glanceUntil: 0, driftAt: 4, drift: { x: 0, y: 0 }, driftTarget: { x: 0, y: 0 } });
  const bones = useMemo(() => {
    const find = (name: string) => gltf.scene.getObjectByName(name) as Bone | undefined;
    return {
      head: find("Head"),
      neck: find("Neck"),
      chest: find("Spine2"),
    };
  }, [gltf.scene]);
  /** where each bone he moves by hand rests: every frame starts from there */
  const rest = useMemo(() => {
    const all = [bones.head, bones.neck, bones.chest].filter((b): b is Bone => !!b);
    return new Map(all.map((b) => [b, b.quaternion.clone()]));
  }, [bones]);
  /** between his eyes and the way his face points, in the head bone (set once the model is loaded) */
  const gaze = useRef({ eyes: new Vector3(), forward: new Vector3(), weight: 0 });
  const motion = useRef({ yaw: 0, pitch: 0, roll: 0 });
  /** the body mesh and where its two shapes are (found once the model is loaded) */
  const face = useRef({ influences: null as number[] | null, jaw: -1, blink: -1 });
  const mixer = useMemo(() => new AnimationMixer(gltf.scene), [gltf.scene]);
  const idle = useMemo(() => {
    const clip = gltf.animations.find((a) => a.name === IDLE);
    if (!clip) return null;
    const action = mixer.clipAction(seated(clip));
    action.blendMode = AdditiveAnimationBlendMode;
    return action;
  }, [gltf.animations, mixer]);

  useEffect(() => {
    idle?.setLoop(LoopRepeat, Infinity).play();
    return () => void mixer.stopAllAction();
  }, [idle, mixer]);

  useEffect(() => {
    prepare(gltf.scene);
    const body = gltf.scene.getObjectByName("model") as Mesh | undefined;
    const dict = body?.morphTargetDictionary;
    face.current = { influences: body?.morphTargetInfluences ?? null, jaw: dict?.[SHAPES.jaw] ?? -1, blink: dict?.[SHAPES.blink] ?? -1 };
    gltf.scene.traverse((o) => void ((o as Mesh).isMesh && (o.frustumCulled = false)));
    // the inside of his mouth takes no shadow from the lips: it is dark already
    const mouth = gltf.scene.getObjectByName("mouth") as Mesh | undefined;
    if (mouth) mouth.castShadow = mouth.receiveShadow = false;
    // he casts his shadow on the desk but takes none: on his face the shadow map draws the mesh's triangles
    if (body) body.receiveShadow = false;
    const material = body?.material as MeshStandardMaterial | undefined;
    if (material) {
      // skin, wool and cotton: nothing on him is metal, and nothing glossy
      material.metalnessMap = null;
      material.metalness = 0;
      material.roughness = 1;
    }
    gltf.scene.updateMatrixWorld(true);
    if (bones.head) {
      faceInHead.copy(bones.head.worldToLocal(gltf.scene.localToWorld(FACE.centre.clone())));
      gaze.current.eyes.copy(bones.head.worldToLocal(gltf.scene.localToWorld(EYES.between.clone())));
      const toHead = bones.head.getWorldQuaternion(new Quaternion()).invert();
      gaze.current.forward.copy(EYES.forward).transformDirection(gltf.scene.matrixWorld).applyQuaternion(toHead);
    }
    useInterview.getState().set({ present: true });
    useWorldStore.getState().setReady();
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("mouth");
    mouthLive.forced = forced === null ? null : Math.min(1, Math.max(0, Number(forced) || 0));
    if (params.get("blink") !== null) life.current.nextBlink = Infinity;
  }, [gltf, bones]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const L = life.current;
    rest.forEach((q, b) => b.quaternion.copy(q));

    const phase = useVoiceStore.getState().phase;
    const level = voiceLive.level;
    const speaking = phase === "speaking";
    const listening = phase === "listening" || phase === "decoding";
    const thinking = phase === "thinking";

    // ── his body: the idle while he waits; still while he speaks ──
    if (idle) {
      const w = idle.getEffectiveWeight();
      idle.setEffectiveWeight(w + ((speaking ? 0 : 1) - w) * Math.min(1, dt * 3));
    }
    mixer.update(dt);
    gltf.scene.updateMatrixWorld(true);

    // ── where he looks: a little here and there, at his laptop now and then; at the stranger as he speaks ──
    if (t > L.glanceAt) {
      if (!speaking && !listening) L.glanceUntil = t + 1.1 + Math.random() * 0.9;
      L.glanceAt = t + 8 + Math.random() * 9;
    }
    const glancing = t < L.glanceUntil && !speaking;
    if (t > L.driftAt) {
      L.driftTarget = { x: (Math.random() - 0.5) * 0.14, y: (Math.random() - 0.5) * 0.06 };
      L.driftAt = t + 3 + Math.random() * 5;
    }
    L.drift.x += (L.driftTarget.x - L.drift.x) * Math.min(1, dt * 0.9);
    L.drift.y += (L.driftTarget.y - L.drift.y) * Math.min(1, dt * 0.9);

    const m = motion.current;
    const k = Math.min(1, dt * (glancing ? 4 : 2.4));
    const yaw = speaking ? 0 : glancing ? -0.12 : L.drift.x + (thinking ? 0.12 * Math.sin(t * 0.5) : 0);
    const pitch = speaking ? Math.sin(t * 5.3) * level * 0.04 : glancing ? 0.36 : L.drift.y + (thinking ? -0.06 : 0);
    const roll = listening ? -0.06 : speaking ? 0 : Math.sin(t * 0.37) * 0.015;
    m.yaw += (yaw - m.yaw) * k;
    m.pitch += (pitch - m.pitch) * k;
    m.roll += (roll - m.roll) * k;

    // first his face is turned to the stranger: fully while he speaks, mostly while he listens
    const g = gaze.current;
    const target = speaking ? 1 : glancing ? 0 : 0.85;
    g.weight += (target - g.weight) * Math.min(1, dt * (speaking ? 4 : 2));
    if (bones.head && bones.neck) {
      for (const [bone, share] of [[bones.neck, 0.4], [bones.head, 1]] as const) {
        const eyes = bones.head.localToWorld(_a.copy(g.eyes));
        const facing = _b.copy(g.forward).transformDirection(bones.head.matrixWorld);
        const toCamera = _c.copy(camera.position).sub(eyes).normalize();
        turn(bone, _q.setFromUnitVectors(facing, toCamera).slerp(new Quaternion(), 1 - g.weight * share));
      }
    }
    // then the small moves on top
    if (bones.neck) turn(bones.neck, euler(m.pitch * 0.4, m.yaw * 0.4, m.roll * 0.4));
    if (bones.head) turn(bones.head, euler(m.pitch * 0.6, m.yaw * 0.6, m.roll * 0.6));

    // ── blinks: every 2–6 s, sometimes twice; a blink takes 150 ms ──
    let lid = 0;
    if (Number.isFinite(L.nextBlink)) {
      if (t >= L.nextBlink && L.blinkAt < 0) L.blinkAt = t;
      if (L.blinkAt >= 0) {
        const b = (t - L.blinkAt) / 0.15;
        lid = b < 0.4 ? b / 0.4 : Math.max(0, 1 - (b - 0.4) / 0.6);
        if (b >= 1) {
          L.blinkAt = -1;
          L.double = !L.double && Math.random() < 0.18;
          L.nextBlink = t + (L.double ? 0.18 : 2 + Math.random() * 4 + (listening ? 1 : 0));
        }
      }
    } else lid = 1;
    const F = face.current;
    if (F.influences && F.blink >= 0) F.influences[F.blink] = lid;

    // ── the jaw follows his voice ──
    const open = mouthLive.forced ?? (speaking ? Math.min(1, Math.max(0, (level - 0.04) * 1.9)) : 0);
    mouthLive.open += (open - mouthLive.open) * Math.min(1, dt * (open > mouthLive.open ? 28 : 16));
    if (F.influences && F.jaw >= 0) F.influences[F.jaw] = mouthLive.open * (mouthLive.forced === null ? JAW_MAX : 1);
  });

  return (
    <group scale={SEAT.scale} position={SEAT.position}>
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
    head.current.localToWorld(corner.copy(faceInHead));
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
