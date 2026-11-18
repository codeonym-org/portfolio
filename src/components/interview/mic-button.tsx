"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { motion } from "motion/react";
import { MAX_MS } from "@/components/agent/voice/recorder";
import { useVoiceStore, voiceControl, voiceLive } from "@/components/agent/voice/voice-store";
import { world } from "@/config/world.config";
import { cn } from "@/lib/utils";

const copy = world.interview;
const RING = 2 * Math.PI * 62;
/** how much each bar of the level meter moves, from the microphone outward */
const BARS = [1, 0.75, 0.9, 0.5, 0.65];

/**
 * ── THE MICROPHONE ────────────────────────────────────────────
 * AUDIO: a studio microphone on a round of glass. Held, it turns
 * red and swells with your voice, rings spread from it, the meters
 * on each side follow the level, and a ring counts down the longest
 * take. Hold V does the same from the keyboard.
 */
export function MicButton() {
  const available = useVoiceStore((s) => s.available);
  const phase = useVoiceStore((s) => s.phase);
  const notice = useVoiceStore((s) => s.notice);
  const root = useRef<HTMLDivElement>(null);
  const listening = phase === "listening";
  const live = phase !== "idle";

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

  const meter = (flip: boolean) => (
    <div className={cn("flex h-10 items-center gap-1", flip && "flex-row-reverse")} aria-hidden>
      {BARS.map((k, i) => (
        <span key={i} className="mic__bar" style={{ ["--k" as string]: k }} />
      ))}
    </div>
  );

  return (
    <motion.div
      ref={root}
      initial={{ opacity: 0, y: 50, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.7, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      style={{ x: "-50%" }}
      className="mic fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[var(--dock-x,50%)] z-30 flex flex-col items-center gap-2"
      data-live={live}
      data-listening={listening}
    >
      <div className="flex items-center gap-3">
        {meter(true)}
        <div className="relative grid size-[136px] place-items-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <span className="mic__ring" />
            <span className="mic__ring" />
            <span className="mic__ring" />
          </div>
          <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 140 140" aria-hidden>
            <circle cx="70" cy="70" r="62" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2" />
            <circle
              cx="70"
              cy="70"
              r="62"
              fill="none"
              stroke="oklch(0.72 0.2 20)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={listening ? 0 : RING}
              style={{ transition: listening ? `stroke-dashoffset ${MAX_MS}ms linear` : "stroke-dashoffset 300ms ease-out" }}
            />
          </svg>
          <button
            type="button"
            disabled={!available}
            aria-label={`${copy.hold} (or hold V)`}
            aria-pressed={listening}
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
            className="air mic__body air-float relative grid size-[104px] touch-none place-items-center !rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-system/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {/* the microphone: its capsule, the cradle around it, the stem and the foot */}
            <span className="relative block h-[66px] w-[44px]" aria-hidden>
              <span className="mic__grille absolute top-0 left-1/2 block h-[40px] w-[24px] -translate-x-1/2 rounded-full" />
              <svg viewBox="0 0 44 66" className="absolute inset-0 text-white/85" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 24v4a16 16 0 0 0 32 0v-4" />
                <path d="M22 44v13" />
                <path d="M12 60h20" />
              </svg>
            </span>
          </button>
        </div>
        {meter(false)}
      </div>
      <p className={cn("air air-label !rounded-full px-3 py-1.5 transition-colors", live ? "text-white" : "text-white/60")} aria-live="polite">
        {available ? copy.phases[phase] : copy.noVoice}
      </p>
      {notice && <p className="air max-w-[min(420px,90vw)] px-3 py-2 text-center text-xs text-white/75">{notice}</p>}
    </motion.div>
  );
}
