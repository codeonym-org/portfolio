"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, PerformanceMonitor } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { ACESFilmicToneMapping } from "three";
import { live, useWorldStore, type Quality } from "@/store/world-store";
import { Beams } from "./beams";
import { Constellation } from "./constellation";
import { Hologram } from "./hologram";
import { Monolith } from "./monolith";
import { Rig } from "./rig";
import { aberration, COLORS } from "./view";
import { Void } from "./void";

/** `?quality=high|medium|low` pins the tier and turns the auto-tuner off (for profiling) */
function pinnedQuality(): Quality | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("quality");
  return q === "high" || q === "medium" || q === "low" ? q : null;
}

const DPR: Record<Quality, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [0.75, 1],
};

function Effects({ quality }: { quality: Quality }) {
  if (quality === "low") return null;
  const high = quality === "high";
  return (
    <EffectComposer multisampling={high ? 4 : 0}>
      <Bloom mipmapBlur intensity={high ? 0.95 : 0.75} luminanceThreshold={0.72} luminanceSmoothing={0.3} radius={0.72} />
      {high ? <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.35} /> : <></>}
      {high ? <Noise opacity={0.035} /> : <></>}
      <Vignette darkness={0.72} offset={0.22} />
    </EffectComposer>
  );
}

/** mounts once the models and the light have loaded — the Suspense boundary resolving is the signal */
function Ready() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    useWorldStore.getState().setReady();
    // the drawing buffer is not preserved: draw, then read in the same task
    live.capture = () =>
      new Promise((resolve) => {
        gl.render(scene, camera);
        gl.domElement.toBlob(resolve, "image/png");
      });
    return () => {
      live.capture = null;
    };
  }, [gl, scene, camera]);
  return null;
}

/** The whole 3D scene. Everything in it is one draw of the same idea: the Monolith and what orbits it. */
export function Stage() {
  const quality = useWorldStore((s) => s.quality);
  const setQuality = useWorldStore((s) => s.setQuality);
  const touch = useWorldStore((s) => s.touch);
  const ready = useWorldStore((s) => s.ready);

  // first visit on a phone/tablet starts at medium; the monitor adjusts from there
  useEffect(() => {
    const pinned = pinnedQuality();
    if (pinned) setQuality(pinned);
    else if (touch && useWorldStore.getState().quality === "high") setQuality("medium");
  }, [touch, setQuality]);

  return (
    <div className="fixed inset-0 bg-[var(--void)]">
      <Canvas
        style={{ touchAction: "none" }}
        dpr={DPR[quality]}
        camera={{ position: [0, -1.1, 9.5], fov: 36, near: 0.1, far: 140 }}
        gl={{ antialias: quality === "low", powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        {/* judged only once the scene is up: shader compiles while loading are not the GPU's steady state */}
        {ready && !pinnedQuality() && (
          <PerformanceMonitor
            flipflops={2}
            bounds={() => [35, 60]}
            onDecline={() => {
              // a backgrounded tab starves rAF — that is not the GPU struggling
              if (document.hidden) return;
              const q = useWorldStore.getState().quality;
              setQuality(q === "high" ? "medium" : "low");
            }}
          />
        )}
        <color attach="background" args={[COLORS.void]} />
        <fog attach="fog" args={[COLORS.void, 16, 44]} />
        <hemisphereLight args={["#3a3f7a", "#07050d", 0.35]} />
        <directionalLight color="#a9c4ff" intensity={1.5} position={[-6, 8, 6]} />
        <directionalLight color={COLORS.arcane} intensity={1.1} position={[7, -2, -5]} />
        <Rig />
        <Void />
        <Beams />
        <Suspense fallback={null}>
          <Environment files="/env/studio.hdr" environmentIntensity={0.75} />
          <Monolith />
          <Constellation />
          <Hologram />
          <Ready />
        </Suspense>
        <Effects quality={quality} />
      </Canvas>
    </div>
  );
}
