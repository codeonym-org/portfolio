"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { converse } from "@/agent/converse";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useSession, type Turn } from "@/store/session-store";
import { useInterview } from "./interview-store";
import { useVoiceLog, type VoiceEntry } from "./voice-log";

const copy = world.interview;
/** how many questions he is offered after the last answer */
const NEXT = 3;

/** one question, and what came of it */
export interface Exchange {
  id: string;
  you: string;
  him: string;
  spoken: boolean;
}

/** when each exchange was first seen: typed and spoken ones are kept in two places, this puts them in one order */
const seen = new Map<string, number>();
const order = (id: string) => seen.get(id) ?? seen.set(id, seen.size).get(id)!;

export function exchanges(turns: readonly Turn[], voice: readonly VoiceEntry[]): Exchange[] {
  const out: Exchange[] = [];
  for (const [i, t] of turns.entries()) {
    // what the voice handed over is in the voice's own log
    if (t.role !== "visitor" || t.voice) continue;
    const answer = turns[i + 1]?.role === "system" ? turns[i + 1].text : "";
    out.push({ id: t.id, you: t.text, him: answer, spoken: false });
  }
  for (const [i, e] of voice.entries()) {
    if (e.kind !== "heard") continue;
    const answer = voice[i + 1]?.kind === "voice" ? voice[i + 1].text : "";
    out.push({ id: e.id, you: e.text, him: answer, spoken: true });
  }
  return out.sort((a, b) => order(a.id) - order(b.id));
}

function Node({ kind, label, text, onClick }: { kind: "you" | "him" | "next"; label?: string; text: string; onClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const body = (
    <>
      {label && <span className="air-label mb-0.5 block text-[8px]">{label}</span>}
      <span className={cn("block text-[12.5px] leading-snug", kind === "next" ? "text-white/75" : "text-white/90", !open && kind !== "next" && "line-clamp-3")}>{text}</span>
    </>
  );
  return (
    <motion.button
      type="button"
      layout="position"
      initial={{ opacity: 0, scale: 0.6, x: -12 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      onClick={onClick ?? (() => setOpen((o) => !o))}
      data-kind={kind}
      className={cn("node block w-full text-left outline-none focus-visible:ring-1 focus-visible:ring-system", kind === "next" ? "px-3 py-1.5" : "px-3 py-2")}
    >
      {body}
    </motion.button>
  );
}

/** a child of the node above: an elbow from the parent's line into it */
function Branch({ children, last, tint }: { children: React.ReactNode; last?: boolean; tint: string }) {
  return (
    <div className="relative pl-7">
      <motion.span
        aria-hidden
        className="absolute top-0 left-2.5 h-5 w-4 rounded-bl-[10px] border-b border-l"
        style={{ borderColor: tint, transformOrigin: "0 0" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      />
      {!last && <span aria-hidden className="absolute top-0 bottom-0 left-2.5 border-l" style={{ borderColor: tint }} />}
      <div className="pt-1.5">{children}</div>
    </div>
  );
}

const TINT = { you: "oklch(0.78 0.13 232 / 0.55)", him: "oklch(0.74 0.17 300 / 0.55)", next: "rgb(255 255 255 / 0.25)" };

/**
 * ── THE TRANSCRIPT ────────────────────────────────────────────
 * A window hanging in the room (drag it by its top) that draws the
 * interview as a graph: every question is a node on the line of the
 * conversation, his answer hangs from it, and from the last answer
 * hang the questions he could be asked next (press one to ask it).
 */
export function Transcript() {
  const open = useInterview((s) => s.transcript);
  const toggle = useInterview((s) => s.toggleTranscript);
  const turns = useSession((s) => s.turns);
  const running = useSession((s) => s.running);
  const voice = useVoiceLog((s) => s.log);
  const drag = useDragControls();
  const scroller = useRef<HTMLDivElement>(null);

  const list = useMemo(() => exchanges(turns, voice), [turns, voice]);
  const next = useMemo(() => {
    const asked = new Set(list.map((e) => e.you.trim().toLowerCase()));
    return world.agent.suggestions.filter((s) => !asked.has(s.toLowerCase())).slice(0, NEXT);
  }, [list]);

  // the newest node stays in view
  const answer = list.at(-1)?.him;
  useEffect(() => {
    if (open) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [open, list.length, answer]);

  const ask = (text: string) => {
    if (running) return;
    play("confirm", { volume: 0.35 });
    void converse(text);
  };

  const suggestions = next.map((s, i) => (
    <Branch key={s} tint={TINT.next} last={i === next.length - 1}>
      <Node kind="next" text={s} onClick={() => ask(s)} />
    </Branch>
  ));

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          aria-label={copy.transcript}
          drag
          dragControls={drag}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.08}
          initial={{ opacity: 0, scale: 0.6, x: 60, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.7, x: 60, filter: "blur(8px)", transition: { duration: 0.22 } }}
          transition={{ type: "spring", stiffness: 210, damping: 22 }}
          className="fixed top-[76px] right-3 z-30 w-[min(400px,calc(100vw-1.5rem))] origin-top-right"
        >
          <div className="air air-float flex max-h-[min(62dvh,600px)] flex-col" style={{ ["--air-tint" as string]: "oklch(0.74 0.17 300)", ["--float-s" as string]: "9s", background: "linear-gradient(160deg, oklch(0.2 0.035 285 / 0.93), oklch(0.12 0.03 280 / 0.96))" }}>
            <div className="flex cursor-grab touch-none items-center gap-2 px-4 pt-3 pb-2 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <span className="air-dot" />
              <p className="air-label flex-1">{copy.transcript}</p>
              <p className="air-label text-white/30">{list.length}</p>
              <button type="button" aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={toggle} className="-mr-1 grid size-6 place-items-center rounded-md text-white/45 transition hover:bg-white/10 hover:text-white">
                <X className="size-3.5" />
              </button>
            </div>
            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {/* the root: where the interview starts */}
              <div className="flex items-center gap-2 pb-1">
                <span className="size-2.5 rounded-full border border-white/50" />
                <span className="air-label">{copy.transcriptStart}</span>
              </div>
              {list.length === 0 && (
                <>
                  <p className="pb-1 pl-7 text-[12.5px] text-white/55">{copy.transcriptEmpty}</p>
                  {suggestions}
                </>
              )}
              {list.map((e, i) => {
                const lastOne = i === list.length - 1;
                return (
                  <Branch key={e.id} tint={TINT.you} last={lastOne}>
                    <Node kind="you" label={e.spoken ? copy.panes.heard : copy.panes.you} text={e.you} />
                    <Branch tint={TINT.him} last>
                      {e.him ? (
                        <Node kind="him" label={copy.panes.words} text={e.him} />
                      ) : (
                        <p className="node animate-pulse px-3 py-2 text-[12px] text-white/50" data-kind="him">
                          …
                        </p>
                      )}
                      {lastOne && e.him && !running && suggestions}
                    </Branch>
                  </Branch>
                );
              })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
