import { create } from "zustand";
import type { TaskRecord } from "@/agent/voice/task-queue";

/**
 * ── VOICE STATE ───────────────────────────────────────────────
 * What the HUD shows about the voice link. The orchestrator
 * (`voice-link.tsx`) is the only writer; the HUD button and overlay
 * read it. Audio levels live in `voiceLive` (mutated per frame, never
 * React state).
 */

export type VoicePhase = "idle" | "listening" | "decoding" | "thinking" | "speaking";

interface VoiceState {
  /** the orchestrator is mounted and the browser can record */
  available: boolean;
  phase: VoicePhase;
  /** what the visitor last said (transcript) */
  heard: string;
  /** what the System is saying now (streams in) */
  reply: string;
  tasks: readonly TaskRecord[];
  notice: string | null;
  /** his replies may be spoken; false: text only (the interview's switch) */
  spoken: boolean;
  /** replies to typed questions are spoken too (the interview), not only replies to spoken ones */
  speakTyped: boolean;
  /** what the browser said about sound on this tab, the last time he was about to speak */
  sound: "allowed" | "blocked" | null;
  set: (patch: Partial<Omit<VoiceState, "set">>) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  available: false,
  phase: "idle",
  heard: "",
  reply: "",
  tasks: [],
  notice: null,
  spoken: true,
  speakTyped: false,
  sound: null,
  set: (patch) => set(patch),
}));

/** 0..1 loudness of whoever is talking — mic while listening, the System while speaking */
export const voiceLive = { level: 0 };

/** hold-to-talk entry points, registered by the orchestrator; `unlock` is called inside any press or key so later replies may play */
export const voiceControl: { press: () => void; release: () => void; unlock: () => void; hush: () => void } = {
  press: () => {},
  release: () => {},
  unlock: () => {},
  hush: () => {},
};
