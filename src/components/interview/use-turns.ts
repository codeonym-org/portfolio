"use client";

import { create } from "zustand";
import { useSession } from "@/store/session-store";
import { buildTurns, type InterviewTurn } from "./turns";
import { useVoiceLog } from "./voice-log";

const useTurnList = create<{ turns: InterviewTurn[] }>(() => ({ turns: [] }));

/** keep the list of turns up to date for as long as the interview is open; returns how to stop */
export function followTurns() {
  const sync = () => useTurnList.setState({ turns: buildTurns(useSession.getState().turns, useVoiceLog.getState().log) });
  sync();
  const stopSession = useSession.subscribe((s, prev) => {
    if (s.turns !== prev.turns) sync();
  });
  const stopVoice = useVoiceLog.subscribe(sync);
  return () => {
    stopSession();
    stopVoice();
  };
}

/** every turn of the interview so far, oldest first */
export const useTurns = () => useTurnList((s) => s.turns);
