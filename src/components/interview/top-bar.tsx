"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, IdCard, Keyboard, Mic, NotebookPen, Volume2, VolumeX } from "lucide-react";
import { GithubMark } from "@/components/system/brand-marks";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";
import { useInterview, type InterviewMode } from "./interview-store";
import { useTable } from "./table-store";
import { TranscriptBarButton } from "./transcript-button";

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
 * transcript on the right, and the transcript to take away as a PDF.
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
      className="hud-btn"
      style={{ ["--tone" as string]: "oklch(0.84 0.12 190)" }}
    >
      <motion.span key={replies} className="inline-flex" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>
        <Icon />
      </motion.span>
      <span className="hud-label hidden lg:inline">{spoken ? copy.replies.voice : copy.replies.text}</span>
      {spoken && blocked && <span aria-hidden className="hud-pip" />}
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
  const github = useTable((t) => t.laid.some((l) => l.kind === "github"));

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
      {/* leaving, and how I answer */}
      <div className="hud pointer-events-auto">
        <Link href="/" aria-label={copy.exitLabel} title={copy.exitLabel} onClick={() => play("close", { volume: 0.4 })} className="hud-btn group">
          <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
          <span className="hud-label hidden xl:inline">{copy.exit}</span>
        </Link>
        <span className="hud-sep" aria-hidden />
        <RepliesSwitch />
      </div>

      {/* how you ask */}
      <div role="radiogroup" aria-label={copy.switchLabel} className="hud pointer-events-auto absolute left-1/2 -translate-x-1/2">
        {MODES.map(({ id, icon: Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} aria-label={copy.modes[id]} onClick={() => choose(id)} className="hud-btn !px-3.5 sm:!px-4">
            {mode === id && <motion.span layoutId="mode-thumb" className="hud-thumb" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
            <span className="hud-ico">
              <Icon />
            </span>
            <span className="hud-txt hidden min-[480px]:inline">{copy.modeNames[id]}</span>
          </button>
        ))}
      </div>

      {/* what I hand you, and what we said */}
      <div className="hud pointer-events-auto">
        <button
          type="button"
          aria-pressed={card}
          aria-label={copy.card.label}
          title={copy.card.label}
          onClick={() => {
            play("click", { volume: 0.4 });
            useWorldStore.getState().setCardOpen(!card);
          }}
          className="hud-btn"
          style={{ ["--tone" as string]: "oklch(0.84 0.13 160)" }}
        >
          <IdCard />
          <span className="hud-label hidden xl:inline">{copy.card.open}</span>
        </button>
        <button
          type="button"
          aria-pressed={github}
          aria-label={world.github.label}
          title={world.github.label}
          onClick={() => {
            play(github ? "close" : "click", { volume: 0.4 });
            if (github) useTable.getState().take("github");
            else useWorldStore.getState().openGithub();
          }}
          className="hud-btn"
          style={{ ["--tone" as string]: "oklch(0.83 0.14 168)" }}
        >
          <GithubMark />
          <span className="hud-label hidden xl:inline">{world.github.short}</span>
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
          className="hud-btn !hidden sm:!inline-flex"
          style={{ ["--tone" as string]: "oklch(0.86 0.1 215)" }}
        >
          <BookOpen />
          <span className="hud-label hidden xl:inline">{copy.diary.history}</span>
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
          className="hud-btn"
          style={{ ["--tone" as string]: "oklch(0.8 0.14 300)" }}
        >
          <NotebookPen />
          <span className="hud-label hidden xl:inline">{copy.transcript}</span>
        </button>
        <TranscriptBarButton />
      </div>
    </motion.nav>
  );
}
