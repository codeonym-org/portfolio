import assert from "node:assert/strict";
import { test } from "node:test";
import { describe as say, duration, firstArg, stepsFor, took } from "./activity.ts";
import { DOCK_HEIGHT, EDGE, stage } from "./stage.ts";

const face = { x: 650, y: 200, w: 140, h: 170 };

test("on a wide screen the panels stand beside his face, the same width, the input centred between them", () => {
  const s = stage(1440, 900, face, DOCK_HEIGHT.text);
  assert.equal(s.wide, true);
  assert.equal(s.talk.width, s.table.width);
  assert.ok(s.talk.left + s.talk.width < face.x, "the conversation never reaches his face");
  assert.ok(s.table.left > face.x + face.w, "nor does what he shows");
  assert.equal(s.table.left + s.table.width, 1440 - EDGE);
  assert.equal(s.dock.x, 720);
  assert.ok(s.dock.x - s.dock.w / 2 > s.talk.left + s.talk.width, "the input stays out of the panels");
  assert.ok(s.dock.x + s.dock.w / 2 < s.table.left);
});

test("a phone, or a room too narrow for two panels, has one sheet under his face", () => {
  for (const [w, h] of [
    [390, 844],
    [820, 1180],
    [1000, 1100],
  ]) {
    const s = stage(w, h, { x: w / 2 - 80, y: 90, w: 160, h: 180 }, DOCK_HEIGHT.text);
    assert.equal(s.wide, false, `${w}×${h}`);
    assert.deepEqual(s.talk, s.table);
    assert.ok(s.talk.top >= h * 0.3 && s.talk.top <= h * 0.5);
    assert.equal(s.talk.bottom, DOCK_HEIGHT.text + 8);
  }
});

test("a face framed off centre narrows both panels alike", () => {
  const s = stage(1280, 800, { x: 520, y: 160, w: 150, h: 170 }, DOCK_HEIGHT.audio);
  assert.equal(s.wide, true);
  assert.ok(s.talk.left + s.talk.width <= 520 - 28);
});

const trace = [
  { id: "a", name: "agent.run", args: "", status: "done" as const, startedAt: 1000, ms: 900 },
  { id: "b", name: "open_sector", args: 'sector: "projects"', status: "done" as const, startedAt: 1100, ms: 120 },
  { id: "c", name: "consult_archive", args: 'query: "rag"', status: "running" as const, startedAt: 5200 },
];

test("each question gets the steps taken until the next one, without the run's own plumbing", () => {
  assert.deepEqual(
    stepsFor(trace, 1000, 5000).map((s) => s.id),
    ["b"],
  );
  assert.deepEqual(
    stepsFor(trace, 5000, undefined).map((s) => s.id),
    ["c"],
  );
});

test("steps read as plain words, present while running, past once done", () => {
  assert.equal(say(trace[1]), "Opened projects");
  assert.equal(say({ ...trace[1], status: "running" }), "Opening projects…");
  assert.equal(say(trace[2]), "Searching the record…");
  assert.equal(say({ name: "brand_new_tool", args: "", status: "done" }), "Brand new tool");
  assert.equal(firstArg("id: pharma-mas"), "pharma-mas");
  assert.equal(took(trace), 1020);
  assert.equal(duration(1840), "1.8 s");
  assert.equal(duration(120), "120 ms");
});
