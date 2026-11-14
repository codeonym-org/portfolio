"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { motion } from "motion/react";
import { MAX_MS } from "@/components/agent/voice/recorder";
import { useVoiceStore, voiceControl, voiceLive } from "@/components/agent/voice/voice-store";
import { world } from "@/config/world.config";
import { cn } from "@/lib/utils";

const copy = world.interview;
const SPECKS = 12;
const RING = 2 * Math.PI * 62;

/**
 * AUDIO: a round, soft-shadowed button with a mirror ball inside. Held,
 * it sinks into the surface, the ball spins faster, its reflections
 * fly out with your voice, and a ring counts down the longest take.
 * Hold V does the same from the keyboard.
 */
export function DiscoButton() {
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

  return (
    <motion.div
      key="audio"
      ref={root}
      initial={{ opacity: 0, y: 30, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2.5"
    >
      <div className="disco relative grid size-[140px] place-items-center" data-live={live} data-listening={listening} data-speaking={phase === "speaking"}>
        {/* the ball's reflections, thrown around the room */}
        <div className="disco__specks pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: SPECKS }, (_, i) => (
            <span key={i} style={{ ["--a" as string]: `${(360 / SPECKS) * i}deg`, ["--h" as string]: `${(i * 47) % 360}` }} />
          ))}
        </div>
        <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 140 140" aria-hidden>
          <circle cx="70" cy="70" r="62" fill="none" stroke="rgb(255 255 255 / 0.05)" strokeWidth="2" />
          <circle
            cx="70"
            cy="70"
            r="62"
            fill="none"
            stroke="url(#disco-ring)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={listening ? 0 : RING}
            style={{ transition: listening ? `stroke-dashoffset ${MAX_MS}ms linear` : "stroke-dashoffset 300ms ease-out" }}
          />
          <defs>
            <linearGradient id="disco-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.13 232)" />
              <stop offset="100%" stopColor="oklch(0.74 0.17 300)" />
            </linearGradient>
          </defs>
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
          className="disco__body relative grid size-[104px] touch-none place-items-center rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-system/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="disco__ball" aria-hidden />
        </button>
      </div>
      <p className={cn("h-4 font-mono text-[10px] tracking-[0.28em] uppercase transition-colors", live ? "text-white/85" : "text-white/40")} aria-live="polite">
        {available ? copy.phases[phase] : copy.noVoice}
      </p>
      {notice && <p className="max-w-[min(420px,90vw)] text-center text-xs text-white/60">{notice}</p>}
    </motion.div>
  );
}
