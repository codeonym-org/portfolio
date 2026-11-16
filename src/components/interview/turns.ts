import type { Card, Turn as SessionTurn } from "@/store/session-store";
import type { SpokenEntry as VoiceEntry } from "@/agent/history";

/**
 * ── THE TURNS OF THE INTERVIEW ────────────────────────────────
 * One turn is one question and everything that came of it: his
 * words, and what he showed. Typed turns live in the session, spoken
 * ones in the voice's log; this makes one list of them, in the order
 * they happened (each carries the time it was first seen).
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

export function buildTurns(session: readonly SessionTurn[], voice: readonly VoiceEntry[]): InterviewTurn[] {
  const spoken: InterviewTurn[] = [];
  for (const [i, e] of voice.entries()) {
    if (e.kind !== "heard") continue;
    const answer = voice[i + 1]?.kind === "voice" ? voice[i + 1].text : "";
    spoken.push({ id: e.id, you: e.text, him: answer, cards: [], spoken: true, at: e.at });
  }
  const out = spoken.slice();

  for (const [i, t] of session.entries()) {
    if (t.role !== "visitor") continue;
    const at = t.at ?? 0;
    const answer = session[i + 1]?.role === "system" ? session[i + 1] : undefined;
    const cards = (answer?.cards ?? []).filter((c) => c.type === "skills" || c.type === "map");
    if (!t.voice) {
      out.push({ id: t.id, you: t.text, him: answer?.text ?? "", cards, spoken: false, at });
      continue;
    }
    // handed over by the voice: the voice speaks the answer, what was shown belongs to the spoken turn of that moment
    if (!cards.length) continue;
    const owner = spoken.filter((s) => s.at <= at).at(-1) ?? spoken.at(-1);
    owner?.cards.push(...cards);
  }
  return out.sort((a, b) => a.at - b.at);
}

/** what he could be asked next: the suggestions not asked yet */
export function nextQuestions(turns: readonly InterviewTurn[], suggestions: readonly string[], count: number): string[] {
  const asked = new Set(turns.map((t) => t.you.trim().toLowerCase()));
  return suggestions.filter((s) => !asked.has(s.toLowerCase())).slice(0, count);
}
