import { Vector2 } from "three";
import type { Tone } from "@/config/types";
import type { NodeHue } from "@/record/nodes";

/** scene colours — the same hues the interface uses, as hex for three.js */
export const COLORS = {
  void: "#05040b",
  obsidian: "#07060d",
  arcane: "#8b5cf6",
  arcaneHot: "#b79bff",
  system: "#4cc3ff",
  gold: "#f5b83d",
  ember: "#ff6a3d",
  bone: "#cfc8dc",
};

export const hueColor: Record<NodeHue, string> = {
  gold: COLORS.gold,
  arcane: COLORS.arcane,
  system: COLORS.system,
  ember: COLORS.ember,
  bone: COLORS.bone,
};

export const toneColor: Record<Tone, string> = {
  system: COLORS.system,
  arcane: COLORS.arcane,
  gold: COLORS.gold,
  ember: COLORS.ember,
};

/**
 * Per-frame view state shared by the rig and the scene (never React
 * state): how the visitor has spun the sky, and how the scene is
 * scaled to fit the viewport.
 */
export const view = {
  /** yaw the visitor has dragged the sky to, and its momentum */
  spin: 0,
  spinVelocity: 0,
  dragging: false,
  /** camera distance and scene scales for this viewport (portrait screens pull everything in) */
  distance: 15,
  orbitScale: 1,
  haloScale: 1,
  /** vertical squash of the halo: next to an open window the console needs the bottom of the stage */
  haloSquash: 1,
  /** pointer in -1..1, for parallax */
  pointer: new Vector2(),
  /** how far the Monolith is open right now, 0 sealed … 1 wide */
  open: 2.4,
};

export function fitView(aspect: number) {
  const portrait = aspect < 1.15;
  view.distance = portrait ? 18.5 : 15;
  view.orbitScale = portrait ? 0.56 : 1;
  view.haloScale = portrait ? 0.6 : Math.min(1, aspect / 1.45);
}

/** lens split read by the ChromaticAberration pass */
export const aberration = new Vector2(0.0003, 0.0003);
