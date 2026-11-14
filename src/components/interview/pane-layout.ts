/**
 * ── WHERE THE WINDOWS GO ──────────────────────────────────────
 * The parts of a reply float in the space around the avatar. They
 * must never cover each other, his face, the switch at the top or
 * the input at the bottom. A window that has a spot keeps it while it
 * still fits, so nothing jumps; a new one takes the free spot nearest
 * his face, on the side it prefers. When the room is full, the oldest
 * window gives way to the newest: it is hidden until there is room again.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PaneRequest {
  id: string;
  w: number;
  h: number;
  /** which side of the face it would rather be on */
  side?: "left" | "right";
  /** near his face (the default), or low in the room, just above the input */
  anchor?: "face" | "low";
}

export interface Placement {
  x: number;
  y: number;
  visible: boolean;
}

export interface Room {
  width: number;
  height: number;
  /** his face; null before the scene has framed it */
  face: Box | null;
  /** the switch, the input: no window over them */
  keepClear: Box[];
}

const GAP = 14;
const EDGE = 12;
const STEP = 14;

export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const grow = (b: Box, by: number): Box => ({ x: b.x - by, y: b.y - by, w: b.w + by * 2, h: b.h + by * 2 });

/** `panes` newest first; `previous` is where each was last time */
export function placePanes(panes: PaneRequest[], room: Room, previous: ReadonlyMap<string, Placement>): Map<string, Placement> {
  const fixed: Box[] = [...(room.face ? [grow(room.face, GAP)] : []), ...room.keepClear.map((b) => grow(b, GAP / 2))];
  const face = room.face ?? { x: room.width / 2 - 1, y: room.height / 3, w: 2, h: 2 };
  const fx = face.x + face.w / 2;
  const fy = face.y + face.h * 0.4;
  /** the windows placed so far, by id */
  const spots = new Map<string, Box>();
  const size = (p: PaneRequest) => ({ w: Math.min(p.w, room.width - EDGE * 2), h: Math.min(p.h, room.height - EDGE * 2) });

  const fits = (b: Box, self?: string) =>
    b.x >= EDGE &&
    b.y >= EDGE &&
    b.x + b.w <= room.width - EDGE &&
    b.y + b.h <= room.height - EDGE &&
    !fixed.some((t) => overlaps(b, t)) &&
    ![...spots].some(([id, s]) => id !== self && overlaps(b, grow(s, GAP)));

  const search = (pane: PaneRequest): Box | null => {
    const { w, h } = size(pane);
    let best = Infinity;
    let spot: Box | null = null;
    for (let y = EDGE; y + h <= room.height - EDGE; y += STEP) {
      for (let x = EDGE; x + w <= room.width - EDGE; x += STEP) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        // near his face, a little lower than his eyes, and on the side it prefers
        let score = pane.anchor === "low" ? Math.hypot((cx - room.width / 2) * 0.6, (y + h - (room.height - 110)) * 1.4) : Math.hypot((cx - fx) * 0.85, (cy - fy) * 1.15);
        if (pane.side === "left" && cx > fx) score += 160;
        if (pane.side === "right" && cx < fx) score += 160;
        if (score >= best) continue;
        const b = { x, y, w, h };
        if (!fits(b)) continue;
        best = score;
        spot = b;
      }
    }
    return spot;
  };

  // 1. every window keeps the spot it had, if it still fits there (newest first)
  for (const pane of panes) {
    const before = previous.get(pane.id);
    if (!before?.visible) continue;
    const b = { x: before.x, y: before.y, ...size(pane) };
    if (fits(b)) spots.set(pane.id, b);
  }

  // 2. the rest find a spot; a newer window without one sends the oldest away
  for (const [i, pane] of panes.entries()) {
    if (spots.has(pane.id)) continue;
    let spot = search(pane);
    while (!spot) {
      const older = panes.slice(i + 1).reverse().find((p) => spots.has(p.id));
      if (!older) break;
      spots.delete(older.id);
      spot = search(pane);
    }
    if (spot) spots.set(pane.id, spot);
  }

  const out = new Map<string, Placement>();
  for (const pane of panes) {
    const spot = spots.get(pane.id);
    const before = previous.get(pane.id);
    out.set(pane.id, spot ? { x: spot.x, y: spot.y, visible: true } : { x: before?.x ?? 0, y: before?.y ?? 0, visible: false });
  }
  return out;
}
