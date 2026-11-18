import { test } from "node:test";
import assert from "node:assert/strict";
import { TaskQueue, type TaskRecord } from "./task-queue.ts";

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

test("runs tasks one at a time, in order", async () => {
  const started: string[] = [];
  const gates = new Map<string, ReturnType<typeof deferred<string>>>();
  const queue = new TaskQueue({
    execute: (t) => {
      started.push(t.id);
      const g = deferred<string>();
      gates.set(t.id, g);
      return g.promise;
    },
  });
  queue.enqueue({ id: "a", task: "open the projects" });
  queue.enqueue({ id: "b", task: "inspect a project" });
  await tick();
  assert.deepEqual(started, ["a"]);
  assert.deepEqual(queue.snapshot().map((t) => t.status), ["running", "queued"]);
  gates.get("a")!.resolve("opened");
  await tick();
  assert.deepEqual(started, ["a", "b"]);
  gates.get("b")!.resolve("shown");
  await tick();
  assert.deepEqual(queue.snapshot().map((t) => [t.status, t.result]), [
    ["done", "opened"],
    ["done", "shown"],
  ]);
});

test("numbers tasks and reports each one exactly once", async () => {
  const settled: TaskRecord[] = [];
  const queue = new TaskQueue({ execute: async (t) => `did ${t.task}`, onSettled: (t) => settled.push(t) });
  queue.enqueue({ id: "x", task: "one" });
  queue.enqueue({ id: "y", task: "two" });
  await queue.idle();
  assert.deepEqual(
    settled.map((t) => [t.n, t.status, t.result]),
    [
      [1, "done", "did one"],
      [2, "done", "did two"],
    ],
  );
});

test("a failing task is reported as failed and the queue moves on", async () => {
  const settled: TaskRecord[] = [];
  const queue = new TaskQueue({
    execute: async (t) => {
      if (t.id === "bad") throw new Error("gate collapsed");
      return "ok";
    },
    onSettled: (t) => settled.push(t),
  });
  queue.enqueue({ id: "bad", task: "boom" });
  queue.enqueue({ id: "good", task: "fine" });
  await queue.idle();
  assert.deepEqual(
    settled.map((t) => [t.id, t.status, t.result]),
    [
      ["bad", "failed", "gate collapsed"],
      ["good", "done", "ok"],
    ],
  );
});

test("says why it refused: a duplicate id, or work beyond the pending cap", () => {
  const queue = new TaskQueue({ execute: () => new Promise(() => {}), maxPending: 2 });
  assert.equal(queue.enqueue({ id: "a", task: "1" }), "queued");
  assert.equal(queue.enqueue({ id: "a", task: "1 again" }), "duplicate");
  assert.equal(queue.enqueue({ id: "b", task: "2" }), "queued");
  assert.equal(queue.enqueue({ id: "c", task: "3" }), "full");
  assert.equal(queue.snapshot().length, 2);
});

test("notifies listeners on every change and keeps only recent history", async () => {
  let changes = 0;
  const queue = new TaskQueue({ execute: async () => "ok", history: 3, onChange: () => changes++ });
  for (const id of ["1", "2", "3", "4", "5"]) queue.enqueue({ id, task: id });
  await queue.idle();
  assert.ok(changes >= 10, `expected queued + running + done notifications, got ${changes}`);
  assert.deepEqual(
    queue.snapshot().map((t) => t.id),
    ["3", "4", "5"],
  );
});

test("clear() drops queued work but lets the running task finish", async () => {
  const gate = deferred<string>();
  const ran: string[] = [];
  const queue = new TaskQueue({
    execute: (t) => {
      ran.push(t.id);
      return gate.promise;
    },
  });
  queue.enqueue({ id: "a", task: "a" });
  queue.enqueue({ id: "b", task: "b" });
  await tick();
  queue.clear();
  gate.resolve("done");
  await queue.idle();
  assert.deepEqual(ran, ["a"]);
  assert.deepEqual(queue.snapshot().map((t) => [t.id, t.status]), [["a", "done"]]);
});
