"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Keyboard, Mic, X } from "lucide-react";
import { Markdown } from "@/components/agent/markdown";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useInterview } from "./interview-store";
import type { InterviewTurn } from "./turns";
import { useTurns } from "./use-turns";

const copy = world.interview;
/** how far apart two turns hang, into the depth of the room, and upward */
const DEPTH = 340;
const RISE = 70;
const DRIFT = 110;

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const since = (ms: number) => `+${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

function TurnCard({ turn, n, start, front }: { turn: InterviewTurn; n: number; start: number; front: boolean }) {
  const Icon = turn.spoken ? Mic : Keyboard;
  return (
    <div className="tx-card px-5 pt-3.5 pb-4">
      <div className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] text-[oklch(0.86_0.1_215)] uppercase">
        <span className="tx-tag">T{String(n).padStart(2, "0")}</span>
        <span>{clock(turn.at)}</span>
        <span className="text-white/40">{since(turn.at - start)}</span>
        <Icon className="ml-auto size-3.5 text-white/50" />
      </div>
      <p className="air-label mb-1 text-[8px]">{turn.spoken ? copy.panes.heard : copy.panes.you}</p>
      <p className="mb-3 text-[15px] leading-snug text-white">{turn.you}</p>
      <p className="air-label mb-1 text-[8px] text-[oklch(0.8_0.14_300)]">{copy.panes.words}</p>
      <div className={cn("oracle text-[13.5px] text-white/85", front ? "max-h-[30dvh] overflow-y-auto overscroll-contain pr-1" : "line-clamp-3")}>{turn.him ? <Markdown text={turn.him} /> : "…"}</div>
      {turn.cards.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {turn.cards.map((c, i) => (
            <span key={i} className="rounded-full border border-[oklch(0.8_0.12_160/0.5)] px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-[oklch(0.86_0.12_160)] uppercase">
              {copy.panes.card} · {c.type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ── THE TRANSCRIPT: TIME AND SPACE ────────────────────────────
 * An overlay over the room, like a hologram: every turn of the
 * interview is a pane hanging in space. The one in front is the turn
 * you are reading; older turns hang behind it, each further back and
 * higher, drifting to one side then the other. The wheel, the arrow
 * keys, a swipe or the rail of time at the bottom move through them.
 */
export function Transcript() {
  const open = useInterview((s) => s.transcript);
  const toggle = useInterview((s) => s.toggleTranscript);
  const turns = useTurns();
  const [chosen, setChosen] = useState<number | null>(null);
  const wheel = useRef(0);
  const touch = useRef<number | null>(null);
  const last = turns.length - 1;
  /** the turn in front: the one chosen, or the latest */
  const focus = Math.min(chosen ?? last, last);

  const move = (by: number) => setChosen(Math.max(0, Math.min(last, focus + by)));
  const close = () => {
    play("close", { volume: 0.4 });
    setChosen(null);
    toggle();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (useInterview.getState().card) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const start = turns[0]?.at ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={copy.transcript}
          className="tx fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          onWheel={(e) => {
            // inside a pane that scrolls, the wheel reads it; elsewhere it moves through time
            if ((e.target as HTMLElement).closest("[data-scrolls]")) return;
            wheel.current += e.deltaY;
            if (Math.abs(wheel.current) < 60) return;
            move(wheel.current > 0 ? 1 : -1);
            wheel.current = 0;
          }}
          onTouchStart={(e) => (touch.current = e.touches[0].clientY)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dy = e.changedTouches[0].clientY - touch.current;
            touch.current = null;
            if (Math.abs(dy) > 50 && !(e.target as HTMLElement).closest("[data-scrolls]")) move(dy > 0 ? -1 : 1);
          }}
        >
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={close} tabIndex={-1} />
          <div className="tx-floor" aria-hidden />
          <div className="tx-scan" aria-hidden />

          <header className="pointer-events-none absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3">
            <span className="air-dot" style={{ ["--air-tint" as string]: "oklch(0.86 0.1 215)" }} />
            <p className="font-display text-[11px] tracking-[0.34em] text-[oklch(0.9_0.08_215)] [text-shadow:0_0_14px_oklch(0.8_0.12_215)]">{copy.transcript.toUpperCase()}</p>
            <p className="hidden font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase sm:block">{copy.transcriptHint}</p>
            <button type="button" aria-label="Close" onClick={close} className="tx-key pointer-events-auto ml-auto grid size-10 place-items-center rounded-full">
              <X className="size-4" />
            </button>
          </header>

          {/* space: the turns, the one in front and the older ones behind it */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ perspective: 1300, perspectiveOrigin: "50% 38%" }}>
            {turns.length === 0 && <p className="font-mono text-[11px] tracking-[0.25em] text-white/50 uppercase">{copy.transcriptEmpty}</p>}
            {turns.map((turn, i) => {
              const back = focus - i;
              const gone = back < 0;
              const side = i % 2 ? 1 : -1;
              return (
                <motion.div
                  key={turn.id}
                  data-scrolls={back === 0 ? "" : undefined}
                  className={cn("absolute w-[min(540px,calc(100vw-2rem))]", back === 0 ? "pointer-events-auto" : gone || back > 3 ? "pointer-events-none" : "pointer-events-auto cursor-pointer")}
                  style={{ zIndex: 100 - Math.abs(back), transformStyle: "preserve-3d" }}
                  initial={{ opacity: 0, z: -900, y: -140 }}
                  animate={{
                    z: gone ? 420 : -back * DEPTH,
                    y: gone ? 160 : -back * RISE - 20,
                    x: gone || back === 0 ? 0 : side * Math.min(back, 3) * DRIFT,
                    rotateY: gone || back === 0 ? 0 : -side * 9,
                    rotateX: back === 0 ? 0 : 4,
                    opacity: gone ? 0 : Math.max(0, 1 - back * 0.3),
                    filter: back > 0 ? `blur(${Math.min(back, 3) * 0.8}px)` : "blur(0px)",
                  }}
                  transition={{ type: "spring", stiffness: 170, damping: 24, mass: 0.9 }}
                  onClick={back > 0 ? () => setChosen(i) : undefined}
                >
                  <TurnCard turn={turn} n={i + 1} start={start} front={back === 0} />
                </motion.div>
              );
            })}
          </div>

          {/* time: one mark per turn */}
          {turns.length > 0 && (
            <footer className="pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-3 px-4">
              <button type="button" aria-label="Older" disabled={focus === 0} onClick={() => move(-1)} className="tx-key pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-30">
                <ChevronUp className="size-4" />
              </button>
              <div className="tx-rail pointer-events-auto flex max-w-[min(640px,70vw)] items-center gap-1 overflow-x-auto px-3 py-2">
                {turns.map((t, i) => (
                  <button key={t.id} type="button" aria-label={`T${i + 1}: ${t.you}`} aria-current={i === focus} title={t.you} onClick={() => setChosen(i)} className="group flex shrink-0 flex-col items-center gap-1 px-1.5">
                    <span className={cn("block h-3 w-px bg-[oklch(0.8_0.1_215/0.5)] transition-all", i === focus && "h-5 w-0.5 bg-[oklch(0.9_0.1_215)] shadow-[0_0_10px_oklch(0.85_0.12_215)]")} />
                    <span className={cn("font-mono text-[9px] tracking-wider transition-colors", i === focus ? "text-white" : "text-white/40 group-hover:text-white/80")}>{since(t.at - start).slice(1)}</span>
                  </button>
                ))}
              </div>
              <button type="button" aria-label="Newer" disabled={focus === last} onClick={() => move(1)} className="tx-key pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-30">
                <ChevronDown className="size-4" />
              </button>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
