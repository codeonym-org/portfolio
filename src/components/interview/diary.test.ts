import assert from "node:assert/strict";
import { test } from "node:test";
import { LINE, LINES, ROWS, bind, cost, entryPages, faces, leaf, leaves, measure, paragraphs, roman, turnedFor, wrap, type Block, type Diary } from "./diary.ts";

const T0 = Date.UTC(2026, 10, 18, 9, 30);
const diary = (n: number, him = "Yes.", id = "d"): Diary => ({
  id,
  createdAt: T0,
  updatedAt: T0,
  title: "Q0",
  turns: Array.from({ length: n }, (_, i) => ({ id: `t${i}`, you: `Question ${i}?`, him, spoken: false, shown: [], at: T0 + i * 60_000 })),
});
const used = (blocks: Block[]) => blocks.reduce((n, b) => n + cost(b, b.kind === "ask" ? wrap(b.text, LINE - 4).length : b.kind === "say" ? wrap(b.text, b.item ? LINE - 2 : LINE).length : 0), 0);

test("a line never holds more than it can", () => {
  const lines = wrap("the quick brown fox jumps over the lazy dog ".repeat(12));
  assert.ok(lines.length > 3);
  assert.ok(lines.every((l) => measure(l) <= LINE));
  assert.equal(wrap("x".repeat(80)).join(""), "x".repeat(80));
});

test("Markdown is written as plain paragraphs, list items kept apart", () => {
  const p = paragraphs("# Hello\nI **built** [this](https://x.y) in `Go`.\nStill here.\n\n- one\n- two\n");
  assert.deepEqual(p, [
    { text: "Hello I built this in Go. Still here.", item: false },
    { text: "one", item: true },
    { text: "two", item: true },
  ]);
});

test("a long answer runs over pages, and no page holds more lines than it has", () => {
  const long = "I worked on agents that plan, call tools and recover from their own mistakes. ".repeat(30);
  const pages = entryPages(diary(3, long), 0);
  assert.ok(pages.length > 3);
  for (const p of pages) if (p.kind === "entry") assert.ok(used(p.blocks) <= LINES, `page over: ${used(p.blocks)}`);
  // the text is all there, in order
  const text = pages.flatMap((p) => (p.kind === "entry" ? p.blocks : [])).filter((b) => b.kind === "say").map((b) => (b as { text: string }).text).join(" ");
  assert.equal(text.split(/\s+/).length, long.trim().split(/\s+/).length * 3);
});

test("each day starts with its date, and the first entry with the day", () => {
  const d = diary(2);
  d.turns[1].at = T0 + 26 * 60 * 60_000;
  const blocks = entryPages(d, 0).flatMap((p) => (p.kind === "entry" ? p.blocks : []));
  assert.deepEqual(blocks.filter((b) => b.kind === "day").length, 2);
  assert.equal(blocks[0].kind, "day");
});

test("an answer still being written shows as writing", () => {
  const pages = entryPages(diary(1, ""), 0, true);
  assert.ok(pages[0].kind === "entry" && pages[0].blocks.some((b) => b.kind === "writing"));
});

test("the book: contents, then each diary from its title page, then a fresh page", () => {
  const ds = Array.from({ length: ROWS + 2 }, (_, i) => diary(1, "Yes.", `d${i}`));
  const { pages, starts } = bind(ds);
  assert.equal(pages[0].kind, "contents");
  assert.equal(pages[1].kind, "contents");
  assert.equal(starts[0], 2);
  assert.ok(starts.every((s, i) => pages[s].kind === "title" && (pages[s] as { diary: number }).diary === i));
  assert.equal(pages.at(-1)?.kind, "fresh");
  const empty = bind([]);
  assert.deepEqual(empty.pages.map((p) => p.kind), ["contents", "fresh"]);
});

test("a spread pairs the faces into leaves, and each page is found where it is shown", () => {
  for (const count of [1, 2, 5, 6]) {
    const all = faces(count, true);
    assert.equal(all.length % 2, 0);
    for (let p = 0; p < count; p++) {
      const turned = turnedFor(p, true);
      // shown on the left: the back of the last leaf turned; on the right: the front of the next
      const left = leaf(all, turned - 1, true)[1];
      const right = turned < leaves(all, true) ? leaf(all, turned, true)[0] : null;
      assert.ok([left, right].some((f) => f?.kind === "page" && f.page === p), `page ${p} of ${count}`);
    }
  }
  const one = faces(3, false);
  assert.deepEqual(leaf(one, turnedFor(2, false), false)[0], { kind: "page", page: 2 });
});

test("roman numerals", () => {
  assert.deepEqual([1, 4, 9, 14, 24].map(roman), ["I", "IV", "IX", "XIV", "XXIV"]);
});
