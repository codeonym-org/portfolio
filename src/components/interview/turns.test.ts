import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTurns, nextQuestions } from "./turns.ts";

const typed = [
  { id: "v1", role: "visitor" as const, text: "Show me your projects", at: 1000 },
  { id: "s1", role: "system" as const, text: "Ten projects.", cards: [{ type: "map" as const }], at: 1000 },
];

test("a typed question and its answer are one turn", () => {
  const turns = buildTurns(typed, []);
  assert.equal(turns.length, 1);
  assert.deepEqual({ you: turns[0].you, him: turns[0].him, cards: turns[0].cards.length, spoken: turns[0].spoken, at: turns[0].at }, { you: "Show me your projects", him: "Ten projects.", cards: 1, spoken: false, at: 1000 });
});

test("typed and spoken turns come in the order they happened", () => {
  const voice = [
    { id: "heard-0", kind: "heard" as const, text: "Hello?", at: 500 },
    { id: "heard-1", kind: "heard" as const, text: "And your skills?", at: 2000 },
    { id: "voice-2", kind: "voice" as const, text: "Here they are.", at: 2100 },
  ];
  const turns = buildTurns(typed, voice);
  assert.deepEqual(turns.map((t) => t.id), ["heard-0", "v1", "heard-1"]);
  assert.equal(turns[2].him, "Here they are.");
});

test("what the voice handed over is shown in the spoken turn of that moment, not as a turn of its own", () => {
  const voice = [
    { id: "heard-1", kind: "heard" as const, text: "Show me your skills", at: 1000 },
    { id: "heard-2", kind: "heard" as const, text: "Thanks", at: 3000 },
  ];
  const session = [
    { id: "v9", role: "visitor" as const, text: "open the skills", voice: true, at: 1500 },
    { id: "s9", role: "system" as const, text: "Done.", cards: [{ type: "skills" as const, ids: ["a"] }], at: 1600 },
  ];
  const turns = buildTurns(session, voice);
  assert.deepEqual(turns.map((t) => [t.id, t.cards.length]), [["heard-1", 1], ["heard-2", 0]]);
});

test("a question already asked is not suggested again", () => {
  const turns = buildTurns(typed, []);
  assert.deepEqual(nextQuestions(turns, ["Show me your projects", "Why you?", "Reach you?"], 2), ["Why you?", "Reach you?"]);
});
