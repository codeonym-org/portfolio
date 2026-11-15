import type { Card, Turn as SessionTurn } from "@/store/session-store";
import type { VoiceEntry } from "./voice-log";

/**
 * ── THE TURNS OF THE INTERVIEW ────────────────────────────────
 * One turn is one question and everything that came of it: his
 * words, and what he showed. Typed turns live in the session, spoken
 * ones in the voice's log; this makes one list of them, in the order
 * they happened.
 */

export interface InterviewTurn {
  id: string;
  you: string;
  him: string;
  cards: Card[];
  spoken: boolean;
  /** when the question was asked (ms since the epoch) */
  at: number;
}

/** remembers what is only known the first time something is seen: when a turn began, and which spoken turn a hand-over belongs to */
export interface TurnMemory {
  at: Map<string, number>;
  owner: Map<string, string>;
}

export const newMemory = (): TurnMemory => ({ at: new Map(), owner: new Map() });

export function buildTurns(session: readonly SessionTurn[], voice: readonly VoiceEntry[], memory: TurnMemory, now: number): InterviewTurn[] {
  const out: InterviewTurn[] = [];
  const stamp = (id: string) => memory.at.get(id) ?? memory.at.set(id, now + memory.at.size * 1e-3).get(id)!;

  for (const [i, e] of voice.entries()) {
    if (e.kind !== "heard") continue;
    const answer = voice[i + 1]?.kind === "voice" ? voice[i + 1].text : "";
    out.push({ id: e.id, you: e.text, him: answer, cards: [], spoken: true, at: stamp(e.id) });
  }
  const lastSpoken = out.at(-1);

  for (const [i, t] of session.entries()) {
    if (t.role !== "visitor") continue;
    const answer = session[i + 1]?.role === "system" ? session[i + 1] : undefined;
    const cards = (answer?.cards ?? []).filter((c) => c.type !== "case");
    if (!t.voice) {
      out.push({ id: t.id, you: t.text, him: answer?.text ?? "", cards, spoken: false, at: stamp(t.id) });
      continue;
    }
    // handed over by the voice: the voice speaks the answer, what was shown belongs to the spoken turn of that moment
    if (!cards.length || !lastSpoken) continue;
    const owner = memory.owner.get(t.id) ?? memory.owner.set(t.id, lastSpoken.id).get(t.id)!;
    out.find((o) => o.id === owner)?.cards.push(...cards);
  }
  return out.sort((a, b) => a.at - b.at);
}

/** what he could be asked next: the suggestions not asked yet */
export function nextQuestions(turns: readonly InterviewTurn[], suggestions: readonly string[], count: number): string[] {
  const asked = new Set(turns.map((t) => t.you.trim().toLowerCase()));
  return suggestions.filter((s) => !asked.has(s.toLowerCase())).slice(0, count);
}
