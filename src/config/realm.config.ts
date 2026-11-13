import type { Planet } from "./types";

/**
 * ── THE GATE REALM ────────────────────────────────────────────
 * One star, seven worlds, ordered from the star outward. A planet
 * that names a `gate` is charted: selecting it shows that gate and
 * Enter opens it. The others are uncharted: visible, dim, promising
 * nothing. To add a gate later, add it to `gates.config.ts` and name
 * it on one of the uncharted planets here.
 * Every planet is generated in a shader from these numbers: no
 * textures, no models.
 */
export const planets: Planet[] = [
  { id: "cinder", kind: "lava", orbit: 5.2, size: 0.5, phase: 0.62, palette: ["#2a0d08", "#5a1d0c", "#ff5a1f"], tilt: 0.1 },
  { id: "first-light", gate: "first-light", kind: "ocean", orbit: 8.4, size: 0.92, phase: 0.08, palette: ["#2f7fd6", "#3f9a6a", "#8fe9c8"], moons: 1, tilt: 0.38 },
  { id: "husk", kind: "barren", orbit: 11.4, size: 0.42, phase: 0.4, palette: ["#5b534c", "#a59a8c", "#c9c2b6"], tilt: 0.05 },
  { id: "colossus", kind: "gas", orbit: 15.4, size: 1.75, phase: 0.83, palette: ["#c98f55", "#f1dcb4", "#ff8f5a"], moons: 2, tilt: 0.12 },
  { id: "rime", kind: "ice", orbit: 19.6, size: 1.2, phase: 0.27, palette: ["#7fb8e6", "#e9f6ff", "#9fe3ff"], ring: "full", tilt: 0.46 },
  { id: "prism", kind: "crystal", orbit: 23.2, size: 0.7, phase: 0.55, palette: ["#6a3df0", "#c9b6ff", "#b48cff"], tilt: 0.3 },
  { id: "erebus", gate: "erebus", kind: "shroud", orbit: 27.5, size: 1.1, phase: 0.97, palette: ["#090a0d", "#353b45", "#8799ad"], ring: "broken", moons: 1, tilt: -0.34 },
];

export const realm = {
  eyebrow: "The Gate Realm",
  title: "Seven worlds, one star",
  intro: "Every gate into the record is a world in this system. Two are charted. Choose one and enter.",
  hint: "← → to travel · Enter to open · Esc for the whole realm",
  touchHint: "Swipe to travel · tap a world",
  overview: "Whole realm",
  uncharted: {
    name: "Uncharted",
    tagline: "No gate has been charted on this world.",
    description: "It keeps its orbit and its silence. When a new gate opens, it will open on a world like this one.",
  },
  enter: "ENTER THE GATE",
  seal: "SEE THE SEAL",
};

export const planetOfGate = (gateId: string) => planets.find((p) => p.gate === gateId);
