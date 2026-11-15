"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Keyboard, Mic, Waypoints } from "lucide-react";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useInterview, type InterviewMode } from "./interview-store";

const copy = world.interview;
const MODES: { id: InterviewMode; icon: typeof Mic }[] = [
  { id: "text", icon: Keyboard },
  { id: "audio", icon: Mic },
];

/**
 * ── THE TOP OF THE ROOM ───────────────────────────────────────
 * Always there: the way out on the left, the TEXT / AUDIO switch in
 * the middle (a thumb that slides to the side chosen), and the
 * transcript on the right.
 */
export function TopBar() {
  const mode = useInterview((s) => s.mode);
  const setMode = useInterview((s) => s.setMode);
  const transcript = useInterview((s) => s.transcript);
  const toggleTranscript = useInterview((s) => s.toggleTranscript);

  const choose = (next: InterviewMode) => {
    if (next === mode) return;
    play("click", { volume: 0.45 });
    setMode(next);
  };

  return (
    <motion.nav
      aria-label={copy.title}
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.2 }}
      className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center justify-between gap-2"
    >
      <Link
        href="/"
        aria-label={copy.exitLabel}
        title={copy.exitLabel}
        onClick={() => play("close", { volume: 0.4 })}
        className="air group pointer-events-auto flex h-11 items-center gap-2 !rounded-full px-3.5 text-white/75 transition hover:text-white sm:px-4"
        style={{ ["--air-tint" as string]: "oklch(0.7 0.19 40)" }}
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden font-display text-[10px] tracking-[0.3em] sm:inline">{copy.exit.toUpperCase()}</span>
      </Link>

      <div role="radiogroup" aria-label={copy.switchLabel} className="air pointer-events-auto absolute left-1/2 flex h-11 -translate-x-1/2 items-center !rounded-full p-1">
        {MODES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() => choose(id)}
            className={cn(
              "relative flex h-full items-center gap-2 rounded-full px-3.5 font-display text-[10px] tracking-[0.3em] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-system sm:px-5",
              mode === id ? "text-white" : "text-white/45 hover:text-white/80",
            )}
          >
            {mode === id && (
              <motion.span
                layoutId="mode-thumb"
                className="absolute inset-0 rounded-full bg-gradient-to-br from-[oklch(0.62_0.2_295/0.85)] to-[oklch(0.58_0.16_245/0.85)] shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_22px_oklch(0.62_0.22_295/0.55)]"
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              />
            )}
            <motion.span className="relative" animate={{ rotate: mode === id ? [0, -14, 10, 0] : 0, scale: mode === id ? 1.1 : 1 }} transition={{ duration: 0.45 }}>
              <Icon className="size-3.5" />
            </motion.span>
            <span className="relative">{copy.modes[id]}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-pressed={transcript}
        aria-label={copy.transcript}
        title={copy.transcript}
        onClick={() => {
          play(transcript ? "close" : "click", { volume: 0.4 });
          toggleTranscript();
        }}
        className={cn("air pointer-events-auto flex h-11 items-center gap-2 !rounded-full px-3.5 transition sm:px-4", transcript ? "text-white" : "text-white/75 hover:text-white")}
        style={{ ["--air-tint" as string]: "oklch(0.74 0.17 300)" }}
      >
        <Waypoints className={cn("size-4 transition-transform", transcript && "rotate-90")} />
        <span className="hidden font-display text-[10px] tracking-[0.3em] sm:inline">{copy.transcript.toUpperCase()}</span>
      </button>
    </motion.nav>
  );
}
