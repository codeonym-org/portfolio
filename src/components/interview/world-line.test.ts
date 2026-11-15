import assert from "node:assert/strict";
import { test } from "node:test";
import { GAP, SPAN, horizonPoint, stepFocus, threadPoints, threadTail, timePoints } from "./world-line.ts";

const DAY = 24 * 60 * 60_000;

test("turns stand one gap apart along time, the latest nearest", () => {
  const points = threadPoints(4, 1);
  assert.deepEqual(points.map((p) => p.z), [0, GAP, 2 * GAP, 3 * GAP]);
  assert.ok(points.every((p) => Math.abs(p.x) <= 2.3 && p.y === 0));
  assert.ok(threadPoints(4, 0.4).every((p, i) => Math.abs(p.x - points[i].x * 0.4) < 1e-9));
  // each turn hangs on the other side of the one before
  for (let i = 1; i < points.length; i++) assert.ok(points[i].x * points[i - 1].x < 0);
});

test("the thread comes out of the distance before the first turn: further is higher", () => {
  const tail = threadTail({ x: 1, y: 0, z: 0 }, 1, 5);
  assert.equal(tail.length, 5);
  for (let i = 1; i < tail.length; i++) {
    assert.ok(tail[i].z > tail[i - 1].z);
    assert.ok(tail[i].y < tail[i - 1].y);
  }
  assert.ok(tail.at(-1)!.z < 0);
});

test("a conversation stands as far away as it is old, seven days at the far end", () => {
  const [old, mid, young] = timePoints([7 * DAY, 3.5 * DAY, 0], 1);
  assert.ok(Math.abs(old.z + SPAN) < 1e-9);
  assert.ok(Math.abs(mid.z + SPAN / 2) < 1e-9);
  assert.equal(Math.abs(young.z), 0);
});

test("conversations of the same hour do not stand on top of each other", () => {
  const points = timePoints([3000, 2000, 1000], 1);
  assert.ok(points[1].z - points[0].z >= 3.4 - 1e-9);
  assert.ok(points[2].z - points[1].z >= 3.4 - 1e-9);
});

test("the edge of the seven days is behind every conversation", () => {
  assert.ok(horizonPoint([]).z <= -SPAN);
  const crowded = timePoints(Array.from({ length: 14 }, (_, i) => (14 - i) * 1000), 1);
  assert.ok(horizonPoint(crowded).z < crowded[0].z - 5);
});

test("moving through time stops at the first and the last event", () => {
  assert.deepEqual([stepFocus(0, -1, 3), stepFocus(1, 1, 3), stepFocus(2, 1, 3)], [0, 2, 2]);
});
