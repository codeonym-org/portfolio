import assert from "node:assert/strict";
import { test } from "node:test";
import { Lifetimes, RETENTION_MS, lapsed, lapsedThreads } from "./retention.ts";

const DAY = 24 * 60 * 60_000;

test("a conversation is kept seven days from its first message", () => {
  assert.equal(RETENTION_MS, 7 * DAY);
  assert.equal(lapsed(0, 7 * DAY - 1), false);
  assert.equal(lapsed(0, 7 * DAY), true);
});

test("a thread written again keeps its first date: it is forgotten seven days after it began", () => {
  const lives = new Lifetimes(10);
  lives.touch("a", 0);
  lives.touch("a", 6 * DAY);
  assert.deepEqual(lives.touch("b", 6 * DAY), []);
  assert.deepEqual(lives.touch("b", 7 * DAY), ["a"]);
});

test("the thread being written is never forgotten by its own writing", () => {
  const lives = new Lifetimes(1);
  lives.touch("a", 0);
  assert.deepEqual(lives.touch("a", 8 * DAY), []);
});

test("over the count, the thread written longest ago is forgotten", () => {
  const lives = new Lifetimes(2);
  lives.touch("a", 1);
  lives.touch("b", 2);
  lives.touch("a", 3);
  assert.deepEqual(lives.touch("c", 4), ["b"]);
});

test("a thread read after its time is forgotten, and begins again", () => {
  const lives = new Lifetimes(10);
  lives.touch("a", 0);
  assert.equal(lives.expire("a", 6 * DAY), false);
  assert.equal(lives.expire("a", 7 * DAY), true);
  assert.equal(lives.expire("a", 7 * DAY), false);
  lives.touch("a", 7 * DAY);
  assert.equal(lives.expire("a", 13 * DAY), false);
});

test("the sweep takes the runner's threads past their time, but not one that is running", () => {
  const at = (ms: number) => new Date(ms).toISOString();
  const store = {
    listThreads: () => [
      { id: "old", createdAt: at(0) },
      { id: "old-running", createdAt: at(0) },
      { id: "young", createdAt: at(5 * DAY) },
    ],
    peek: (id: string) => ({ isRunning: id === "old-running" }),
  };
  assert.deepEqual(lapsedThreads(store, 8 * DAY), ["old"]);
});
