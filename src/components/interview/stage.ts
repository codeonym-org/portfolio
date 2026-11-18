/**
 * ── WHERE EVERYTHING STANDS ───────────────────────────────────
 * The room has three places, and nothing is put anywhere else:
 * the conversation on his left (the stranger's right hand side of
 * the screen is his right), what he shows on the other side, and
 * the input in the gap between them, under his face. The two panels
 * are the same width, so the input is always centred under him, and
 * neither panel ever reaches his face. On a phone, or when the room
 * is too narrow for the two panels beside him, the conversation is a
 * sheet under his face and what he shows slides up over it.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** a panel: from `left`, `width` wide; its top no higher than `top`, its bottom `bottom` px above the screen's */
export interface Place {
  left: number;
  width: number;
  top: number;
  bottom: number;
}

export interface Stage {
  /** the panels stand beside his face (otherwise one sheet under it) */
  wide: boolean;
  talk: Place;
  table: Place;
  /** the input: its centre and its width */
  dock: { x: number; w: number };
}

/** the margin from the screen's edges */
export const EDGE = 20;
/** under the top bar */
export const UNDER_BAR = 76;
/** the room kept clear on each side of his face */
const CLEAR = 28;
/** a panel narrower than this does not fit beside him */
const NARROWEST = 290;
/** how much wider the table grows, room allowing, when it holds several things and their rail */
export const RAIL = 82;
/** how much room the input takes at the bottom, by how the stranger asks */
export const DOCK_HEIGHT = { text: 124, audio: 232 } as const;

const snap = (v: number) => Math.floor(v / 16) * 16;

export function stage(vw: number, vh: number, face: Rect | null, dockHeight: number, rail = 0): Stage {
  const head = face ?? { x: vw / 2 - 110, y: vh * 0.2, w: 220, h: 240 };
  // his head moves a little as he breathes and looks: steps of 16 px keep the panels from following it
  const side = snap(Math.min(440, Math.max(300, vw * 0.27), head.x - CLEAR - EDGE, vw - head.x - head.w - CLEAR - EDGE));
  const wide = vw >= 960 && vw / vh >= 1 && side >= NARROWEST;

  if (wide) {
    // the rail takes what room there is between the table and his face, never closer than the rest
    const table = Math.max(side, Math.min(side + rail, vw - EDGE - (head.x + head.w + CLEAR)));
    const inner = { left: EDGE + side + 16, right: vw - EDGE - table - 16 };
    return {
      wide,
      talk: { left: EDGE, width: side, top: UNDER_BAR, bottom: EDGE },
      table: { left: vw - EDGE - table, width: table, top: UNDER_BAR, bottom: EDGE },
      dock: { x: (inner.left + inner.right) / 2, w: Math.min(620, inner.right - inner.left) },
    };
  }

  // one sheet under his face, from a third of the screen at the most to half of it at the least
  const top = Math.round(Math.min(vh * 0.5, Math.max(vh * 0.3, snap(head.y + head.h + 12))));
  const sheet: Place = { left: 12, width: vw - 24, top, bottom: dockHeight + 8 };
  return { wide, talk: sheet, table: sheet, dock: { x: vw / 2, w: Math.min(620, vw - 24) } };
}
