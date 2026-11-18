/**
 * ── SPEECH CHUNKER ────────────────────────────────────────────
 * The voice agent's reply streams in token by token; waiting for the
 * whole reply before speaking would add seconds of silence. This cuts
 * the stream into sentences as they complete, so the first one goes to
 * TTS while the model is still writing the rest.
 *
 * Pure and dependency-free (unit-tested with `node --test`).
 */

/** a chunk shorter than this waits for the next sentence (no choppy "Yes." requests) */
const MIN_CHUNK = 12;
/** a run-on sentence is broken at a comma / space past this length */
const MAX_CHUNK = 220;
/** the very first chunk breaks at a comma past this length — first audio sooner */
const FIRST_SOFT = 60;

const ABBREVIATIONS = ["e.g.", "i.e.", "etc.", "vs.", "mr.", "mrs.", "ms.", "dr.", "st.", "no.", "u.s.", "u.k."];

/** sentence ends: latin, ellipsis, Arabic question mark, CJK full stops */
const END = /[.!?…؟。！？]/;

/** index just past the first sentence end in `text`, or -1 */
function sentenceEnd(text: string): number {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") return i + 1;
    if (!END.test(ch)) continue;
    // swallow runs like "?!" or "..."
    let j = i + 1;
    while (j < text.length && END.test(text[j])) j++;
    if (j >= text.length) return -1; // can't tell yet: "3." might become "3.5"
    // two replies glued without a space ("…view.Then") — a word, then a capitalized word
    if (/\p{Lu}/u.test(text[j]) && /\p{Ll}{3}$/u.test(text.slice(0, i))) {
      if (j + 1 >= text.length) return -1;
      if (/\p{Ll}/u.test(text[j + 1])) return j;
    }
    if (!/\s/.test(text[j])) {
      i = j - 1;
      continue;
    }
    const word = text.slice(0, j).split(/\s/).pop()!.toLowerCase();
    if (ABBREVIATIONS.includes(word)) {
      i = j - 1;
      continue;
    }
    return j;
  }
  return -1;
}

/** where to cut an over-long run-on sentence */
function softBreak(text: string): number {
  const window = text.slice(0, MAX_CHUNK);
  const comma = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
  if (comma > MIN_CHUNK) return comma + 1;
  const space = window.lastIndexOf(" ");
  return space > MIN_CHUNK ? space : MAX_CHUNK;
}

/** text a voice can say: no markdown, links, bracket frames or emoji */
export function speakable(raw: string): string {
  let t = raw;
  t = t.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1"); // [label](url) → label
  t = t.replace(/\[\s*([^\]]+?)\s*\]\s*/g, "$1. "); // [ ON SCREEN ] → ON SCREEN.
  t = t.replace(/https?:\/\/\S+/g, "");
  t = t.replace(/<\|?[\w-]+\|?>?/g, ""); // leaked control tokens: <|return|>, <return, <br>
  t = t.replace(/[*_`~#>|]+/g, "");
  t = t.replace(/^\s*(?:[-•+]|\d+[.)])\s+/gm, "");
  t = t.replace(/\p{Extended_Pictographic}️?/gu, "");
  t = t.replace(/\.\s*\./g, ".");
  t = t.replace(/\s+/g, " ").trim();
  return /[\p{L}\p{N}]/u.test(t) ? t : "";
}

export interface SpeechChunker {
  /** feed a streamed delta; returns the sentences it completed */
  push(delta: string): string[];
  /** the stream ended: whatever is left */
  flush(): string[];
}

export function createSpeechChunker(): SpeechChunker {
  let buffer = "";
  /** a sentence too short to send alone, waiting for company */
  let held = "";
  let emitted = 0;

  const emit = (sentence: string, out: string[], force: boolean) => {
    const text = speakable(sentence);
    if (!text) return;
    const joined = held ? `${held} ${text}` : text;
    if (joined.length < MIN_CHUNK && !force) {
      held = joined;
      return;
    }
    held = "";
    emitted++;
    out.push(joined);
  };

  /** before anything was said: cut at the last comma once the opening clause is long enough */
  const earlyBreak = () => {
    if (emitted || buffer.length < FIRST_SOFT) return -1;
    const comma = buffer.lastIndexOf(", ");
    return comma >= FIRST_SOFT / 2 ? comma + 1 : -1;
  };

  return {
    push(delta) {
      buffer += delta;
      const out: string[] = [];
      for (;;) {
        const end = sentenceEnd(buffer);
        if (end >= 0) {
          emit(buffer.slice(0, end), out, false);
          buffer = buffer.slice(end);
          continue;
        }
        const early = earlyBreak();
        if (early > 0) {
          emit(buffer.slice(0, early), out, false);
          buffer = buffer.slice(early);
          continue;
        }
        if (buffer.length > MAX_CHUNK) {
          const cut = softBreak(buffer);
          emit(buffer.slice(0, cut), out, false);
          buffer = buffer.slice(cut);
          continue;
        }
        return out;
      }
    },
    flush() {
      const out: string[] = [];
      emit(buffer, out, true);
      if (held) out.push(held);
      buffer = "";
      held = "";
      return out;
    },
  };
}
