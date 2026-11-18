"use client";

import { createElement } from "react";
import { create } from "zustand";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { owner } from "@/config/owner.config";
import { useHistory } from "@/store/history-store";
import { useSession } from "@/store/session-store";
import { describe, stepsFor } from "./activity";
import { cardShown, laidShown } from "./shown";
import { useTable } from "./table-store";
import { transcript, type ExchangeInput } from "./transcript";
import { currentTurns } from "./use-turns";
import { familyName } from "./vcard";

/**
 * ── TAKING THE TRANSCRIPT AWAY ────────────────────────────────
 * Gathers the interview as it stands (every question answered so
 * far, what each answer showed and the steps it took), lays it out
 * (`transcript.ts`), prints it (`transcript-pdf.tsx`, loaded only now:
 * the PDF engine is heavy) and hands the file to the browser. The
 * button in the top bar and the agent's `download_transcript` tool
 * both come here.
 */

export type MakingState = "idle" | "making" | "done" | "failed";

export const useTranscriptFile = create<{ state: MakingState }>(() => ({ state: "idle" }));

/** steps that belong to the run, not to the answer */
const UNTOLD = new Set(["download_transcript"]);

/** a question still being answered is left out: the transcript holds what was said */
function busy(): boolean {
  const phase = useVoiceStore.getState().phase;
  return useSession.getState().running || phase === "decoding" || phase === "thinking" || phase === "speaking";
}

function gather(): ExchangeInput[] {
  const turns = currentTurns();
  const kept = busy() ? turns.slice(0, -1) : turns;
  const trace = useSession.getState().trace;
  const laid = useTable.getState().laid;
  return kept.map((t, i) => {
    const next = turns[i + 1]?.at;
    const within = (at: number) => at >= t.at && (next === undefined || at < next);
    return {
      you: t.you,
      him: t.him,
      spoken: t.spoken,
      at: t.at,
      answeredAt: t.answeredAt,
      shown: [...t.cards.map(cardShown), ...laid.filter((l) => within(l.at)).map(laidShown)],
      did: stepsFor(trace, t.at, next)
        .filter((st) => st.status === "done" && !UNTOLD.has(st.name))
        .map(describe),
    };
  });
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

let making: Promise<string> | null = null;

/** make the PDF of the interview so far and download it; says what happened, for the agent */
export function downloadTranscript(): Promise<string> {
  making ??= make().finally(() => (making = null));
  return making;
}

async function make(): Promise<string> {
  const exchanges = gather().filter((e) => e.you.trim());
  if (!exchanges.length) return "Nothing to transcribe yet: no question has been answered in this interview.";
  const set = (state: MakingState) => useTranscriptFile.setState({ state });
  set("making");
  try {
    const t = transcript(exchanges, {
      id: useHistory.getState().current,
      name: `${owner.firstName} ${familyName(owner.name, owner.firstName)}`,
      now: Date.now(),
    });
    const [{ pdf }, { TranscriptDocument, registerFonts }] = await Promise.all([import("@react-pdf/renderer"), import("./transcript-pdf")]);
    const base = window.location.origin;
    registerFonts(base);
    const blob = await pdf(createElement(TranscriptDocument, { t, base }) as Parameters<typeof pdf>[0]).toBlob();
    save(blob, t.filename);
    set("done");
    window.setTimeout(() => useTranscriptFile.getState().state === "done" && set("idle"), 2600);
    return `Transcript downloaded as a PDF (${t.filename}): ${t.questions} ${t.questions === 1 ? "question" : "questions"}, ${t.started}–${t.ended}. The stranger has the file; say so in one short line.`;
  } catch (err) {
    console.error("[transcript]", err);
    set("failed");
    window.setTimeout(() => useTranscriptFile.getState().state === "failed" && set("idle"), 3200);
    return "The transcript could not be made this time. Say so plainly and suggest the PDF button in the top bar.";
  }
}
