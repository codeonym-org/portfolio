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
    <>
      <span className="hud-sep !hidden sm:!block" aria-hidden />
      <button
        type="button"
        aria-label={said(state)}
        title={none ? copy.empty : said(state)}
        aria-busy={state === "making"}
        aria-disabled={none}
        aria-pressed={state === "making" || state === "done"}
        onClick={take}
        className="hud-btn !hidden sm:!inline-flex"
        style={{ ["--tone" as string]: state === "failed" ? "oklch(0.72 0.18 30)" : "oklch(0.86 0.12 85)" }}
      >
        <StateIcon state={state} />
        <span className="hud-label hidden xl:inline">{copy.open}</span>
      </button>
    </>
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

/**
 * at the end of the conversation: take it away. The file itself, small: a
 * page with the cover's dark band and its lines, beside what it holds;
 * the whole card is the button.
 */
export function TranscriptKeep({ count }: { count: number }) {
  const state = useTranscriptFile((s) => s.state);
  return (
    <button type="button" className="talk-keep" onClick={take} aria-busy={state === "making"} aria-label={said(state)} data-state={state}>
      <span className="talk-keep__page" aria-hidden>
        <span className="talk-keep__band">
          <span />
          <span />
        </span>
        <span className="talk-keep__lines">
          <span />
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="talk-keep__title">{copy.keep}</span>
        <span className="talk-keep__sub">{state === "idle" ? copy.keepSub(count) : said(state)}</span>
      </span>
      <span className="talk-keep__go" aria-hidden>
        <StateIcon state={state} className="size-4" />
      </span>
    </button>
  );
}
