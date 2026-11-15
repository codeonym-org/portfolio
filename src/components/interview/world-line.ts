import { RETENTION_MS } from "../../agent/retention.ts";

/**
 * ── WHERE THINGS STAND IN SPACE-TIME ──────────────────────────
 * The transcript and the history are one space: time runs along z,
 * toward the viewer, so the past is further away. Events (the turns
 * of a conversation, or whole conversations) stand along a thread
 * that winds from side to side. The camera stands just in front of
 * the event in focus and looks back along the thread.
 */

export interface Point {
  x: number;
  y: number;
  z: number;
}

/** how far apart two turns are along time */
export const GAP = 3.6;
/** how far the thread swings to each side, at full width */
const SWING = 2.3;
/** how much of z the seven days of retention take */
export const SPAN = 34;
/** two conversations are never closer than this */
const APART = 3.4;

/** where each turn hangs: `spread` (0…1) narrows the swing on a narrow screen */
export function threadPoints(count: number, spread: number): Point[] {
  // one side, then the other, never by quite the same amount: the turn behind the one in front is always beside it
  return Array.from({ length: count }, (_, i) => ({ x: spread * SWING * (i % 2 ? 1 : -1) * (0.78 + 0.22 * Math.sin(i * 1.7)), y: 0, z: i * GAP }));
}

/** the thread before the first turn: it comes down out of the distance. Furthest first. */
export function threadTail(first: Point, spread: number, count = 7): Point[] {
  return Array.from({ length: count }, (_, n) => {
    const k = count - n;
    return { x: first.x + spread * 1.8 * Math.sin(k * 0.8), y: 0.2 * k * k, z: first.z - k * GAP * 1.15 };
  });
}

/**
 * Where each conversation stands, from how long ago it began (`ages`,
 * oldest first): the further back in the seven days, the further away,
 * and never on top of each other.
 */
export function timePoints(ages: readonly number[], spread: number): Point[] {
  const out: Point[] = new Array(ages.length);
  let nearer = Infinity;
  for (let i = ages.length - 1; i >= 0; i--) {
    const z = Math.min(-(Math.min(ages[i], RETENTION_MS) / RETENTION_MS) * SPAN, nearer - APART);
    out[i] = { x: spread * 1.5 * Math.sin(i * 1.1 + 0.3), y: 0, z };
    nearer = z;
  }
  return out;
}

/** the edge of the seven days: past the oldest conversation, and never nearer than seven days away */
export function horizonPoint(points: readonly Point[]): Point {
  return { x: 0, y: 0.6, z: Math.min(-SPAN, (points[0]?.z ?? 0) - 6) - 4 };
}

/** the event in front after moving `by` from `focus`, kept inside the list */
export const stepFocus = (focus: number, by: number, count: number) => Math.max(0, Math.min(count - 1, focus + by));
