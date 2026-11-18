/**
 * ── THE BOOK OF DIARIES: HOW IT IS LAID OUT ───────────────────
 * Every conversation kept in this browser is one diary, and the
 * diaries are bound in one book: the contents first, then each diary
 * with its title page and its entries, written by hand. This file
 * cuts them into pages; `diary-book.tsx` draws and turns them.
 *
 * Pages hold a fixed number of ruled lines, and every size on a page
 * is a fraction of its width, so a page holds the same text at any
 * size. How much of a line a text takes is estimated from its
 * letters, a little generously, so what is cut to fit a page fits.
 */

export interface DiaryTurn {
  id: string;
  you: string;
  him: string;
  spoken: boolean;
  /** what he showed in answer ("skills", "map") */
  shown: string[];
  at: number;
}

export interface Diary {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  turns: DiaryTurn[];
}

export type Block =
  /** a new day begins */
  | { kind: "day"; at: number }
  /** the stranger's question, with its time in the margin */
  | { kind: "ask"; text: string; at: number; spoken: boolean }
  /** a paragraph of his answer, or the part of it on this page */
  | { kind: "say"; text: string; item: boolean; cont: boolean }
  /** his answer is still being written */
  | { kind: "writing" }
  /** what he showed, clipped to the page */
  | { kind: "shown"; what: string[] };

export type Page =
  | { kind: "contents"; rows: { diary: number; page: number }[]; first: boolean }
  | { kind: "title"; diary: number }
  | { kind: "entry"; diary: number; blocks: Block[]; first: boolean }
  /** after the last diary: room for the next one */
  | { kind: "fresh" };

/** ruled lines on a page */
export const LINES = 15;
/** how much of a line a text can fill, in the units of `measure` */
export const LINE = 31;
/** diaries listed on one page of contents */
export const ROWS = 7;

const NARROW = new Set("iljtfr.,;:'!|()[] ");
const WIDE = new Set("mwMW@%&—");

/** how much of a line a text takes: a letter is about one unit, a capital or a wide letter more */
export function measure(text: string): number {
  let n = 0;
  for (const ch of text) n += WIDE.has(ch) ? 1.45 : NARROW.has(ch) ? 0.55 : ch >= "A" && ch <= "Z" ? 1.2 : ch.charCodeAt(0) > 0x2000 ? 1.3 : 1;
  return n;
}

