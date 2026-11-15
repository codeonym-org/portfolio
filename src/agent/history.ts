import type { Turn } from "@/store/session-store";
import { lapsed, RETENTION_MS } from "./retention.ts";

/**
 * ── THE STRANGER'S CONVERSATIONS ──────────────────────────────
 * The server keeps conversations in memory only, so the stranger's
 * own browser is where they last: each one under its thread id, with
 * what was shown (the turns), what the agent needs to go on (its
 * messages) and what was said aloud. Each is kept seven days from its
 * first message, then dropped.
 */

export interface SpokenEntry {
  id: string;
  kind: "heard" | "voice";
  text: string;
  /** when it was said (ms since the epoch) */
  at: number;
}

export interface Conversation {
  /** the thread's id: the same one the agent runs under */
  id: string;
  createdAt: number;
  updatedAt: number;
  /** the first question asked */
  title: string;
  turns: Turn[];
  /** the text agent's messages, as AG-UI sends them */
  messages: unknown[];
  voice: SpokenEntry[];
}

export interface Saved {
  version: 1;
  /** the conversation in progress when the page was left */
  current: string | null;
  conversations: Conversation[];
}

/** how many conversations one browser keeps */
export const KEEP = 24;

/** the questions of a conversation: typed ones and spoken ones (not what the voice handed over) */
export const questions = (c: Pick<Conversation, "turns" | "voice">) =>
  c.turns.filter((t) => t.role === "visitor" && !t.voice).length + c.voice.filter((e) => e.kind === "heard").length;

/** the first question asked, typed or spoken */
export function titleOf(c: Pick<Conversation, "turns" | "voice">): string {
  const typed = c.turns.find((t) => t.role === "visitor" && !t.voice);
  const spoken = c.voice.find((e) => e.kind === "heard");
  const first = typed && spoken ? ((typed.at ?? 0) <= spoken.at ? typed.text : spoken.text) : (typed?.text ?? spoken?.text ?? "");
  const line = first.replace(/\s+/g, " ").trim();
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/** the conversations still kept at `now`: inside their seven days, the most recent `KEEP`, oldest first */
export function kept(list: readonly Conversation[], now: number): Conversation[] {
  return list
    .filter((c) => !lapsed(c.createdAt, now))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-KEEP);
}

/** how long until a conversation is forgotten */
export const remaining = (c: Pick<Conversation, "createdAt">, now: number) => Math.max(0, c.createdAt + RETENTION_MS - now);

const isConversation = (c: unknown): c is Conversation => {
  const o = c as Conversation;
  return !!o && typeof o.id === "string" && typeof o.createdAt === "number" && typeof o.updatedAt === "number" && Array.isArray(o.turns) && Array.isArray(o.messages) && Array.isArray(o.voice);
};

/** what the browser had saved, as far as it can still be read and is still kept */
export function parse(raw: string | null, now: number): Saved {
  const empty: Saved = { version: 1, current: null, conversations: [] };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw) as Partial<Saved>;
    if (data.version !== 1 || !Array.isArray(data.conversations)) return empty;
    const conversations = kept(data.conversations.filter(isConversation), now);
    const current = conversations.some((c) => c.id === data.current) ? (data.current as string) : null;
    return { version: 1, current, conversations };
  } catch {
    return empty;
  }
}

/** the conversation to come back to: the one in progress when the page was left, or the one touched last */
export function resumable(saved: Saved): Conversation | undefined {
  return saved.conversations.find((c) => c.id === saved.current) ?? [...saved.conversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/** the list with one conversation written into it; a conversation with no question yet is not kept */
export function written(list: readonly Conversation[], next: Omit<Conversation, "title" | "createdAt" | "updatedAt">, now: number): Conversation[] {
  const before = list.find((c) => c.id === next.id);
  if (!before && questions(next) === 0) return list as Conversation[];
  const mark = (c: Pick<Conversation, "turns" | "voice">) => `${c.turns.length}:${c.turns.at(-1)?.text.length ?? 0}:${c.voice.length}:${c.voice.at(-1)?.text.length ?? 0}`;
  const changed = !before || mark(before) !== mark(next);
  const conversation: Conversation = {
    ...next,
    title: titleOf(next),
    createdAt: before?.createdAt ?? now,
    updatedAt: changed ? now : before.updatedAt,
  };
  return kept([...list.filter((c) => c.id !== next.id), conversation], now);
}

const DAY = 24 * 60 * 60_000;

/** how long ago, in a few characters: "now", "12 min", "3 h", "2 d" */
export function ago(ms: number): string {
  if (ms < 60_000) return "now";
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)} min`;
  if (ms < DAY) return `${Math.floor(ms / (60 * 60_000))} h`;
  return `${Math.floor(ms / DAY)} d`;
}

/** a length of time still to run: "6 d 4 h", "3 h 12 min", "8 min" */
export function span(ms: number): string {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / (60 * 60_000));
  const m = Math.floor((ms % (60 * 60_000)) / 60_000);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${Math.max(1, m)} min`;
}
