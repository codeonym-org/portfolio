/**
 * What the console shows of the agent's replies. The model (an open-weights
 * model behind OpenRouter) sometimes writes its tool calls or control tokens
 * as text, or loses the thread; every guard here is deterministic and pure,
 * so it is tested without the server or the browser.
 */

const ZERO_WIDTH = /[\u200b-\u200d\u2060\ufeff]/g;
/** three or more filler marks in a row ("… … ...") — the model has lost the thread; nothing after it is kept */
const FILLER_RUN = /(?:\s*(?:…|\.{2,})){3,}[\s\S]*$/;

/**
 * A tool call the model wrote out as text instead of calling it, in any of the
 * shapes seen live: `--- { "tool": "show_map", … }`, `proposeaction({ … })`,
 * `<proposeaction{ … `, `{ "tools": [, ] }`. They all start with a JSON object
 * and come last; the agent never writes JSON in prose, so from there on it goes.
 */
const LEAKED_CALL = /\s*(?:-{3,}\s*)?(?:<?[a-z_]+\s*\(?\s*)?\{\s*"[\w-]+"\s*:[\s\S]*$/;

/** a call in the model's own channel format: `show_map<|constrain|>json<|message|>{}` */
const LEAKED_CHANNEL = /\s*[\w.-]*<\|constrain\|>[\s\S]*?<\|message\|>\s*\{[\s\S]*?\}/g;
/** any other control token: `<|return|>` */
const CONTROL_TOKEN = /<\|[\w-]+\|>/g;
/** a tool's name in brackets, `[show_map]`, or alone at the very end of the reply */
const LEAKED_NAME = /\s*\[[a-z]+(?:_[a-z]+)+\]|\s+[a-z]+(?:_[a-z]+)+\s*$/g;
/** the whole reply wrapped as JSON: `{ "response": "…" }`, possibly still streaming in */
const WRAPPED = /^\s*\{\s*"(?:response|reply|answer|text)"\s*:\s*"((?:[^"\\]|\\.)*)"?[\s\S]*$/;

function unwrap(text: string): string {
  const m = WRAPPED.exec(text);
  if (!m) return text;
  return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

/** what the console shows of a reply: no tool calls or control tokens written as text, no degenerate tail */
export function cleanReply(text: string): string {
  const visible = unwrap(text)
    .replace(LEAKED_CHANNEL, "")
    .replace(LEAKED_CALL, "")
    .replace(LEAKED_NAME, "")
    .replace(CONTROL_TOKEN, "")
    // invisible characters are never meant to be read, and leave gaps where they were
    .replace(ZERO_WIDTH, "")
    .replace(/[ \t]{2,}/g, " ");
  return withoutDegenerateTail(visible.trim());
}

/**
 * A reply with a degenerate tail ("I will … … ... … …") loses the tail. If
 * all that is left is a fragment of a few words with no end mark, the whole
 * reply is dropped. Ordinary text, a single ellipsis included, is unchanged.
 */
export function withoutDegenerateTail(text: string): string {
  const clean = text.replace(ZERO_WIDTH, "");
  if (!FILLER_RUN.test(clean)) return text;
  const kept = clean.replace(FILLER_RUN, "").trim();
  const words = kept.split(/\s+/).filter(Boolean).length;
  return words < 4 && !/[.!?]$/.test(kept) ? "" : kept;
}

/**
 * What the model writes in the same message as a tool call, before the call: a
 * finished sentence is kept, an unfinished fragment ("I will the the ...") is
 * not, since the answer that follows the call says it properly.
 */
export function withoutPreamble(text: string): string {
  const t = text.trim();
  const finished = /[.!?:)»"'”’]$/.test(t) && !/(?:\.{2,}|…)$/.test(t);
  return finished || t.split(/\s+/).length > 14 ? text : "";
}

/**
 * A reply that comes with an offer window ends on a statement: the window asks
 * the question. A last sentence ending in "?" (often the offer copied into the
 * text, or a fragment of it, "Shall ?") is dropped, as long as something is left.
 */
export function withoutTrailingQuestion(text: string): string {
  const kept = text.replace(/\s*(?:^|(?<=[.!])\s)[^.!?\n]*\?\s*$/, "").trim();
  return kept ? kept : text;
}

/**
 * The words beside an offer window. When the model's own words came out
 * broken (nothing left but a question or a fragment), the statement it wrote
 * in the offer itself stands in for them.
 */
export function besideAnOffer(text: string, offer: string | undefined): string {
  const kept = withoutTrailingQuestion(text);
  if (!broken(kept) || !offer) return broken(kept) ? text : kept;
  const said = withoutTrailingQuestion(offer.trim());
  return said.endsWith("?") ? kept || text : said;
}

/** words that came out broken: no end mark, a few words, or the model trailing off more than once */
const broken = (text: string) => !/[.!]$/.test(text) || text.split(/\s+/).length < 3 || (text.match(/…|\.{2,}/g) ?? []).length >= 2;

const same = (text: string) => text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

/**
 * One answer often comes in pieces: words, a tool call, more words. The model
 * sometimes says again after the call what it said before it; the answer then
 * shows it once.
 */
export function joinPieces(before: string, after: string): string {
  const a = same(before);
  const b = same(after);
  if (!a) return after;
  if (!b || a.includes(b)) return before;
  if (b.includes(a)) return after;
  return `${before}\n\n${after}`;
}
