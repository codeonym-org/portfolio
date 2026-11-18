/**
 * ── WHAT CLAUDE KEEPS BETWEEN CALLS ───────────────────────────
 * Claude reads a cached prompt prefix at a tenth of the input price.
 * The prefix ends at a block marked `cache_control`; OpenRouter passes
 * the mark through. Two marks:
 *
 *  · the end of the fixed system prompt (the rules and the dossier,
 *    ~15k tokens, the same for every visitor), so the live app context
 *    the middlewares append after it never breaks the prefix;
 *  · the end of the latest human message, so the second call of a turn
 *    (after a tool) reads the whole conversation so far.
 *
 * Pure (unit-tested): the middleware in `server/middleware.ts` applies it.
 */

export type CacheMark = { type: "ephemeral" };
export type TextBlock = { type: "text"; text: string; cache_control?: CacheMark };

const MARK: CacheMark = { type: "ephemeral" };

/** the system text as blocks: the fixed prompt marked, whatever was appended after it in a block of its own */
export function cachedSystemBlocks(text: string, fixed: string): TextBlock[] {
  if (!text) return [];
  if (fixed && text.startsWith(fixed) && text.length > fixed.length) {
    return [
      { type: "text", text: fixed, cache_control: MARK },
      { type: "text", text: text.slice(fixed.length) },
    ];
  }
  return [{ type: "text", text, cache_control: MARK }];
}

/** a message's content with its last non-empty text block marked; null when there is nothing to mark */
export function markedContent(content: unknown): TextBlock[] | null {
  if (typeof content === "string") return content.trim() ? [{ type: "text", text: content, cache_control: MARK }] : null;
  if (!Array.isArray(content)) return null;
  let last = -1;
  content.forEach((b, i) => {
    if (b && typeof b === "object" && (b as TextBlock).type === "text" && typeof (b as TextBlock).text === "string" && (b as TextBlock).text.trim()) last = i;
  });
  if (last < 0) return null;
  return content.map((b, i) => (i === last ? { ...(b as TextBlock), cache_control: MARK } : b)) as TextBlock[];
}

/** only Claude models are asked to cache (others either cache on their own or reject the field) */
export const cachesPrompt = (modelId: string) => modelId.startsWith("anthropic/");
