/**
 * What the console shows of the replica's replies. The model (an open-weights
 * model behind OpenRouter) sometimes writes its tool calls or control tokens
 * as text, loses the thread, or gets the disclosure wrong; every guard here
 * is deterministic and pure, so it is tested without the server or the browser.
 */

/** the disclosure the replica opens its first reply with */
export const disclosureOf = (firstName: string) => `I'm ${firstName}'s AI replica, and I answer as he would.`;

/** "replica" in the languages the stranger is likely to write in */
const DISCLOSED = /\b(?:replica|r[ée]plique|r[ée]plica)|نسخة/i;

/** the first reply always discloses: added when the model left it out */
export function withDisclosure(text: string, firstName: string): string {
  return !text.trim() || DISCLOSED.test(text) ? text : `${disclosureOf(firstName)} ${text}`;
}

/** a later reply never repeats it: a leading sentence that names the replica is dropped */
export function withoutRepeatedDisclosure(text: string): string {
  const m = /^\s*[^.!?\n]*[.!?]\s*/.exec(text);
  return m && DISCLOSED.test(m[0]) && text.length > m[0].length ? text.slice(m[0].length) : text;
}

const ZERO_WIDTH = /[\u200b-\u200d\u2060\ufeff]/g;
/** three or more filler marks in a row ("… … ...") — the model has lost the thread; nothing after it is kept */
const FILLER_RUN = /(?:\s*(?:…|\.{2,})){3,}[\s\S]*$/;

/**
 * A tool call the model wrote out as text instead of calling it, in any of the
 * shapes seen live: `--- { "tool": "show_map", … }`, `proposeaction({ … })`,
 * `<proposeaction{ … `, `{ "tools": [, ] }`. They all start with a JSON object
 * and come last; the replica never writes JSON in prose, so from there on it goes.
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
  const visible = unwrap(text).replace(LEAKED_CHANNEL, "").replace(LEAKED_CALL, "").replace(LEAKED_NAME, "").replace(CONTROL_TOKEN, "");
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
