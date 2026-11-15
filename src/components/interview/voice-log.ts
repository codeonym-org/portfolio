import { create } from "zustand";
import { useVoiceStore } from "@/components/agent/voice/voice-store";

/**
 * ── WHAT WAS SAID ALOUD ───────────────────────────────────────
 * The voice keeps only its current turn. This keeps every turn of
 * the visit: what it heard and what it answered, in order, for the
 * windows and for the transcript.
 */

export interface VoiceEntry {
  id: string;
  kind: "heard" | "voice";
  text: string;
}

const KEEP = 60;

export const useVoiceLog = create<{ log: VoiceEntry[] }>(() => ({ log: [] }));

function put(entry: VoiceEntry) {
  useVoiceLog.setState(({ log }) => {
    const i = log.findIndex((e) => e.id === entry.id);
    if (i === -1) return { log: [...log, entry].slice(-KEEP) };
    const next = log.slice();
    next[i] = entry;
    return { log: next };
  });
}

/** follow the voice for as long as the interview is open; returns how to stop */
export function followVoice() {
  let seq = 0;
  let heardId = "";
  let replyId = "";
  return useVoiceStore.subscribe((s, prev) => {
    if (s.heard !== prev.heard) {
      if (!s.heard) heardId = "";
      else put({ id: (heardId ||= `heard-${++seq}`), kind: "heard", text: s.heard });
    }
    if (s.reply !== prev.reply) {
      if (!s.reply) replyId = "";
      else put({ id: (replyId ||= `voice-${++seq}`), kind: "voice", text: s.reply });
    }
  });
}
