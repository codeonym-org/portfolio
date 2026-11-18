"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, FileDown, LoaderCircle, TriangleAlert } from "lucide-react";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session-store";
import { downloadTranscript, useTranscriptFile, type MakingState } from "./transcript-download";
import { useTurns } from "./use-turns";

const copy = world.interview.pdf;

const ICON: Record<MakingState, typeof FileDown> = { idle: FileDown, making: LoaderCircle, done: Check, failed: TriangleAlert };

function take() {
  play("click", { volume: 0.4 });
  void downloadTranscript().then((said) => {
    if (said.startsWith("Nothing")) useSession.getState().set({ notice: copy.empty });
  });
}

function StateIcon({ state, className }: { state: MakingState; className?: string }) {
  const Icon = ICON[state];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={state} className="inline-flex" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.16 }}>
        <Icon className={cn(className, state === "making" && "animate-spin")} />
      </motion.span>
    </AnimatePresence>
  );
}

const said = (state: MakingState) => (state === "making" ? copy.making : state === "done" ? copy.done : state === "failed" ? copy.failed : copy.label);

/** in the top bar: the transcript as a PDF, at any moment of the interview */
export function TranscriptBarButton() {
  const state = useTranscriptFile((s) => s.state);
  const none = useTurns().length === 0;
  return (
    <button
      type="button"
      aria-label={said(state)}
      title={none ? copy.empty : said(state)}
      aria-busy={state === "making"}
      aria-disabled={none}
      onClick={take}
      className={cn(
        // only where the bar has room beside the mode switch; elsewhere the conversation panel carries it
        "air pointer-events-auto hidden h-11 items-center gap-2 !rounded-full px-3.5 transition xl:flex 2xl:px-4",
        none ? "text-white/35" : state === "idle" ? "text-white/75 hover:text-white" : "text-white",
      )}
      style={{ ["--air-tint" as string]: state === "failed" ? "oklch(0.72 0.18 30)" : "oklch(0.82 0.13 85)" }}
    >
      <StateIcon state={state} className="size-4" />
      <span className="hidden font-display text-[10px] tracking-[0.3em] 2xl:inline">{copy.open}</span>
    </button>
  );
}

/** in the conversation's header: always at hand, on a phone too */
export function TranscriptIconButton() {
  const state = useTranscriptFile((s) => s.state);
  const none = useTurns().length === 0;
  if (none) return null;
  return (
    <button type="button" className="talk-icon" title={said(state)} aria-label={said(state)} aria-busy={state === "making"} onClick={take}>
      <StateIcon state={state} className="size-4" />
    </button>
  );
}

/** at the end of the conversation: take it away */
export function TranscriptKeep({ count }: { count: number }) {
  const state = useTranscriptFile((s) => s.state);
  return (
    <div className="talk-keep">
      <span className="talk-keep__doc" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <div className="min-w-0 flex-1">
        <p className="talk-keep__title">{copy.keep}</p>
        <p className="talk-keep__sub">{copy.keepSub(count)}</p>
      </div>
      <button type="button" className="talk-btn talk-btn--go talk-keep__go" onClick={take} aria-busy={state === "making"} aria-label={said(state)}>
        <StateIcon state={state} className="size-3.5" />
        <span>{state === "idle" ? copy.action : state === "making" ? copy.making : state === "done" ? copy.done : copy.failed}</span>
      </button>
    </div>
  );
}
