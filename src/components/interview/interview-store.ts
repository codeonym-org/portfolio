import { create } from "zustand";

/**
 * ── THE INTERVIEW ─────────────────────────────────────────────
 * How the stranger answers (text or voice), and where the avatar's
 * face is on screen: the floating windows keep clear of it.
 */

export type InterviewMode = "text" | "audio";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MODE_KEY = "interview-mode";

function savedMode(): InterviewMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "audio" ? "audio" : "text";
  } catch {
    return "text";
  }
}

interface InterviewState {
  mode: InterviewMode;
  /** the avatar's head and beard, in CSS pixels; null until the scene has framed it */
  face: Rect | null;
  /** the avatar has loaded */
  present: boolean;
  setMode: (mode: InterviewMode) => void;
  set: (patch: Partial<Pick<InterviewState, "face" | "present">>) => void;
  /** read the saved mode, once on mount */
  restore: () => void;
}

export const useInterview = create<InterviewState>((set) => ({
  mode: "text",
  face: null,
  present: false,
  setMode: (mode) => {
    try {
      window.localStorage.setItem(MODE_KEY, mode);
    } catch {
      // a private window: the mode lasts the visit
    }
    set({ mode });
  },
  set: (patch) => set(patch),
  restore: () => set({ mode: savedMode() }),
}));

/** the jaw, 0 shut … 1 open; forced open by `?mouth=1` to check the rig */
export const mouthLive = { open: 0, forced: null as number | null };
