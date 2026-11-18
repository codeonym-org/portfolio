import { create } from "zustand";

/**
 * ── THE INTERVIEW ─────────────────────────────────────────────
 * How the stranger asks (text or voice), how he answers (aloud or in
 * text only), and where the avatar's
 * face is on screen: the floating windows keep clear of it.
 */

export type InterviewMode = "text" | "audio";
/** how he answers: aloud (his words shown too), or in text only */
export type Replies = "voice" | "text";
export type SpaceLevel = "turns" | "time";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MODE_KEY = "interview-mode";
const REPLIES_KEY = "interview-replies";

function remember(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // a private window: the choice lasts the visit
  }
}

function savedReplies(): Replies {
  try {
    return window.localStorage.getItem(REPLIES_KEY) === "text" ? "text" : "voice";
  } catch {
    return "voice";
  }
}

function savedMode(): InterviewMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "audio" ? "audio" : "text";
  } catch {
    return "text";
  }
}

interface InterviewState {
  mode: InterviewMode;
  replies: Replies;
  /** the avatar's head and beard, in CSS pixels; null until the scene has framed it */
  face: Rect | null;
  /** the avatar has loaded */
  present: boolean;
  /** the book of diaries is open */
  transcript: boolean;
  /** where it opens: at the last page of this conversation's diary, or at the contents */
  level: SpaceLevel;
  /** open the book at this conversation, or close it */
  toggleTranscript: () => void;
  /** open it at the contents, or close it if that is how it was opened */
  toggleHistory: () => void;
  setLevel: (level: SpaceLevel) => void;
  setMode: (mode: InterviewMode) => void;
  setReplies: (replies: Replies) => void;
  set: (patch: Partial<Pick<InterviewState, "face" | "present">>) => void;
  /** read the saved choices, once on mount */
  restore: () => void;
}

export const useInterview = create<InterviewState>((set) => ({
  mode: "text",
  replies: "voice",
  face: null,
  present: false,
  transcript: false,
  level: "turns",
  toggleTranscript: () => set((s) => ({ transcript: !s.transcript, level: "turns" })),
  toggleHistory: () => set((s) => (s.transcript && s.level === "time" ? { transcript: false, level: "turns" } : { transcript: true, level: "time" })),
  setLevel: (level) => set({ level }),
  setMode: (mode) => {
    remember(MODE_KEY, mode);
    set({ mode });
  },
  setReplies: (replies) => {
    remember(REPLIES_KEY, replies);
    set({ replies });
  },
  set: (patch) => set(patch),
  restore: () => set({ mode: savedMode(), replies: savedReplies() }),
}));

/** the jaw, 0 shut … 1 open; forced open by `?mouth=1` to check the rig */
export const mouthLive = { open: 0, forced: null as number | null };
