"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { motion } from "motion/react";
import { Mic } from "lucide-react";
import { MAX_MS } from "@/components/agent/voice/recorder";
import { useVoiceStore, voiceControl, voiceLive } from "@/components/agent/voice/voice-store";
import { world } from "@/config/world.config";

const copy = world.interview;
/** the wave across the dock: each bar's share of the level, high in the middle and uneven */
const WAVE = Array.from({ length: 44 }, (_, i) => {
  const x = i / 43;
  const envelope = Math.sin(Math.PI * x) ** 0.8;
  const grain = 0.55 + 0.45 * Math.abs(Math.sin(i * 2.17) * Math.cos(i * 0.73));
  return +(0.15 + envelope * grain).toFixed(3);
});

/**
 * ── TALKING ───────────────────────────────────────────────────
 * AUDIO: the same dock as for typing, held instead of typed in. Hold
 * it anywhere (or hold V): the microphone turns red and swells with
 * your voice, the wave across the dock follows it, and the longest
 * take runs out along its bottom edge. While I think, the wave waits;
 * while I speak, it is my voice it follows.
 */
export function MicButton() {
  const available = useVoiceStore((s) => s.available);
  const phase = useVoiceStore((s) => s.phase);
  const notice = useVoiceStore((s) => s.notice);
  const root = useRef<HTMLButtonElement>(null);
  const listening = phase === "listening";

  // the loudness of whoever is talking, as a CSS variable — never React state
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      root.current?.style.setProperty("--lvl", voiceLive.level.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const end = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    voiceControl.release();
  };

  const title = !available ? copy.noVoiceShort : phase === "idle" ? copy.hold : copy.phaseTitles[phase];
  const sub = !available ? copy.noVoice : phase === "idle" ? copy.holdSub : copy.phaseSubs[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.9, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      style={{ x: "-50%" }}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[var(--dock-x,50%)] z-30 flex w-[min(620px,var(--dock-w,calc(100vw-1.5rem)))] flex-col items-center gap-2 transition-[left,width] duration-300"
    >
      {notice && <p className="ask !block max-w-full !rounded-xl !px-3.5 !py-2 text-center text-xs text-white/75">{notice}</p>}
      <button
        ref={root}
        type="button"
        disabled={!available}
        aria-label={`${copy.hold} (or hold V)`}
        aria-pressed={listening}
        data-phase={phase}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          voiceControl.press();
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            voiceControl.press();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") voiceControl.release();
        }}
        className="ask talkbar"
      >
        <span className="talkbar__mic" aria-hidden>
          <Mic className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="talkbar__text" aria-live="polite">
          <span className="talkbar__title">{title}</span>
          <span className="talkbar__sub hidden min-[420px]:block">{sub}</span>
        </span>
        <span className="talkbar__wave" aria-hidden>
          {WAVE.map((k, i) => (
            <i key={i} style={{ ["--k" as string]: k, ["--i" as string]: i }} />
          ))}
        </span>
        <span className="hud-kbd hidden sm:inline-grid" aria-hidden>
          V
        </span>
        <span
          className="talkbar__time"
          aria-hidden
          style={{ transform: listening ? "scaleX(1)" : "scaleX(0)", transition: listening ? `transform ${MAX_MS}ms linear` : "transform 250ms ease-out" }}
        />
      </button>
    </motion.div>
  );
}
