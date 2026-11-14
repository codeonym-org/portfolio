import assert from "node:assert/strict";
import { test } from "node:test";
import { interview } from "../config/interview.config.ts";
import type { InterviewEntry } from "../config/types.ts";
import { interviewGrounding, interviewLine, interviewProblems } from "./interview-grounding.ts";

test("every entry of the interview file is well formed", () => {
  assert.deepEqual(interviewProblems(interview), []);
  assert.ok(interview.length > 0);
});

test("every question reaches the grounding, with its answer when there is one", () => {
  const text = interviewGrounding(interview);
  for (const e of interview) {
    assert.ok(text.includes(`[${e.id}]`), e.id);
    assert.ok(text.includes(e.question), e.id);
    if (e.answer) assert.ok(text.includes(e.answer), e.id);
  }
});

test("an entry says how far its answer can be trusted", () => {
  const base: InterviewEntry = { id: "x", topic: "work", question: "Q?", status: "open" };
  assert.match(interviewLine(base), /no answer on file/);
  assert.match(interviewLine({ ...base, status: "from-record", answer: "I do." }), /A \[from the record\]: I do\./);
  assert.match(interviewLine({ ...base, status: "confirmed", answer: "I do." }), /A \[confirmed\]: I do\./);
  assert.match(interviewLine({ ...base, binding: true }), /\(work, binding\)/);
});

test("a malformed file is reported", () => {
  const bad: InterviewEntry[] = [
    { id: "a", topic: "work", question: "Q?", status: "open", answer: "Sneaked in." },
    { id: "a", topic: "work", question: "Q?", status: "confirmed" },
  ];
  assert.equal(interviewProblems(bad).length, 3);
});
