/**
 * ── THE TRANSCRIPT, AS A DOCUMENT ─────────────────────────────
 * What the stranger takes away from the interview: every question in
 * the order it was asked, numbered and timed, with my answer, what I
 * showed for it and the steps I took. This file only lays out the
 * content (pure, tested); `transcript-pdf.tsx` draws it as a PDF and
 * `transcript-download.ts` gathers the conversation and saves the file.
 */

/** one stretch of an answer's text, styled */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

export type Block = (
  | { kind: "p"; runs: Run[] }
  | { kind: "item"; marker: string; runs: Run[] }
  | { kind: "heading"; runs: Run[] }
) & {
  /** written right to left (Arabic): set from its own letters */
  rtl?: boolean;
};

/** one exchange as the conversation gathered it */
export interface ExchangeInput {
  you: string;
  him: string;
  spoken: boolean;
  /** when the question was asked (ms since the epoch) */
  at: number;
  /** when the answer began; 0 if it never did */
  answeredAt: number;
  /** what I put on the table for it ("Section · Projects") */
  shown: string[];
  /** the steps I took, in words ("Opened projects") */
  did: string[];
}

export interface Exchange {
  n: number;
  /** "01" */
  number: string;
  /** anchor for the contents */
  anchor: string;
  question: string;
  /** the question is written right to left */
  questionRtl: boolean;
  answer: Block[];
  /** most of the answer's paragraphs are written right to left */
  answerRtl: boolean;
  /** the answer was never written */
  unanswered: boolean;
  spoken: boolean;
  /** "14:32:07" */
  clock: string;
  /** time since the interview began: "+03:12" */
  offset: string;
  /** how long before the answer began: "4.2 s", or "" */
  wait: string;
  shown: string[];
  did: string[];
  /** set on the first exchange of a new day (after the first): "Thursday 19 November 2026" */
  day?: string;
}

export interface Transcript {
  /** "IV-7F3A-92C1": the conversation's own reference */
  reference: string;
  /** "Wednesday 18 November 2026" */
  date: string;
  /** "18 Nov 2026" */
  shortDate: string;
  started: string;
  ended: string;
  /** "18 min", "1 h 04 min", "under a minute" */
  duration: string;
  /** "Africa/Casablanca · GMT+1" */
  zone: string;
  /** when the file was made: "18 Nov 2026, 15:02" */
  generated: string;
  questions: number;
  typed: number;
  spoken: number;
  /** words in my answers */
  words: number;
  exchanges: Exchange[];
  /** everything I showed, once each, in the order first shown, with the questions it was shown for */
  shownIndex: Shown[];
  filename: string;
}

export interface Shown {
  /** "Projects", the part after the kind */
  name: string;
  /** "Section", the part before the name; "" when there is none */
  kind: string;
  /** the questions it was shown for */
  in: { number: string; anchor: string }[];
}

export interface TranscriptOptions {
  /** the conversation's thread id */
  id: string;
  /** the owner's full name, for the file name */
  name: string;
  /** when the file is made (ms since the epoch) */
  now: number;
  /** the reader's time zone; their browser's when omitted */
  timeZone?: string;
}

const LOCALE = "en-GB";
const pad = (n: number) => String(n).padStart(2, "0");

function parts(at: number, timeZone: string | undefined, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).format(new Date(at));
}

/** the calendar day of a moment in a zone, to tell when a new day begins */
const dayKey = (at: number, timeZone?: string) => parts(at, timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });

/** "GMT+1" for the zone at that moment */
function offsetName(at: number, timeZone?: string): string {
  const name = new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: "shortOffset" }).formatToParts(new Date(at)).find((p) => p.type === "timeZoneName");
  return name?.value ?? "";
}

/** `194_000` → "+03:14"; an hour or more → "+1:03:14" */
export function since(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `+${h}:${pad(m)}:${pad(s % 60)}` : `+${pad(m)}:${pad(s % 60)}`;
}

/** how long the interview lasted, said plainly */
export function lasted(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "under a minute";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${pad(min % 60)} min`;
}

/** how long before the answer began */
export function waited(ms: number): string {
  if (!(ms > 0)) return "";
  return ms < 1000 ? "under a second" : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 1000)} s`;
}

