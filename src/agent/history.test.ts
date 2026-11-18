import assert from "node:assert/strict";
import { test } from "node:test";
import { ago, kept, KEEP, parse, questions, remaining, resumable, span, titleOf, written, type Conversation } from "./history.ts";

const DAY = 24 * 60 * 60_000;
const HOUR = 60 * 60_000;

const asked = (id: string, text: string, at = 0) => ({ id, role: "visitor" as const, text, at });
const said = (id: string, text: string) => ({ id, role: "system" as const, text });
const one = (id: string, createdAt: number, updatedAt = createdAt): Conversation => ({
  id,
  createdAt,
  updatedAt,
  title: id,
  turns: [asked(`${id}-q`, "Why you?"), said(`${id}-a`, "Because.")],
  messages: [],
  voice: [],
});

test("a conversation is dropped seven days after it began, whenever it was last touched", () => {
  const list = [one("old", 0, 6 * DAY), one("young", 2 * DAY)];
  assert.deepEqual(kept(list, 7 * DAY - 1).map((c) => c.id), ["old", "young"]);
  assert.deepEqual(kept(list, 7 * DAY).map((c) => c.id), ["young"]);
  assert.equal(remaining(list[1], 7 * DAY), 2 * DAY);
});

test("one browser keeps the most recent conversations only, oldest first", () => {
  const list = Array.from({ length: KEEP + 3 }, (_, i) => one(`c${i}`, i));
  const out = kept(list.reverse(), 100);
  assert.equal(out.length, KEEP);
  assert.equal(out[0].id, "c3");
  assert.equal(out.at(-1)?.id, `c${KEEP + 2}`);
});

test("a conversation with no question yet is not kept; it is once one is asked", () => {
  const empty = { id: "t", turns: [], messages: [], voice: [] };
  assert.deepEqual(written([], empty, 5), []);
  const out = written([], { ...empty, turns: [asked("q", "  Show me\n your projects ")] }, 5);
  assert.deepEqual(out.map((c) => [c.id, c.title, c.createdAt, c.updatedAt]), [["t", "Show me your projects", 5, 5]]);
});

test("writing a conversation again keeps when it began, and moves its last date only when something was added", () => {
  const first = written([], { id: "t", turns: [asked("q", "Why you?")], messages: [], voice: [] }, 10);
  const same = written(first, { id: "t", turns: [asked("q", "Why you?")], messages: [], voice: [] }, 20);
  assert.deepEqual([same[0].createdAt, same[0].updatedAt], [10, 10]);
  const more = written(same, { id: "t", turns: [asked("q", "Why you?"), said("a", "Because.")], messages: [1], voice: [] }, 30);
  assert.deepEqual([more[0].createdAt, more[0].updatedAt, more[0].messages.length], [10, 30, 1]);
});

test("a spoken question counts, what the voice handed over does not", () => {
  const c = {
    turns: [{ id: "h", role: "visitor" as const, text: "open the skills", voice: true, at: 5 }, asked("q", "Typed later", 9)],
    voice: [{ id: "heard-1", kind: "heard" as const, text: "Spoken first", at: 4 }],
  };
  assert.equal(questions(c), 2);
  assert.equal(titleOf(c), "Spoken first");
});

test("what was saved is read back without what is past its time or cannot be read", () => {
  const saved = JSON.stringify({ version: 1, current: "old", conversations: [one("old", 0), one("young", 3 * DAY), { id: "broken" }] });
  const back = parse(saved, 8 * DAY);
  assert.deepEqual(back.conversations.map((c) => c.id), ["young"]);
  assert.equal(back.current, null);
  assert.deepEqual(parse("not json", 0).conversations, []);
  assert.deepEqual(parse(JSON.stringify({ version: 9, conversations: [one("a", 0)] }), 0).conversations, []);
  assert.deepEqual(parse(null, 0).conversations, []);
});

test("the conversation to come back to is the one in progress, or else the one touched last", () => {
  const conversations = [one("a", 0, 50), one("b", 10, 20)];
  assert.equal(resumable({ version: 1, current: "b", conversations })?.id, "b");
  assert.equal(resumable({ version: 1, current: null, conversations })?.id, "a");
  assert.equal(resumable({ version: 1, current: null, conversations: [] }), undefined);
});

test("times are short enough for a label", () => {
  assert.deepEqual([ago(20_000), ago(12 * 60_000), ago(3 * HOUR), ago(2 * DAY + HOUR)], ["now", "12 min", "3 h", "2 d"]);
  assert.deepEqual([span(6 * DAY + 4 * HOUR), span(3 * HOUR + 12 * 60_000), span(8 * 60_000), span(10)], ["6 d 4 h", "3 h 12 min", "8 min", "1 min"]);
});
