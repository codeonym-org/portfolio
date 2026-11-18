import { create } from "zustand";
import { kept, parse, resumable, written, type Conversation, type Saved, type SpokenEntry } from "@/agent/history";
import type { Turn } from "@/store/session-store";

/**
 * ── THE CONVERSATIONS KEPT IN THIS BROWSER ────────────────────
 * Every interview is saved here, in `localStorage`,
 * under its thread id, for seven days from its first message
 * (`agent/history.ts`). `current` is the thread in progress: the link
 * (`components/agent/agent-bridge.tsx`) runs the agent under it and
 * writes what is said into it. Opening another conversation, or a
 * new one, only changes `current`; the link follows.
 *
 * The home page talks in a thread of its own (`room: "home"`), held in
 * memory and never saved: a conversation there lasts the visit. Only
 * the interview is kept. Going from one to the other changes
 * `current`, and each finds its own thread where it was left.
 */

const STORAGE_KEY = "codeonym-conversations-v1";
const WRITE_AFTER_MS = 400;

export type Room = "home" | "interview";

/** the home page's conversation: what was said, for the visit only */
export interface Passing {
  id: string;
  turns: Turn[];
  messages: unknown[];
}

interface HistoryState {
  /** the interviews kept, oldest first */
  conversations: Conversation[];
  /** the thread in progress (the home page's, or the interview's); a new id until its first question is asked */
  current: string;
  /** where the stranger is talking */
  room: Room;
  /** the interview's thread, kept while the stranger is on the home page */
  interview: string;
  /** the home page's conversation, never saved */
  passing: Passing;
  loaded: boolean;
  /** the stranger came into a room: the thread in progress becomes that room's */
  enter: (room: Room) => void;
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
  const { conversations, room, current: now, interview } = useHistory.getState();
  const current = room === "interview" ? now : interview;
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

const roomOf = (): Room => (typeof window !== "undefined" && window.location.pathname.startsWith("/interview") ? "interview" : "home");

export const useHistory = create<HistoryState>((set, get) => ({
  conversations: [],
  current: "",
  room: "home",
  interview: "",
  passing: { id: "", turns: [], messages: [] },
  loaded: false,

  enter: (room) => {
    get().load();
    const s = get();
    if (s.room === room) return;
    if (room === "home") set({ room, interview: s.current, current: s.passing.id });
    else set({ room, current: s.interview });
  },

  load: () => {
    if (get().loaded || typeof window === "undefined") return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // a private window: conversations last the visit
    }
    const saved = parse(raw, Date.now());
    const interview = resumable(saved)?.id ?? newId();
    const passing = { id: newId(), turns: [], messages: [] };
    const room = roomOf();
    set({ loaded: true, conversations: saved.conversations, room, interview, passing, current: room === "interview" ? interview : passing.id });
    // what was past its time is cleared from the browser now
    writeSoon();
    // the page may be left before the next write is due
    window.addEventListener("pagehide", () => timer && write());
  },

  record: ({ turns, messages }) => {
    const { conversations, current, loaded, room } = get();
    if (!loaded || !current) return;
    if (room === "home") return set({ passing: { id: current, turns, messages } });
    const voice = conversations.find((c) => c.id === current)?.voice ?? [];
    const next = written(conversations, { id: current, turns, messages, voice }, Date.now());
    if (next === conversations) return;
    set({ conversations: next });
    writeSoon();
  },

  recordVoice: (voice) => {
    const { conversations, current, loaded, room } = get();
    if (!loaded || !current || room === "home") return;
    const before = conversations.find((c) => c.id === current);
    const next = written(conversations, { id: current, turns: before?.turns ?? [], messages: before?.messages ?? [], voice }, Date.now());
    if (next === conversations) return;
    set({ conversations: next });
    writeSoon();
  },

  open: (id) => {
    if (get().room === "home") return set({ interview: id });
    if (id === get().current || !get().conversations.some((c) => c.id === id)) return;
    set({ current: id });
    writeSoon();
  },

  fresh: () => {
    if (get().room === "home") {
      const passing = { id: newId(), turns: [], messages: [] };
      return set({ passing, current: passing.id });
    }
    // already a new one: nothing was asked in it yet
    if (!get().conversations.some((c) => c.id === get().current)) return;
    set({ current: newId() });
    writeSoon();
  },

  forget: (id) => {
    const { conversations, current, interview, room } = get();
    const rest = conversations.filter((c) => c.id !== id);
    if (room === "home") set({ conversations: rest, interview: id === interview ? newId() : interview });
    else set({ conversations: rest, current: id === current ? newId() : current });
    writeSoon();
  },
}));
