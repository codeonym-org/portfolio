"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles, useGLTF } from "@react-three/drei";
import { ACESFilmicToneMapping, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, Vector3, type WebGLProgramParametersWithUniforms } from "three";
import { useVoiceStore, voiceLive } from "@/components/agent/voice/voice-store";
import { useWorldStore } from "@/store/world-store";
import { mouthLive, useInterview } from "./interview-store";

/**
 * ── THE AVATAR ────────────────────────────────────────────────
 * The owner's head and shoulders (generated from his photos, see
 * `scripts/assets/README.md`), alone in the dark. One mesh, no rig:
 * the jaw is moved in the vertex shader. Everything below the line
 * where his lips meet turns about a hinge near the ears, the seam
 * between the lips darkens as it opens, and the voice's loudness
 * drives it. The model is in metres-ish scene units, Y up, the face
 * toward +Z.
 */

const AVATAR_URL = "/models/avatar/avatar.glb";
const DRACO = "/draco/";

/** where the lips meet, the hinge of the jaw, and how far it opens (radians) */
const JAW = { stomion: 0.026, hinge: [0, 0.15, 0] as const, angle: 0.085 };
/** the head and beard, for the windows to keep clear of (scene units) */
const HEAD = { x: 0.4, bottom: -0.36, top: 0.86 };

const VERTEX_HEAD = /* glsl */ `
uniform float uJaw;
uniform float uReveal;
varying float vJaw;
varying float vMouth;
varying float vRestY;
const vec3 JAW_HINGE = vec3(${JAW.hinge.map((v) => v.toFixed(3)).join(", ")});
float jawWeight(vec3 p) {
  float ax = abs(p.x);
  // a sharp seam at the lips, a softer one up the cheeks, so the skin there stretches instead of tearing
  float halfWidth = mix(0.005, 0.05, smoothstep(0.07, 0.2, ax));
  float below = 1.0 - smoothstep(${JAW.stomion.toFixed(3)} - halfWidth, ${JAW.stomion.toFixed(3)} + halfWidth, p.y);
  float front = smoothstep(0.26, 0.38, p.z);
  float side = 1.0 - smoothstep(0.26, 0.4, ax);
  // the beard hangs over the collar: what is in front still moves, the shirt behind it does not
  float clear = max(smoothstep(-0.44, -0.3, p.y), smoothstep(0.34, 0.42, p.z));
  return below * front * side * clear;
}
vec3 jawTurn(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uJaw;
uniform float uReveal;
varying float vJaw;
varying float vMouth;
varying float vRestY;
`;

/** one avatar on the page: its shader inputs live with the module, written every frame */
const uniforms = { uJaw: { value: 0 }, uReveal: { value: -1 } };

function rig(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uJaw = uniforms.uJaw;
    shader.uniforms.uReveal = uniforms.uReveal;
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        float jw = jawWeight(position);
        objectNormal = jawTurn(objectNormal, uJaw * jw);
        #ifdef USE_TANGENT
        objectTangent = jawTurn(objectTangent, uJaw * jw);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed = JAW_HINGE + jawTurn(position - JAW_HINGE, uJaw * jw);
        vJaw = jw;
        vMouth = (1.0 - smoothstep(0.06, 0.1, abs(position.x))) * smoothstep(0.45, 0.55, position.z);
        vRestY = position.y;`,
      );
    shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        if (vRestY > uReveal) discard;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        // the stretched band between the lips is the open mouth: dark, a little warm
        float gap = clamp(4.0 * vJaw * (1.0 - vJaw) * 3.0, 0.0, 1.0) * vMouth * smoothstep(0.0, 0.3, uJaw / ${JAW.angle.toFixed(3)});
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.012, 0.016), gap * 0.94);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // the scan line that draws him in
        float edge = 1.0 - smoothstep(0.0, 0.035, uReveal - vRestY);
        totalEmissiveRadiance += vec3(0.45, 0.6, 1.0) * edge * 2.5 * step(uReveal, 1.2);`,
      );
  };
  material.customProgramCacheKey = () => "avatar-jaw";
  material.needsUpdate = true;
}

