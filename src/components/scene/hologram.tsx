"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import { AdditiveBlending, CanvasTexture, Color, type Group, type MeshBasicMaterial, Vector3 } from "three";
import { quests } from "@/config/quests.config";
import { findGuild } from "@/config/guilds.config";
import { damp } from "@/record/layout";
import { recordNodes } from "@/record/nodes";
import { useWorldStore } from "@/store/world-store";
import { nodePositions, nodeScale } from "./constellation";
import { hueColor } from "./view";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const q = window.matchMedia(motionQuery);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

/** a soft round glow, drawn once and white so the material can tint it */
function auraTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.3, "rgba(255,255,255,0.35)");
  g.addColorStop(0.65, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/** what a project's stage reads as, the same words as its card in the Projects window */
export function stageOf(q: { stage?: string; status: string }) {
  return q.stage ?? (q.status === "ongoing" ? "ongoing" : "delivered");
}

/**
 * The chosen project, on display: an aura (a soft glow and two rings,
 * always facing the stranger) wraps its shard, and a projected card
 * names it above. One at a time — it follows `chosen` in the store.
 * Three draw calls and one DOM element; no post-processing. With
 * reduced motion the aura holds still.
 */
export function Hologram() {
  const chosen = useWorldStore((s) => s.chosen);
  const still = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => false);

  const index = chosen ? recordNodes.findIndex((n) => n.key === `quest:${chosen}`) : -1;
  const node = index >= 0 ? recordNodes[index] : null;
  const quest = chosen ? quests.find((q) => q.id === chosen) : undefined;

  const texture = useMemo(() => (typeof document === "undefined" ? null : auraTexture()), []);
  const tint = useMemo(() => new Color(node ? hueColor[node.hue] : "#ffffff"), [node]);

  const root = useRef<Group>(null);
  const ringA = useRef<Group>(null);
  const ringB = useRef<Group>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const appear = useRef({ key: "", value: 0 });
  /** the card hangs below the shard when the shard is high on the screen, so it never leaves the top edge */
  const [below, setBelow] = useState(false);
  const flip = useRef({ below: false, at: new Vector3() });

  useFrame(({ clock, camera }, delta) => {
    const g = root.current;
    if (!g || index < 0 || !node) return;
    const dt = Math.min(delta, 0.05);
    g.position.set(nodePositions[index * 3], nodePositions[index * 3 + 1], nodePositions[index * 3 + 2]);

    // a new choice unfolds from nothing; reduced motion shows it whole at once
    const a = appear.current;
    if (a.key !== node.key) {
      a.key = node.key;
      a.value = still ? 1 : 0;
    }
    a.value = still ? 1 : damp(a.value, 1, 5, dt);
    g.scale.setScalar(nodeScale[index] * a.value);

    const f = flip.current;
    const high = f.at.copy(g.position).project(camera).y;
    // a band of hysteresis, so a shard riding the line does not make the card flicker
    if (high > (f.below ? 0.2 : 0.3) !== f.below) {
      f.below = !f.below;
      setBelow(f.below);
    }

    const t = clock.elapsedTime;
    if (!still) {
      if (ringA.current) ringA.current.rotation.z = t * 0.6;
      if (ringB.current) ringB.current.rotation.z = -t * 0.35;
    }
    if (glow.current) glow.current.opacity = still ? 0.55 : 0.45 + Math.sin(t * 2.2) * 0.12;
  });

  if (!node || !quest || !texture) return null;
  const additive = { transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false } as const;
  const guild = findGuild(quest.guild)?.name;

  return (
    <group ref={root} scale={0.001}>
      <Billboard>
        <mesh scale={2.6} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={glow} map={texture} color={tint} opacity={0.5} {...additive} />
        </mesh>
        <group ref={ringA} scale={1.02}>
          <mesh renderOrder={3}>
            <ringGeometry args={[0.95, 1, 72]} />
            <meshBasicMaterial color={tint} opacity={0.75} {...additive} />
          </mesh>
        </group>
        <group ref={ringB} scale={1.2}>
          <mesh renderOrder={3}>
            <ringGeometry args={[0.97, 1, 72, 1, 0, Math.PI * 1.35]} />
            <meshBasicMaterial color={tint} opacity={0.45} {...additive} />
          </mesh>
        </group>
        <Html position={[0, below ? -1.3 : 1.3, 0]} center zIndexRange={[16, 0]} style={{ pointerEvents: "none" }}>
          <div className={below ? "holo-card holo-card--below" : "holo-card"} style={{ ["--hue" as string]: hueColor[node.hue] }} data-still={still || undefined}>
            <span className="holo-card__tag">on display</span>
            <span className="holo-card__name">{quest.name}</span>
            <span className="holo-card__sub">{[stageOf(quest), guild, quest.period].filter(Boolean).join(" · ")}</span>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}
