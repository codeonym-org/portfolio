import assert from "node:assert/strict";
import { test } from "node:test";
import { blocks, lasted, reference, rtl, runs, since, transcript, waited, type ExchangeInput } from "./transcript.ts";

const T0 = Date.UTC(2026, 10, 18, 13, 32, 7); // 14:32:07 in Casablanca (GMT+1)
const ask = (over: Partial<ExchangeInput>): ExchangeInput => ({ you: "Q?", him: "A.", spoken: false, at: T0, answeredAt: T0 + 4200, shown: [], did: [], ...over });
const opts = { id: "7f3a92c1-0000-4000-8000-000000000000", name: "Ayoub Bouarour", now: T0 + 20 * 60_000, timeZone: "Africa/Casablanca" };

test("exchanges are numbered, timed from the start and say how long the answer took", () => {
  const t = transcript(
    [
      ask({ you: "Tell me about yourself", at: T0 + 194_000, answeredAt: T0 + 196_500, spoken: true }),
      ask({ you: "  Show me   your projects ", shown: ["Section · Projects"], did: ["Opened projects", "Opened projects"] }),
    ],
    opts,
  );
  assert.equal(t.questions, 2);
  assert.deepEqual(
    t.exchanges.map((e) => [e.number, e.clock, e.offset, e.wait, e.spoken, e.question]),
    [
      ["01", "14:32:07", "+00:00", "4.2 s", false, "Show me your projects"],
      ["02", "14:35:21", "+03:14", "2.5 s", true, "Tell me about yourself"],
    ],
  );
  assert.deepEqual(t.exchanges[0].did, ["Opened projects"]);
  assert.equal(t.started, "14:32");
  assert.equal(t.ended, "14:35");
  assert.equal(t.date, "Wednesday 18 November 2026");
  assert.equal(t.typed, 1);
  assert.equal(t.spoken, 1);
  assert.equal(t.reference, "IV-7F3A-92C1");
  assert.equal(t.filename, "ayoub-bouarour-interview-transcript-2026-11-18-1432.pdf");
  assert.match(t.zone, /^Africa\/Casablanca · GMT\+1$/);
});

test("a new day is marked on its first exchange, and an empty question is dropped", () => {
  const t = transcript([ask({}), ask({ you: "  " }), ask({ you: "Next day", at: T0 + 24 * 3600_000 })], opts);
  assert.equal(t.questions, 2);
  assert.equal(t.exchanges[0].day, undefined);
  assert.equal(t.exchanges[1].day, "Thursday 19 November 2026");
});

test("an answer never written is marked, not invented", () => {
  const t = transcript([ask({ him: "", answeredAt: 0 })], opts);
  assert.equal(t.exchanges[0].unanswered, true);
  assert.equal(t.exchanges[0].wait, "");
});

test("answers keep their paragraphs, lists and emphasis; unsafe links lose their target", () => {
  assert.deepEqual(blocks("First line\ncontinued.\n\n- one\n- **two**\n2. later\n## Head"), [
    { kind: "p", runs: [{ text: "First line continued." }] },
    { kind: "item", marker: "•", runs: [{ text: "one" }] },
    { kind: "item", marker: "•", runs: [{ text: "two", bold: true }] },
    { kind: "item", marker: "2.", runs: [{ text: "later" }] },
    { kind: "heading", runs: [{ text: "Head" }] },
  ]);
  assert.deepEqual(runs("see [site](https://x.dev) and [bad](javascript:void0) or `code` *now*"), [
    { text: "see " },
    { text: "site", href: "https://x.dev" },
    { text: " and " },
    { text: "bad", href: undefined },
    { text: " or " },
    { text: "code", code: true },
    { text: " " },
    { text: "now", italic: true },
  ]);
});

test("times are said plainly", () => {
  assert.equal(since(3_725_000), "+1:02:05");
  assert.equal(lasted(20_000), "under a minute");
  assert.equal(lasted(64 * 60_000), "1 h 04 min");
  assert.equal(waited(400), "under a second");
  assert.equal(reference("ab"), "IV-AB00-0000");
});

test("Arabic is written right to left, a word of English in it or not", () => {
  assert.equal(rtl("ما هي خبرتك في LangChain؟"), true);
  assert.equal(rtl("Tell me about your projects"), false);
  assert.equal(rtl("I speak Arabic: العربية"), false);
  assert.equal(rtl("12:30"), false);
  const t = transcript([ask({ you: "حدثني عن مشاريعك", him: "بكل سرور.\n\n- **AiCA**: مساعد ذكي\n\nIn English too." })], opts);
  assert.equal(t.exchanges[0].questionRtl, true);
  assert.equal(t.exchanges[0].answerRtl, true);
  assert.deepEqual(
    t.exchanges[0].answer.map((b) => Boolean(b.rtl)),
    [true, true, false],
  );
});

test("everything shown is listed once, with the questions it was shown for", () => {
  const t = transcript(
    [
      ask({ you: "Projects?", shown: ["Section · Projects", "Project · AiCA"] }),
      ask({ you: "More on AiCA", at: T0 + 60_000, shown: ["Project · AiCA", "The brief"] }),
    ],
    opts,
  );
  assert.deepEqual(
    t.shownIndex.map((s) => [s.kind, s.name, s.in.map((q) => q.number).join(",")]),
    [
      ["Section", "Projects", "01"],
      ["Project", "AiCA", "01,02"],
      ["", "The brief", "02"],
    ],
  );
});
