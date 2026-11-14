"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  CanvasTexture,
  Bone,
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFSoftShadowMap,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useVoiceStore, voiceLive } from "@/components/agent/voice/voice-store";
import { useWorldStore } from "@/store/world-store";
import { headUniforms, JAW, rigHead } from "./head-shader";
import { mouthLive, useInterview } from "./interview-store";

/**
 * ── THE INTERVIEW ROOM ────────────────────────────────────────
 * An office in the evening. He sits behind a desk (a laptop and his
 * papers on it) facing the stranger, who sits where the camera is,
 * like the panel in a real interview. The body is a Rodin model with
 * a Rodin rig and its seated loop; his head (the edited scan) rides
 * on its Head bone. On top of the loop, by hand: breathing, his gaze
 * following the stranger, glances at the laptop, leaning in to
 * listen, nods as he speaks, blinks, and the jaw with his voice.
 * The desk and chair are Rodin models too; the room is drawn here.
 */

const MODELS = { avatar: "/models/office/avatar.glb", desk: "/models/office/desk.glb", chair: "/models/office/chair.glb" };
const DRACO = "/draco/";
const SEATED = "human_000085";

/** the room, in metres: the floor, the far wall, the side walls, the ceiling */
const ROOM = { floor: -0.74, back: -1.5, side: 2.4, ceiling: 1.95 };

/** how his head is fitted on the body: a lift (model units, before the avatar's own scale) and a scale */
const HEAD_FIT = { lift: new Vector3(0, 0.035, 0.005), scale: 1.08 };

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

function prepare(root: Object3D, shadows: boolean) {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.name.toLowerCase().startsWith("icosphere")) mesh.visible = false;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    const m = mesh.material as MeshStandardMaterial;
    if (m.map) m.map.colorSpace = SRGBColorSpace;
    m.metalness = Math.min(m.metalness, 0.05);
    m.envMapIntensity = 0.5;
  });
}

