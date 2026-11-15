import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTurns, newMemory, nextQuestions } from "./turns.ts";

const typed = [
  { id: "v1", role: "visitor" as const, text: "Show me your projects" },
  { id: "s1", role: "system" as const, text: "Ten projects.", cards: [{ type: "map" as const }] },
];

test("a typed question and its answer are one turn", () => {
  const turns = buildTurns(typed, [], newMemory(), 1000);
  assert.equal(turns.length, 1);
  assert.deepEqual({ you: turns[0].you, him: turns[0].him, cards: turns[0].cards.length, spoken: turns[0].spoken }, { you: "Show me your projects", him: "Ten projects.", cards: 1, spoken: false });
});

test("typed and spoken turns come in the order they happened", () => {
  const memory = newMemory();
  buildTurns(typed, [], memory, 1000);
  const voice = [
    { id: "heard-1", kind: "heard" as const, text: "And your skills?" },
    { id: "voice-2", kind: "voice" as const, text: "Here they are." },
  ];
  const turns = buildTurns(typed, voice, memory, 2000);
  assert.deepEqual(turns.map((t) => t.id), ["v1", "heard-1"]);
  assert.equal(turns[1].him, "Here they are.");
});

test("what the voice handed over is shown in the spoken turn, not as a turn of its own", () => {
  const voice = [{ id: "heard-1", kind: "heard" as const, text: "Show me your skills" }];
  const session = [
    { id: "v9", role: "visitor" as const, text: "open the skills", voice: true },
    { id: "s9", role: "system" as const, text: "Done.", cards: [{ type: "skills" as const, ids: ["a"] }] },
  ];
  const turns = buildTurns(session, voice, newMemory(), 1000);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].cards.length, 1);
});

test("a question already asked is not suggested again", () => {
  const turns = buildTurns(typed, [], newMemory(), 1000);
  assert.deepEqual(nextQuestions(turns, ["Show me your projects", "Why you?", "Reach you?"], 2), ["Why you?", "Reach you?"]);
});