/** a thread id → "IV-7F3A-92C1" */
export function reference(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").toUpperCase().padEnd(8, "0");
  return `IV-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ── the direction of writing ──

const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/gu;
const LTR_LETTER = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g;

/** written right to left: more Arabic (or Hebrew) letters than Latin ones */
export function rtl(text: string): boolean {
  const r = text.match(RTL_LETTER)?.length ?? 0;
  return r > 0 && r >= (text.match(LTR_LETTER)?.length ?? 0);
}

const plain = (b: Block) => b.runs.map((r) => r.text).join("");

// ── the answers' Markdown: the same small set the conversation draws ──

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
const safeHref = (href: string) => (/^(https?:\/\/|mailto:)/i.test(href) ? href : undefined);

/** a line of Markdown → styled runs; links are kept only for http(s) and mailto */
export function runs(text: string): Run[] {
  const out: Run[] = [];
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) out.push({ text: part.slice(2, -2), bold: true });
    else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) out.push({ text: part.slice(1, -1), code: true });
    else if (link) out.push({ text: link[1], href: safeHref(link[2]) });
    else if (/^(\*[^*\s][^*]*\*|_[^_\s][^_]*_)$/.test(part)) out.push({ text: part.slice(1, -1), italic: true });
    else out.push({ text: part });
  }
  return out;
}

/** an answer → paragraphs, list items and headings */
export function blocks(text: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let ordinal = 0;
  const flush = () => {
    if (para.length) out.push({ kind: "p", runs: runs(para.join(" ")) });
    para = [];
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (!line) {
      flush();
      ordinal = 0;
    } else if (bullet) {
      flush();
      out.push({ kind: "item", marker: "•", runs: runs(bullet[1]) });
    } else if (numbered) {
      flush();
      ordinal = Number(numbered[1]) || ordinal + 1;
      out.push({ kind: "item", marker: `${ordinal}.`, runs: runs(numbered[2]) });
    } else if (heading) {
      flush();
      out.push({ kind: "heading", runs: runs(heading[1]) });
    } else para.push(line);
  }
  flush();
  return out.map((b) => (rtl(plain(b)) ? { ...b, rtl: true } : b));
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** the conversation → the transcript; questions without a question are dropped */
export function transcript(input: readonly ExchangeInput[], o: TranscriptOptions): Transcript {
  const tz = o.timeZone;
  const list = input.filter((e) => e.you.trim()).sort((a, b) => a.at - b.at);
  const first = list[0]?.at ?? o.now;
  const last = list.at(-1);
  const end = Math.max(last?.answeredAt ?? 0, last?.at ?? 0, first);

  const clock = (at: number) => parts(at, tz, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const short = (at: number) => parts(at, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const longDay = (at: number) => parts(at, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", "");
  const shortDate = (at: number) => parts(at, tz, { day: "numeric", month: "short", year: "numeric" });

  const exchanges = list.map((e, i): Exchange => {
    const n = i + 1;
    const newDay = i > 0 && dayKey(e.at, tz) !== dayKey(list[i - 1].at, tz);
    const answer = blocks(e.him.trim());
    const question = e.you.trim().replace(/\s+/g, " ");
    return {
      n,
      number: pad(n),
      anchor: `q-${n}`,
      question,
      questionRtl: rtl(question),
      answer,
      answerRtl: answer.filter((b) => b.rtl).length * 2 > answer.length,
      unanswered: !answer.length,
      spoken: e.spoken,
      clock: clock(e.at),
      offset: since(e.at - first),
      wait: e.answeredAt && answer.length ? waited(e.answeredAt - e.at) : "",
      shown: [...new Set(e.shown)],
      did: [...new Set(e.did)],
      ...(newDay ? { day: longDay(e.at) } : {}),
    };
  });

  const index = new Map<string, Shown>();
  for (const e of exchanges)
    for (const label of e.shown) {
      const cut = label.indexOf(" · ");
      const entry = index.get(label) ?? { kind: cut < 0 ? "" : label.slice(0, cut), name: cut < 0 ? label : label.slice(cut + 3), in: [] };
      entry.in.push({ number: e.number, anchor: e.anchor });
      index.set(label, entry);
    }

  const stamp = parts(first, tz, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
  const zoneName = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    reference: reference(o.id),
    date: longDay(first),
    shortDate: shortDate(first),
    started: short(first),
    ended: short(end),
    duration: lasted(end - first),
    zone: [zoneName, offsetName(first, tz)].filter(Boolean).join(" · "),
    generated: `${shortDate(o.now)}, ${short(o.now)}`,
    questions: exchanges.length,
    typed: list.filter((e) => !e.spoken).length,
    spoken: list.filter((e) => e.spoken).length,
    words: list.reduce((sum, e) => sum + words(e.him), 0),
    exchanges,
    shownIndex: [...index.values()],
    filename: `${slug(o.name)}-interview-transcript-${stamp}-${short(first).replace(":", "")}.pdf`,
  };
}
