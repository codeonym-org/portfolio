"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, IdCard, Keyboard, Mic, NotebookPen, Volume2, VolumeX } from "lucide-react";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { useInterview, type InterviewMode } from "./interview-store";

const copy = world.interview;
const MODES: { id: InterviewMode; icon: typeof Mic }[] = [
  { id: "text", icon: Keyboard },
  { id: "audio", icon: Mic },
];

/**
 * ── THE TOP OF THE ROOM ───────────────────────────────────────
 * Always there: the way out on the left, with how he answers beside
 * it (aloud, or text only; a dot when the tab may not play sound), how
 * the stranger asks in the middle (TEXT / AUDIO, a thumb that slides
 * to the side chosen), and his business card, the history and the
 * transcript on the right.
 */
function RepliesSwitch() {
  const replies = useInterview((s) => s.replies);
  const setReplies = useInterview((s) => s.setReplies);
  const blocked = useVoiceStore((s) => s.sound === "blocked");
  const spoken = replies === "voice";
  const Icon = spoken ? Volume2 : VolumeX;
  const title = spoken && blocked ? copy.replies.blocked : copy.replies.label;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={spoken}
      aria-label={copy.replies.label}
      title={title}
      onClick={() => {
        play("click", { volume: 0.4 });
        setReplies(spoken ? "text" : "voice");
      }}
      className={cn("air pointer-events-auto relative flex h-11 items-center gap-2 !rounded-full px-3.5 transition lg:px-4", spoken ? "text-white" : "text-white/55 hover:text-white")}
      style={{ ["--air-tint" as string]: spoken ? "oklch(0.78 0.15 190)" : "oklch(0.6 0.03 260)" }}
    >
      <motion.span key={replies} initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>
        <Icon className="size-4" />
      </motion.span>
      <span className="hidden font-display text-[10px] tracking-[0.3em] lg:inline">{(spoken ? copy.replies.voice : copy.replies.text).toUpperCase()}</span>
      {spoken && blocked && <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgb(251_191_36/0.8)]" />}
    </button>
  );
}

export function TopBar() {
  const mode = useInterview((s) => s.mode);
  const setMode = useInterview((s) => s.setMode);
  const transcript = useInterview((s) => s.transcript);
  const toggleTranscript = useInterview((s) => s.toggleTranscript);
  const toggleHistory = useInterview((s) => s.toggleHistory);
  const level = useInterview((s) => s.level);
  const card = useWorldStore((s) => s.cardOpen);

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
      <div className="pointer-events-none flex items-center gap-2">
      <Link
        href="/"
        aria-label={copy.exitLabel}
        title={copy.exitLabel}
        onClick={() => play("close", { volume: 0.4 })}
        className="air group pointer-events-auto flex h-11 items-center gap-2 !rounded-full px-3.5 text-white/75 transition hover:text-white sm:px-4"
        style={{ ["--air-tint" as string]: "oklch(0.7 0.19 40)" }}
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden font-display text-[10px] tracking-[0.3em] xl:inline">{copy.exit.toUpperCase()}</span>
      </Link>
      <RepliesSwitch />
      </div>

      <div role="radiogroup" aria-label={copy.switchLabel} className="air pointer-events-auto absolute left-1/2 flex h-11 -translate-x-1/2 items-center !rounded-full p-1">
        {MODES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            aria-label={copy.modes[id]}
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
            <span className="relative hidden min-[480px]:inline">{copy.modes[id]}</span>
          </button>
        ))}
      </div>

      <div className="pointer-events-none flex items-center gap-2">
        <button
          type="button"
          aria-pressed={card}
          aria-label={copy.card.label}
          title={copy.card.label}
          onClick={() => {
            play("click", { volume: 0.4 });
            useWorldStore.getState().setCardOpen(!card);
          }}
          className="air pointer-events-auto flex h-11 items-center gap-2 !rounded-full px-3.5 text-white/75 transition hover:text-white lg:px-4"
          style={{ ["--air-tint" as string]: "oklch(0.8 0.14 160)" }}
        >
          <IdCard className="size-4" />
          <span className="hidden font-display text-[10px] tracking-[0.3em] lg:inline">{copy.card.open.toUpperCase()}</span>
        </button>
        <button
          type="button"
          aria-pressed={transcript && level === "time"}
          aria-label={copy.diary.label}
          title={copy.diary.label}
          onClick={() => {
            play(transcript && level === "time" ? "close" : "click", { volume: 0.4 });
            toggleHistory();
          }}
          className="air pointer-events-auto hidden h-11 items-center gap-2 !rounded-full px-3.5 text-white/75 transition hover:text-white sm:flex lg:px-4"
          style={{ ["--air-tint" as string]: "oklch(0.86 0.1 215)" }}
        >
          <BookOpen className="size-4" />
          <span className="hidden font-display text-[10px] tracking-[0.3em] xl:inline">{copy.diary.history.toUpperCase()}</span>
        </button>
        <button
          type="button"
          aria-pressed={transcript}
          aria-label={copy.transcript}
          title={copy.transcript}
          onClick={() => {
            play(transcript ? "close" : "click", { volume: 0.4 });
            toggleTranscript();
          }}
          className={cn("air pointer-events-auto flex h-11 items-center gap-2 !rounded-full px-3.5 transition lg:px-4", transcript ? "text-white" : "text-white/75 hover:text-white")}
          style={{ ["--air-tint" as string]: "oklch(0.74 0.17 300)" }}
        >
          <NotebookPen className={cn("size-4 transition-transform", transcript && "-rotate-12")} />
          <span className="hidden font-display text-[10px] tracking-[0.3em] lg:inline">{copy.transcript.toUpperCase()}</span>
        </button>
      </div>
    </motion.nav>
  );
}