function Avatar() {
  const { scene } = useGLTF(AVATAR_URL, DRACO);
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const born = useRef(0);

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshStandardMaterial;
      if (material.map) material.map.colorSpace = SRGBColorSpace;
      material.envMapIntensity = 0.55;
      rig(material);
      mesh.frustumCulled = false;
    });
    uniforms.uReveal.value = -1;
    useInterview.getState().set({ present: true });
    useWorldStore.getState().setReady();
    const forced = new URLSearchParams(window.location.search).get("mouth");
    mouthLive.forced = forced === null ? null : Math.min(1, Math.max(0, Number(forced) || 0));
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [scene]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    born.current ||= t;
    // drawn in from the chest up, once
    uniforms.uReveal.value = Math.min(2, -0.9 + (t - born.current) * 0.85);

    const phase = useVoiceStore.getState().phase;
    const level = voiceLive.level;
    const target = mouthLive.forced ?? (phase === "speaking" ? Math.min(1, Math.max(0, (level - 0.04) * 1.9)) : 0);
    // opens fast, closes a little slower, like a jaw
    mouthLive.open += (target - mouthLive.open) * Math.min(1, dt * (target > mouthLive.open ? 28 : 16));
    uniforms.uJaw.value = mouthLive.open * JAW.angle;

    const k = Math.min(1, dt * 2.2);
    const listening = phase === "listening" || phase === "decoding";
    const thinking = phase === "thinking";
    const yaw = pointer.current.x * 0.22 + (thinking ? 0.12 * Math.sin(t * 0.6) : 0);
    const pitch = pointer.current.y * 0.08 + (listening ? 0.05 : 0) + (thinking ? -0.04 : 0) + (phase === "speaking" ? Math.sin(t * 6.5) * level * 0.025 : 0);
    const roll = listening ? -0.05 : Math.sin(t * 0.4) * 0.012;
    g.rotation.y += (yaw - g.rotation.y) * k;
    g.rotation.x += (pitch - g.rotation.x) * k;
    g.rotation.z += (roll - g.rotation.z) * k;
    // breathing
    g.position.y = Math.sin(t * 1.15) * 0.006;
    g.scale.setScalar(1 + Math.sin(t * 1.15 - 0.6) * 0.0025);
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

/** frames him for the screen, and tells the windows where his face is */
function Framing() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new Vector3(), []);
  const last = useRef("");

  useEffect(() => {
    const portrait = size.width / size.height < 0.85;
    camera.position.set(0, portrait ? 0.05 : 0.3, portrait ? 6.6 : 5.2);
    camera.lookAt(0, portrait ? -0.75 : 0.12, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const x of [-HEAD.x, HEAD.x]) for (const y of [HEAD.bottom, HEAD.top]) for (const z of [0, 0.6]) {
      point.set(x, y, z).project(camera);
      const sx = ((point.x + 1) / 2) * size.width;
      const sy = ((1 - point.y) / 2) * size.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const key = [x0, y0, x1, y1].map(Math.round).join(",");
    if (key === last.current) return;
    last.current = key;
    useInterview.getState().set({ face: { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) } });
  });
  return null;
}

export default function AvatarStage() {
  return (
    <Canvas
      className="!fixed inset-0"
      dpr={[1, 1.75]}
      camera={{ fov: 24, near: 0.1, far: 30, position: [0, 0.3, 5.2] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <ambientLight intensity={0.12} />
      {/* key, warm and high; fill, cool and low; two rims in the record's colours */}
      <directionalLight position={[-1.6, 2.2, 2.6]} intensity={2.3} color="#fff1e2" />
      <directionalLight position={[2.2, 0.5, 2]} intensity={0.55} color="#dfe6ff" />
      <directionalLight position={[-2.4, 1.6, -2.2]} intensity={1.7} color="#8f6bff" />
      <directionalLight position={[2.4, 1.2, -2.2]} intensity={1.5} color="#55c6ff" />
      <Environment resolution={128} environmentIntensity={0.8}>
        <Lightformer form="rect" intensity={2.2} position={[0, 2.5, 3]} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#8f6bff" position={[-3, 0.5, -1]} scale={[1, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#55c6ff" position={[3, 0.5, -1]} scale={[1, 3, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Avatar />
      </Suspense>
      <Sparkles count={70} scale={[5, 3.2, 2.5]} position={[0, 0.2, -0.6]} size={1.6} speed={0.18} opacity={0.35} color="#a99bff" />
      <Framing />
    </Canvas>
  );
}

useGLTF.preload(AVATAR_URL, DRACO);
