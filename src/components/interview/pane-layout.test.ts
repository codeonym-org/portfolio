import assert from "node:assert/strict";
import { test } from "node:test";
import { overlaps, placePanes, type Placement, type Room } from "./pane-layout.ts";

const room: Room = { width: 1440, height: 900, face: { x: 560, y: 120, w: 320, h: 460 }, keepClear: [{ x: 440, y: 820, w: 560, h: 64 }] };

const boxes = (placed: Map<string, Placement>, sizes: Record<string, [number, number]>) =>
  [...placed].filter(([, p]) => p.visible).map(([id, p]) => ({ x: p.x, y: p.y, w: sizes[id][0], h: sizes[id][1] }));

test("windows never cover each other, his face or the input", () => {
  const sizes: Record<string, [number, number]> = { a: [400, 220], b: [400, 160], c: [300, 90], d: [460, 380], e: [280, 60] };
  const placed = placePanes(Object.entries(sizes).map(([id, [w, h]]) => ({ id, w, h })), room, new Map());
  const shown = boxes(placed, sizes);
  assert.ok(shown.length >= 4);
  for (const [i, a] of shown.entries()) {
    assert.ok(!overlaps(a, room.face!), "over the face");
    assert.ok(!overlaps(a, room.keepClear[0]), "over the input");
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= room.width && a.y + a.h <= room.height, "off screen");
    for (const b of shown.slice(i + 1)) assert.ok(!overlaps(a, b), "two windows overlap");
  }
});

test("a window keeps its spot while it still fits", () => {
  const first = placePanes([{ id: "a", w: 400, h: 200 }], room, new Map());
  const again = placePanes([{ id: "b", w: 300, h: 100 }, { id: "a", w: 400, h: 200 }], room, first);
  assert.deepEqual(again.get("a"), first.get("a"));
});

test("when the room is full, the oldest gives way", () => {
  const small: Room = { width: 800, height: 600, face: { x: 250, y: 0, w: 300, h: 600 }, keepClear: [] };
  const panes = ["new", "mid", "old"].map((id) => ({ id, w: 200, h: 560 }));
  const placed = placePanes(panes, small, new Map());
  assert.equal(placed.get("new")!.visible, true);
  assert.equal(placed.get("mid")!.visible, true);
  assert.equal(placed.get("old")!.visible, false);
});

test("a window goes on the side it prefers", () => {
  const placed = placePanes([{ id: "words", w: 380, h: 200, side: "left" }, { id: "card", w: 380, h: 200, side: "right" }], room, new Map());
  assert.ok(placed.get("words")!.x + 190 < 720);
  assert.ok(placed.get("card")!.x + 190 > 720);
});

test("a new window in a full room sends the oldest away, not itself", () => {
  const small: Room = { width: 800, height: 600, face: { x: 250, y: 0, w: 300, h: 600 }, keepClear: [] };
  const before = placePanes(["mid", "old"].map((id) => ({ id, w: 200, h: 560 })), small, new Map());
  const after = placePanes(["new", "mid", "old"].map((id) => ({ id, w: 200, h: 560 })), small, before);
  assert.equal(after.get("new")!.visible, true);
  assert.equal(after.get("mid")!.visible, true);
  assert.deepEqual(after.get("mid"), before.get("mid"));
  assert.equal(after.get("old")!.visible, false);
});

test("the stranger's own words sit low, above the input, leaving the sides free", () => {
  const placed = placePanes([{ id: "you", w: 300, h: 70, anchor: "low" }], room, new Map());
  assert.ok(placed.get("you")!.y > 600);
});
