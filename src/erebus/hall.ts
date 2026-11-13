/**
 * ── EREBUS: THE HALL ──────────────────────────────────────────
 * The floor plan the game is played on, measured from the model
 * (`public/models/erebus/hall.glb`): a long nave from the door in the
 * south (+z) to the throne in the north (-z), with an apse behind it.
 * Pure numbers, so the simulation, its tests and the scene share one
 * shape: walls, what stands on the floor, and where things are put.
 */

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export const HALL = {
  halfWidth: 8.1,
  north: -19.2,
  south: 27.2,
  /** where the hunter comes in, just inside the door */
  spawn: [0, 22] as [number, number],
  /** the vault is far higher; this is as high as the camera goes */
  ceiling: 12,
};

/** the apse is narrower than the nave, and closes behind the colossus */
const APSE = -9.6;
const APSE_HALF = 5.3;
const APSE_END = -16.8;

/** half the width of the floor at depth `z` */
export function halfWidthAt(z: number): number {
  if (z >= APSE) return HALL.halfWidth;
  if (z >= APSE_END) return APSE_HALF;
  return Math.max(2.4, APSE_HALF - (APSE_END - z));
}

/** what stands on the floor and cannot be walked through: [x, z, radius] */
export const BLOCKS: Circle[] = [
  // the throne
  { x: 0, z: -8.3, r: 1.3 },
  // the two tall pedestals beside it, and the two low ones in the nave
  { x: -4.78, z: -11.73, r: 1.3 },
  { x: 4.87, z: -11.73, r: 1.3 },
  { x: -7.44, z: 2.16, r: 1.3 },
  { x: 7.31, z: 2.16, r: 1.3 },
  // the fire bowls
  { x: -7.36, z: -8.1, r: 0.8 },
  { x: 7.3, z: -8.1, r: 0.8 },
  // the colossus
  { x: 0, z: -15.6, r: 2.2 },
];

/** the nearest point on the floor, `margin` away from the walls */
export function clamp(x: number, z: number, margin = 0): [number, number] {
  const cz = Math.min(HALL.south - margin, Math.max(HALL.north + margin, z));
  const hw = Math.max(0, halfWidthAt(cz) - margin);
  // where the nave meets the apse the wall turns a corner: do not cut through it
  if (z >= APSE && cz < APSE + margin && Math.abs(x) > APSE_HALF - margin) return [Math.min(HALL.halfWidth - margin, Math.max(-HALL.halfWidth + margin, x)), APSE + margin];
  return [Math.min(hw, Math.max(-hw, x)), cz];
}

/** a body of `radius` asked to stand at (x, z): slid off the blockers and kept inside the walls */
export function resolve(x: number, z: number, radius: number, extra: Circle[] = []): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const list of [BLOCKS, extra]) {
      for (const c of list) {
        const ox = x - c.x;
        const oz = z - c.z;
        const d = Math.hypot(ox, oz);
        const min = c.r + radius;
        if (d >= min) continue;
        if (d < 0.0001) {
          z += min;
          continue;
        }
        x = c.x + (ox / d) * min;
        z = c.z + (oz / d) * min;
      }
    }
    [x, z] = clamp(x, z, radius);
  }
  // pushed into a wall and back into the stone (a pedestal against the wall): go round it along the wall
  for (const list of [BLOCKS, extra]) {
    for (const c of list) {
      const ox = x - c.x;
      const min = c.r + radius;
      if (Math.hypot(ox, z - c.z) >= min - 0.001) continue;
      z = c.z + (z >= c.z ? 1 : -1) * Math.sqrt(Math.max(0, min * min - ox * ox));
    }
  }
  return [x, z];
}

/** a free spot somewhere in the nave */
export function anywhere(rng: () => number, extra: Circle[] = []): [number, number] {
  return resolve((rng() * 2 - 1) * (HALL.halfWidth - 1.5), -6 + rng() * (HALL.south - 2 + 6), 0.8, extra);
}

/** where the obelisks stand: two ranks along the walls of the nave, the first nearest the door */
export function obeliskSpots(count: number): { x: number; z: number }[] {
  const perSide = Math.ceil(count / 2);
  const from = 21.4;
  const to = 6.8;
  const gap = perSide > 1 ? (from - to) / (perSide - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    // the right-hand rank stands half a step back, so no two face each other
    return { x: side * 6.9, z: from - row * gap - (side > 0 && gap ? Math.min(gap / 2, 1.2) : 0) };
  });
}