function Avatar() {
  const gltf = useGLTF(MODELS.avatar, DRACO);
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  /** a life: when he next blinks, where he looks when nobody moves */
  const life = useRef({ nextBlink: 1.5, blinkAt: -1, double: false, glanceAt: 6, glanceUntil: 0, shiftAt: 9, shift: 0, shiftTarget: 0 });
  const mixer = useMemo(() => new AnimationMixer(gltf.scene), [gltf.scene]);
  const bones = useMemo(() => {
    const find = (name: string) => gltf.scene.getObjectByName(name) as Bone | undefined;
    return { head: find("Head"), neck: find("Neck"), chest: find("Spine2"), spine: find("Spine1") };
  }, [gltf.scene]);
  /** where each of those bones rests: restored every frame, so a bone the loop does not move never drifts */
  const rest = useMemo(() => new Map(Object.values(bones).filter((b): b is Bone => !!b).map((b) => [b, b.quaternion.clone()])), [bones]);
  const motion = useRef({ yaw: 0, pitch: 0, roll: 0, lean: 0 });

  useEffect(() => {
    prepare(gltf.scene, true);
    const head = gltf.scene.getObjectByName("head") as Mesh | undefined;
    // his head sits a little low and small on the generated shoulders: lift it and scale it up, in world terms
    if (head?.parent) {
      gltf.scene.updateMatrixWorld(true);
      const at = head.getWorldPosition(new Vector3()).add(HEAD_FIT.lift);
      head.scale.multiplyScalar(HEAD_FIT.scale);
      head.position.copy(head.parent.worldToLocal(at));
    }
    const material = head?.material as MeshStandardMaterial | undefined;
    if (material) {
      material.normalScale.setScalar(0.6);
      rigHead(material);
    }
    const clip = gltf.animations.find((a) => a.name === SEATED) ?? gltf.animations[0];
    if (clip) mixer.clipAction(clip).play();
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
      mixer.stopAllAction();
    };
  }, [gltf, mixer, life]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const L = life.current;
    rest.forEach((q, b) => b.quaternion.copy(q));
    mixer.update(Math.min(dt, 0.1));
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
    if (bones.spine) turn(bones.spine, euler(m.lean * 0.5 + breath * 0.008, m.yaw * 0.12, 0));
    if (bones.chest) turn(bones.chest, euler(m.lean * 0.5 - breath * 0.012, m.yaw * 0.18, m.roll * 0.2));
    if (bones.neck) turn(bones.neck, euler(m.pitch * 0.4, m.yaw * 0.3, m.roll * 0.4));
    if (bones.head) turn(bones.head, euler(m.pitch * 0.6, m.yaw * 0.45, m.roll * 0.6));
  });

  return (
    <group ref={group} scale={0.92}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function Props() {
  const desk = useGLTF(MODELS.desk, DRACO);
  const chair = useGLTF(MODELS.chair, DRACO);
  useEffect(() => {
    prepare(desk.scene, true);
    prepare(chair.scene, true);
  }, [desk.scene, chair.scene]);
  return (
    <>
      {/* turned so the laptop and the papers face him; the stranger sees the back of the lid */}
      <primitive object={desk.scene} position={[0.3, -0.227, 0.68]} rotation={[0, Math.PI, 0]} scale={0.79} />
      <primitive object={chair.scene} position={[0, -0.265, -0.06]} scale={0.5} />
    </>
  );
}

/** books on a shelf: muted spines of different heights */
function Shelf({ position }: { position: [number, number, number] }) {
  const books = useMemo(() => {
    const colors = ["#3b4a5a", "#6b4a3a", "#2f3a33", "#8a7a62", "#4a3b52", "#5a5a5a", "#7a3b32", "#2e2e36"];
    let x = -0.42;
    const out: { x: number; h: number; w: number; c: string; tilt: number }[] = [];
    for (let i = 0; x < 0.42; i++) {
      const w = 0.025 + ((i * 37) % 5) * 0.006;
      const h = 0.2 + ((i * 53) % 7) * 0.012;
      out.push({ x: x + w / 2, h, w, c: colors[i % colors.length], tilt: i % 9 === 8 ? 0.2 : 0 });
      x += w + 0.003;
    }
    return out;
  }, []);
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.025, 0.24]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.6} />
      </mesh>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, 0.0125 + b.h / 2, 0]} rotation={[0, 0, b.tilt]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.17]} />
          <meshStandardMaterial color={b.c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** the office: a wood floor, warm walls, a window onto the dusk, a shelf, a print, a lamp's glow */
/** the sky outside at dusk, and a far skyline: a small canvas */
function useDusk() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 160;
    const g = c.getContext("2d")!;
    const sky = g.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, "#1d2b52");
    sky.addColorStop(0.55, "#4a5f96");
    sky.addColorStop(0.8, "#c98a6a");
    sky.addColorStop(1, "#e7a774");
    g.fillStyle = sky;
    g.fillRect(0, 0, 128, 160);
    // the city, dark against the glow, a few lit windows
    g.fillStyle = "#151826";
    let x = 0;
    for (let i = 0; x < 128; i++) {
      const w = 8 + ((i * 29) % 13);
      const h = 18 + ((i * 47) % 34);
      g.fillRect(x, 160 - h, w, h);
      g.fillStyle = "#f2c37a";
      for (let k = 0; k < 4; k++) if ((i * 7 + k * 13) % 5 === 0) g.fillRect(x + 2 + ((k * 3) % (w - 3)), 160 - h + 4 + k * 6, 2, 2);
      g.fillStyle = "#151826";
      x += w + 1;
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
}

