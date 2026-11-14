import assert from "node:assert/strict";
import { test } from "node:test";
import { interview } from "../config/interview.config.ts";
import type { InterviewEntry } from "../config/types.ts";
import { handedToTheOwner, interviewGrounding, interviewLine, interviewProblems } from "./interview-grounding.ts";

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

test("only questions with no answer are handed to the owner; a binding answer on file is shared", () => {
  const entries: InterviewEntry[] = [
    { id: "salary", topic: "terms", question: "Salary?", status: "open", binding: true },
    { id: "start", topic: "terms", question: "Start?", status: "confirmed", binding: true, answer: "After my notice period." },
    { id: "why", topic: "motivation", question: "Why?", status: "confirmed", answer: "Because I like it." },
  ];
  assert.equal(handedToTheOwner(entries), "· Salary?");
  assert.match(interviewGrounding(entries), /\(terms, binding\) Q: Start\?\n {2}A \[confirmed\]: After my notice period\./);
});
