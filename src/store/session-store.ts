import { create } from "zustand";
import type { CaseFile } from "@/record/case-file";

/**
 * ── THE SESSION ───────────────────────────────────────────────
 * The conversation and the run trace, as the interface shows them.
 * Two brains can write here: the live agent (through its AG-UI
 * messages, see `components/agent/agent-bridge.tsx`) and the local
 * index (`agent/local-brain.ts`) that answers when the link is down.
 * The interface never knows which one spoke.
 */

export type Card =
  | { type: "contact"; links?: string[] }
  | { type: "skills"; ids: string[]; title?: string }
  | { type: "case"; file: CaseFile };

export interface Turn {
  id: string;
  role: "visitor" | "system";
  text: string;
  cards?: Card[];
  /** spoken, or handed over by the voice */
  voice?: boolean;
}

export interface TraceStep {
  id: string;
  /** the real tool name, e.g. `open_sector` */
  name: string;
  /** its arguments, compact */
  args: string;
  status: "running" | "done" | "failed";
  startedAt: number;
  ms?: number;
  /** which brain ran it */
  source: "agent" | "local" | "you";
}

type Sender = (text: string) => void | Promise<void>;

interface SessionState {
  turns: Turn[];
  running: boolean;
  /** null until the first attempt; false once the link has failed */
  online: boolean | null;
  notice: string | null;
  /** who the visitor is talking to right now: typed turns, or the voice's captions */
  mode: "text" | "voice";
  trace: TraceStep[];
  /** the live agent's send, registered once its link is up */
  agentSend: Sender | null;
  agentStop: (() => void) | null;

  set: (patch: Partial<Pick<SessionState, "turns" | "running" | "online" | "notice" | "mode" | "agentSend" | "agentStop">>) => void;
  /** add turns, or replace the ones already there (matched by id) — order of first appearance is kept */
  upsertTurns: (turns: Turn[]) => void;
  /** start or update a step; steps are keyed by id */
  step: (step: Partial<TraceStep> & Pick<TraceStep, "id">) => void;
}

const MAX_TRACE = 40;

export const useSession = create<SessionState>((set) => ({
  turns: [],
  running: false,
  online: null,
  notice: null,
  mode: "text",
  trace: [],
  agentSend: null,
  agentStop: null,

  set: (patch) => set(patch),
  upsertTurns: (incoming) =>
    set((s) => {
      const turns = s.turns.slice();
      let changed = false;
      for (const turn of incoming) {
        const i = turns.findIndex((t) => t.id === turn.id);
        if (i === -1) turns.push(turn);
        else if (turns[i].text === turn.text && (turns[i].cards?.length ?? 0) === (turn.cards?.length ?? 0)) continue;
        else turns[i] = turn;
        changed = true;
      }
      return changed ? { turns } : s;
    }),
  step: (step) =>
    set((s) => {
      const i = s.trace.findIndex((t) => t.id === step.id);
      if (i === -1) {
        const fresh: TraceStep = { name: "", args: "", status: "running", startedAt: Date.now(), source: "agent", ...step };
        return { trace: [...s.trace, fresh].slice(-MAX_TRACE) };
      }
      const prev = s.trace[i];
      // a step that has settled never goes back to running
      if (prev.status !== "running" && (!step.status || step.status === "running")) return s;
      const next = { ...prev, ...step };
      if (next.status !== "running" && next.ms === undefined) next.ms = Date.now() - prev.startedAt;
      const trace = s.trace.slice();
      trace[i] = next;
      return { trace };
    }),
}));

/** `{"sector":"projects"}` → `sector: "projects"` — short enough for one line of the trace */
export function compactArgs(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  return Object.entries(args as Record<string, unknown>)
    .map(([k, v]) => {
      const text = Array.isArray(v) ? `[${v.length}]` : typeof v === "string" ? JSON.stringify(v.length > 28 ? `${v.slice(0, 27)}…` : v) : JSON.stringify(v);
      return `${k}: ${text}`;
    })
    .join(", ");
}
