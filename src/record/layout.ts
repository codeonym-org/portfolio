/**
 * ── WHERE THE RECORD HANGS ────────────────────────────────────
 * Pure geometry for the scene: the orbit every shard rides at rest,
 * and the halo a group of shards forms around the Monolith when a
 * sector or a case is brought forward. No three.js here — plain
 * tuples, so it is unit-tested with `node --test`.
 */

export type Vec3 = [number, number, number];

export interface Orbit {
  radius: number;
  /** height of the ring's centre */
  y: number;
  /** tilt of the ring about the x axis, radians */
  incline: number;
  /** roll of the ring about the z axis, radians */
  roll: number;
  /** radians per second; negative orbits the other way */
  speed: number;
  /** where on the ring this shard sits at t = 0 */
  phase: number;
}

/** the point of an orbit at time t, written into `out` */
export function orbitPoint(o: Orbit, t: number, out: Vec3, scale = 1): Vec3 {
  const a = o.phase + o.speed * t;
  const x = Math.cos(a) * o.radius * scale;
  const z = Math.sin(a) * o.radius * scale;
  // incline about x
  const y1 = -z * Math.sin(o.incline);
  const z1 = z * Math.cos(o.incline);
  // roll about z
  out[0] = x * Math.cos(o.roll) - y1 * Math.sin(o.roll);
  out[1] = x * Math.sin(o.roll) + y1 * Math.cos(o.roll) + o.y * scale;
  out[2] = z1;
  return out;
}

/** a small deterministic hash → 0..1, so layouts never change between renders */
export function seeded(index: number, salt = 0): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const RING_CAPACITY = [12, 18, 24, 30];
const RING_RADIUS = [2.75, 3.45, 4.1, 4.7];

/** how many shards go on each concentric ring of a halo of n */
export function haloRings(n: number): number[] {
  if (n <= RING_CAPACITY[0]) return [n];
  const rings: number[] = [];
  let left = n;
  for (const cap of RING_CAPACITY) {
    if (left <= 0) break;
    rings.push(Math.min(cap, left));
    left -= cap;
  }
  if (left > 0) rings[rings.length - 1] += left;
  // spread evenly by circumference instead of filling the inner ring first
  const total = rings.reduce((sum, _, i) => sum + RING_RADIUS[i], 0);
  const even = rings.map((_, i) => Math.floor((n * RING_RADIUS[i]) / total));
  even[even.length - 1] += n - even.reduce((a, b) => a + b, 0);
  return even;
}

/**
 * A halo of n points around the Monolith, in the plane facing the
 * camera (+z), starting at twelve o'clock and going clockwise.
 */
export function haloPoints(n: number, scale = 1): Vec3[] {
  const points: Vec3[] = [];
  haloRings(n).forEach((count, ring) => {
    const r = RING_RADIUS[ring] * scale;
    // offset alternate rings so shards do not line up in spokes
    const start = Math.PI / 2 - (ring % 2 ? Math.PI / count : 0);
    for (let i = 0; i < count; i++) {
      const a = start - (i / count) * Math.PI * 2;
      points.push([Math.cos(a) * r, Math.sin(a) * r * 0.92 + 0.1 * scale, 2.2 - ring * 0.5]);
    }
  });
  return points;
}

/** critically damped approach of `current` to `target` — frame-rate independent */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}
