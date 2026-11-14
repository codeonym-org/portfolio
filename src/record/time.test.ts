import assert from "node:assert/strict";
import { test } from "node:test";
import { clockIn, difference, offsetMinutes } from "./time.ts";

const noon = new Date("2026-11-12T12:00:00Z");

test("a time zone's offset is read from the calendar, not hard-coded", () => {
  assert.equal(offsetMinutes("UTC", noon), 0);
  assert.equal(offsetMinutes("Africa/Casablanca", noon), 60);
  assert.equal(offsetMinutes("Asia/Kolkata", noon), 330);
  assert.equal(offsetMinutes("America/New_York", noon), -300);
  assert.equal(offsetMinutes("Africa/Casablanca", new Date("2026-11-12T12:00:59.900Z")), 60);
});

test("his clock is shown in 24 hours", () => {
  assert.equal(clockIn("Africa/Casablanca", noon), "13:00");
});

test("the difference is told from the visitor's side", () => {
  assert.equal(difference(60, 60), "the same time as you");
  assert.equal(difference(60, 0), "1 hour ahead of you");
  assert.equal(difference(60, -300), "6 hours ahead of you");
  assert.equal(difference(60, 540), "8 hours behind you");
  assert.equal(difference(60, 330), "4 h 30 min behind you");
});
