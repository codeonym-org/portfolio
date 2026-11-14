import assert from "node:assert/strict";
import { test } from "node:test";
import { damp, haloPoints, haloRings, orbitPoint, seeded, type Orbit, type Vec3 } from "./layout.ts";

const flat: Orbit = { radius: 5, y: 1, incline: 0, roll: 0, speed: 0.5, phase: 0 };

test("a flat orbit stays on its circle at its height", () => {
  for (const t of [0, 1.3, 9]) {
    const p = orbitPoint(flat, t, [0, 0, 0]);
    assert.ok(Math.abs(Math.hypot(p[0], p[2]) - 5) < 1e-9);
    assert.equal(p[1], 1);
  }
});

test("an inclined, rolled orbit keeps its radius from the ring centre", () => {
  const o: Orbit = { ...flat, incline: 0.6, roll: -0.3 };
  const p = orbitPoint(o, 2.2, [0, 0, 0]);
  assert.ok(Math.abs(Math.hypot(p[0], p[1] - 1, p[2]) - 5) < 1e-9);
});

test("scale shrinks the whole orbit, height included", () => {
  const p = orbitPoint(flat, 0, [0, 0, 0], 0.5);
  assert.deepEqual(p.map((v) => +v.toFixed(6)), [2.5, 0.5, 0]);
});

test("a halo holds every shard exactly once", () => {
  for (const n of [1, 3, 6, 12, 13, 53, 90]) {
    assert.equal(haloRings(n).reduce((a, b) => a + b, 0), n);
    assert.equal(haloPoints(n).length, n);
  }
});

test("a small halo is one ring that starts at twelve o'clock", () => {
  assert.deepEqual(haloRings(6), [6]);
  const [top] = haloPoints(6);
  assert.ok(Math.abs(top[0]) < 1e-9 && top[1] > 2);
});

test("no two shards of a halo share a spot", () => {
  const points = haloPoints(53);
  const near = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.35;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) assert.ok(!near(points[i], points[j]), `${i} and ${j} overlap`);
});

test("seeded is stable and stays in 0..1", () => {
  assert.equal(seeded(7, 2), seeded(7, 2));
  for (let i = 0; i < 50; i++) assert.ok(seeded(i) >= 0 && seeded(i) < 1);
});

test("damp approaches the target without overshooting, whatever the frame time", () => {
  assert.ok(damp(0, 10, 4, 0.016) > 0 && damp(0, 10, 4, 0.016) < 10);
  assert.ok(Math.abs(damp(0, 10, 4, 100) - 10) < 1e-9);
  assert.equal(damp(3, 3, 4, 0.5), 3);
});