function Room() {
  const { floor, back, side, ceiling } = ROOM;
  const dusk = useDusk();
  const h = ceiling - floor;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floor, 0]} receiveShadow>
        <planeGeometry args={[side * 2, 6]} />
        <meshStandardMaterial color="#4a3627" roughness={0.55} />
      </mesh>
      {/* a rug under the desk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floor + 0.004, 0.45]} receiveShadow>
        <planeGeometry args={[2.6, 2]} />
        <meshStandardMaterial color="#2c2a2e" roughness={0.95} />
      </mesh>
      <mesh position={[0, floor + h / 2, back]} receiveShadow>
        <planeGeometry args={[side * 2, h]} />
        <meshStandardMaterial color="#8a7d70" roughness={0.92} />
      </mesh>
      <mesh position={[-side, floor + h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6, h]} />
        <meshStandardMaterial color="#7d7064" roughness={0.92} />
      </mesh>
      <mesh position={[side, floor + h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[6, h]} />
        <meshStandardMaterial color="#7d7064" roughness={0.92} />
      </mesh>
      <mesh position={[0, ceiling, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[side * 2, 6]} />
        <meshStandardMaterial color="#3a332e" roughness={1} />
      </mesh>
      {/* skirting */}
      <mesh position={[0, floor + 0.05, back + 0.01]}>
        <boxGeometry args={[side * 2, 0.1, 0.02]} />
        <meshStandardMaterial color="#2d2621" roughness={0.6} />
      </mesh>

      {/* the window, right of him: dusk outside, mullions and a sill */}
      <group position={[1.35, 0.55, back + 0.005]}>
        <mesh>
          <planeGeometry args={[1.3, 1.5]} />
          <meshBasicMaterial map={dusk} toneMapped={false} />
        </mesh>
        {[-0.65, 0, 0.65].map((x) => (
          <mesh key={x} position={[x, 0, 0.02]}>
            <boxGeometry args={[0.05, 1.55, 0.04]} />
            <meshStandardMaterial color="#1f1b18" roughness={0.5} />
          </mesh>
        ))}
        {[-0.75, 0.1, 0.75].map((y) => (
          <mesh key={y} position={[0, y, 0.02]}>
            <boxGeometry args={[1.35, 0.05, 0.04]} />
            <meshStandardMaterial color="#1f1b18" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* a shelf of books, left of him, and a framed print above it */}
      <Shelf position={[-1.25, 0.32, back + 0.13]} />
      <Shelf position={[-1.25, -0.08, back + 0.13]} />
      <group position={[-1.25, 0.95, back + 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.72, 0.52, 0.03]} />
          <meshStandardMaterial color="#1c1916" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.017]}>
          <planeGeometry args={[0.62, 0.42]} />
          <meshStandardMaterial color="#c9bba6" roughness={0.9} />
        </mesh>
        <mesh position={[-0.08, 0.02, 0.019]}>
          <circleGeometry args={[0.12, 48]} />
          <meshStandardMaterial color="#7c5cff" roughness={0.9} />
        </mesh>
        <mesh position={[0.1, -0.05, 0.02]}>
          <circleGeometry args={[0.08, 48]} />
          <meshStandardMaterial color="#3fb8e8" roughness={0.9} />
        </mesh>
      </group>
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
    head.current ??= scene.getObjectByName("head") ?? null;
    if (!head.current) return;
    box.setFromObject(head.current, false);
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

export default function OfficeStage() {
  const present = useInterview((s) => s.present);
  return (
    <Canvas
      className="!fixed inset-0 transition-opacity duration-1000"
      style={{ opacity: present ? 1 : 0 }}
      dpr={[1, 1.75]}
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ fov: 34, near: 0.05, far: 30, position: [0, 0.45, 2.4] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: NeutralToneMapping, toneMappingExposure: 1.0 }}
    >
      <color attach="background" args={["#14110f"]} />
      <hemisphereLight args={["#ffe9d6", "#2a1d14", 0.45]} />
      {/* the key: a warm ceiling light in front of him, a little to his right */}
      <spotLight
        position={[-0.9, 1.85, 1.6]}
        angle={0.6}
        penumbra={0.8}
        intensity={9}
        distance={6}
        decay={1.6}
        color="#ffe2c2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* a soft fill from where the stranger sits */}
      <pointLight position={[0.6, 0.5, 2.2]} intensity={1.2} distance={5} decay={1.5} color="#ffeedd" />
      {/* the dusk from the window behind him, as a cool rim */}
      <directionalLight position={[1.6, 0.9, -1.4]} intensity={1.1} color="#8fb0ff" />
      {/* the room's own lamps, on the walls */}
      <pointLight position={[-1.25, 1.55, ROOM.back + 0.4]} intensity={1.4} distance={3} decay={1.8} color="#ffcf9a" />
      <Environment resolution={128} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2} color="#ffe6cc" position={[0, 2.5, 3]} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#7f9fd8" position={[1.4, 0.6, -3]} scale={[1.5, 1.6, 1]} />
      </Environment>
      <Room />
      <Suspense fallback={null}>
        <Props />
        <Avatar />
      </Suspense>
      <Framing />
    </Canvas>
  );
}

useGLTF.preload(MODELS.avatar, DRACO);
useGLTF.preload(MODELS.desk, DRACO);
useGLTF.preload(MODELS.chair, DRACO);
