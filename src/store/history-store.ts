import { create } from "zustand";
import { kept, parse, resumable, written, type Conversation, type Saved, type SpokenEntry } from "@/agent/history";
import type { Turn } from "@/store/session-store";

/**
 * ── THE CONVERSATIONS KEPT IN THIS BROWSER ────────────────────
 * Every conversation with the replica is saved here, in
 * `localStorage`, under its thread id, for seven days from its first
 * message (`agent/history.ts`). `current` is the thread in progress:
 * the link (`components/agent/agent-bridge.tsx`) runs the agent under
 * it and writes what is said into it. Opening another conversation,
 * or a new one, only changes `current`; the link follows.
 */

const STORAGE_KEY = "codeonym-conversations-v1";
const WRITE_AFTER_MS = 400;

interface HistoryState {
  /** oldest first */
  conversations: Conversation[];
  /** the thread in progress; a new id until its first question is asked */
  current: string;
  loaded: boolean;
  /** read what the browser kept, once: the conversation left in progress becomes the current one */
  load: () => void;
  /** write the conversation in progress */
  record: (part: { turns: Turn[]; messages: unknown[] }) => void;
  /** write what was said aloud in the conversation in progress */
  recordVoice: (voice: SpokenEntry[]) => void;
  /** go to a conversation kept here */
  open: (id: string) => void;
  /** begin a new conversation */
  fresh: () => void;
  /** forget one conversation now */
  forget: (id: string) => void;
}

const newId = () => crypto.randomUUID();

let timer = 0;
function write() {
  window.clearTimeout(timer);
  timer = 0;
  const { conversations, current } = useHistory.getState();
  let list = kept(conversations, Date.now());
  // a full store: give up the oldest conversation, and try again
  for (;;) {
    const saved: Saved = { version: 1, current: list.some((c) => c.id === current) ? current : null, conversations: list };
    try {
      if (list.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      else window.localStorage.removeItem(STORAGE_KEY);
      return;
    } catch {
      if (!list.length) return;
      list = list.slice(1);
    }
  }
}
function writeSoon() {
  if (typeof window === "undefined" || timer) return;
  timer = window.setTimeout(write, WRITE_AFTER_MS);
}

export const useHistory = create<HistoryState>((set, get) => ({
  conversations: [],
  current: "",
  loaded: false,

  load: () => {
    if (get().loaded || typeof window === "undefined") return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // a private window: conversations last the visit
    }
    const saved = parse(raw, Date.now());
    set({ loaded: true, conversations: saved.conversations, current: resumable(saved)?.id ?? newId() });
    // what was past its time is cleared from the browser now
    writeSoon();
    // the page may be left before the next write is due
    window.addEventListener("pagehide", () => timer && write());
  },

  record: ({ turns, messages }) => {
    const { conversations, current, loaded } = get();
    if (!loaded || !current) return;
    const voice = conversations.find((c) => c.id === current)?.voice ?? [];
    const next = written(conversations, { id: current, turns, messages, voice }, Date.now());
    if (next === conversations) return;
    set({ conversations: next });
    writeSoon();
  },

  recordVoice: (voice) => {
    const { conversations, current, loaded } = get();
    if (!loaded || !current) return;
    const before = conversations.find((c) => c.id === current);
    const next = written(conversations, { id: current, turns: before?.turns ?? [], messages: before?.messages ?? [], voice }, Date.now());
    if (next === conversations) return;
    set({ conversations: next });
    writeSoon();
  },

  open: (id) => {
    if (id === get().current || !get().conversations.some((c) => c.id === id)) return;
    set({ current: id });
    writeSoon();
  },

  fresh: () => {
    // already a new one: nothing was asked in it yet
    if (!get().conversations.some((c) => c.id === get().current)) return;
    set({ current: newId() });
    writeSoon();
  },

  forget: (id) => {
    const { conversations, current } = get();
    set({ conversations: conversations.filter((c) => c.id !== id), current: id === current ? newId() : current });
    writeSoon();
  },
}));