/** a text broken into lines of at most `width`; a word longer than a line is cut */
export function wrap(text: string, width = LINE): string[] {
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (measure(word) > width) {
      let cut = word.length;
      while (cut > 1 && measure(word.slice(0, cut)) > width) cut--;
      if (line) lines.push(line);
      lines.push(word.slice(0, cut));
      line = "";
      word = word.slice(cut);
    }
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= width) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Markdown as plain paragraphs: emphasis, code marks and links dropped, list items kept as items */
export function paragraphs(md: string): { text: string; item: boolean }[] {
  const out: { text: string; item: boolean }[] = [];
  let open: { text: string; item: boolean } | null = null;
  for (const raw of md.replace(/```[\s\S]*?```/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      open = null;
      continue;
    }
    const item = /^([-*+]|\d+[.)])\s+/.test(line);
    const text = line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^([-*+]|\d+[.)])\s+/, "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/(\*\*|__|\*|_|`)(.+?)\1/g, "$2")
      .replace(/[*`]/g, "")
      .trim();
    if (!text) continue;
    if (open && !item) open.text += ` ${text}`;
    else out.push((open = { text, item }));
  }
  return out;
}

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** how many ruled lines a block takes: a date two, a question its lines and one before it, a paragraph its lines */
export const cost = (b: Block, lines = 0) => (b.kind === "day" || b.kind === "shown" ? 2 : b.kind === "writing" ? 1 : b.kind === "ask" ? lines + 1 : lines);

/** a diary's entries, cut into pages of `LINES` lines */
export function entryPages(d: Diary, index: number, writing = false): Page[] {
  const pages: Page[] = [];
  let blocks: Block[] = [];
  let used = 0;
  const flush = () => {
    if (!blocks.length) return;
    pages.push({ kind: "entry", diary: index, blocks, first: pages.length === 0 });
    blocks = [];
    used = 0;
  };
  const put = (b: Block, lines = 0) => {
    const c = cost(b, lines);
    if (used + c > LINES) flush();
    blocks.push(b);
    used += c;
  };

  d.turns.forEach((t, i) => {
    if (i === 0 || !sameDay(d.turns[i - 1].at, t.at)) put({ kind: "day", at: t.at });
    // a question is never left alone at the foot of a page: it starts a page if its first two lines of answer would not follow it
    const ask = wrap(t.you, LINE - 4);
    if (used + cost({ kind: "ask", text: "", at: 0, spoken: false }, ask.length) + 2 > LINES) flush();
    put({ kind: "ask", text: t.you, at: t.at, spoken: t.spoken }, ask.length);

    const said = paragraphs(t.him);
    if (!said.length && writing && i === d.turns.length - 1) put({ kind: "writing" });
    for (const p of said) {
      let lines = wrap(p.text, p.item ? LINE - 2 : LINE);
      let cont = false;
      while (lines.length) {
        let room = LINES - used;
        if (room < 2 && lines.length > 1) {
          flush();
          room = LINES - 1;
        } else if (room < 1) {
          flush();
          room = LINES - 1;
        }
        const here = lines.slice(0, room);
        put({ kind: "say", text: here.join(" "), item: p.item && !cont, cont }, here.length);
        lines = lines.slice(here.length);
        cont = true;
      }
    }
    if (t.shown.length) put({ kind: "shown", what: t.shown });
  });
  flush();
  if (!pages.length) pages.push({ kind: "entry", diary: index, blocks: [{ kind: "writing" }], first: true });
  return pages;
}

export interface Bound {
  pages: Page[];
  /** the page each diary's title is on */
  starts: number[];
}

/** the whole book: the contents, every diary (its title page, then its entries), then a fresh page; `writing` is the diary whose answer is being written */
export function bind(diaries: readonly Diary[], writing: number | null = null): Bound {
  const contents = Math.max(1, Math.ceil(diaries.length / ROWS));
  const pages: Page[] = [];
  const starts: number[] = [];
  let at = contents;
  const bodies = diaries.map((d, i) => {
    const body: Page[] = [{ kind: "title", diary: i }, ...entryPages(d, i, writing === i)];
    starts.push(at);
    at += body.length;
    return body;
  });
  for (let p = 0; p < contents; p++) {
    const rows = diaries.slice(p * ROWS, (p + 1) * ROWS).map((_, k) => ({ diary: p * ROWS + k, page: starts[p * ROWS + k] }));
    pages.push({ kind: "contents", rows, first: p === 0 });
  }
  for (const body of bodies) pages.push(...body);
  pages.push({ kind: "fresh" });
  return { pages, starts };
}

/**
 * The faces of the book, in order: the cover, the endpaper, the pages,
 * the endpaper and the back. In a spread a leaf has two faces, so the
 * pages are padded to an even count; on a phone each leaf is one page
 * with a plain back.
 */
export type Face = { kind: "cover" } | { kind: "endpaper" } | { kind: "page"; page: number } | { kind: "blank" } | { kind: "back" } | { kind: "verso" };

export function faces(pageCount: number, spread: boolean): Face[] {
  const pages: Face[] = Array.from({ length: pageCount }, (_, page) => ({ kind: "page", page }));
  if (!spread) return [{ kind: "cover" }, ...pages, { kind: "back" }];
  if (pageCount % 2) pages.push({ kind: "blank" });
  return [{ kind: "cover" }, { kind: "endpaper" }, ...pages, { kind: "endpaper" }, { kind: "back" }];
}

/** the faces of one leaf: front and back */
export function leaf(all: readonly Face[], k: number, spread: boolean): [Face, Face] {
  return spread ? [all[2 * k], all[2 * k + 1]] : [all[k], { kind: "verso" }];
}

/** how many leaves the book has */
export const leaves = (all: readonly Face[], spread: boolean) => (spread ? all.length / 2 : all.length);

/** how many leaves are turned when page `page` is in view */
export function turnedFor(page: number, spread: boolean): number {
  if (!spread) return page + 1;
  // the cover and the endpaper are faces 0 and 1: page p is face p + 2, on the right when even, on the left when odd
  return Math.ceil((page + 2) / 2);
}

/** a small, steady number from a text: the same diary always gets the same stickers */
export function seed(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

/** roman numerals for the diaries' numbers */
export function roman(n: number): string {
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [v, s] of table)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}
