import { create } from "zustand";
import type { SpokenEntry } from "@/agent/history";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { useHistory } from "@/store/history-store";

/**
 * ── WHAT WAS SAID ALOUD ───────────────────────────────────────
 * The voice keeps only its current turn. This keeps every turn of
 * the conversation: what it heard and what it answered, in order and
 * with the time, for the windows and for the transcript. It is saved
 * with the conversation, and comes back with it.
 */

export type VoiceEntry = SpokenEntry;

const KEEP = 60;

export const useVoiceLog = create<{ log: VoiceEntry[] }>(() => ({ log: [] }));

/** follow the voice for as long as the interview is open; returns how to stop */
export function followVoice() {
  let seq = 0;
  let heardId = "";
  let replyId = "";
  // unique across visits: a conversation resumed later keeps the ids of what was said before
  const visit = Date.now().toString(36);

  const put = (id: string, kind: VoiceEntry["kind"], text: string) => {
    const { log } = useVoiceLog.getState();
    const i = log.findIndex((e) => e.id === id);
    const next = i === -1 ? [...log, { id, kind, text, at: Date.now() }].slice(-KEEP) : log.map((e, n) => (n === i ? { ...e, text } : e));
    useVoiceLog.setState({ log: next });
    useHistory.getState().recordVoice(next);
  };

  /** the log is the one of the conversation in progress */
  const restore = () => {
    const { conversations, current } = useHistory.getState();
    heardId = replyId = "";
    useVoiceLog.setState({ log: conversations.find((c) => c.id === current)?.voice ?? [] });
  };
  useHistory.getState().load();
  restore();

  const stopHistory = useHistory.subscribe((s, prev) => {
    if (s.current !== prev.current) restore();
  });
  const stopVoice = useVoiceStore.subscribe((s, prev) => {
    if (s.heard !== prev.heard) {
      if (!s.heard) heardId = "";
      else put((heardId ||= `heard-${visit}-${++seq}`), "heard", s.heard);
    }
    if (s.reply !== prev.reply) {
      if (!s.reply) replyId = "";
      else put((replyId ||= `voice-${visit}-${++seq}`), "voice", s.reply);
    }
  });
  return () => {
    stopHistory();
    stopVoice();
  };
}
