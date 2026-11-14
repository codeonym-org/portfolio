"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useInterview, type InterviewMode } from "./interview-store";

const copy = world.interview;
const MODES: InterviewMode[] = ["text", "audio"];

/** the pill's size, and how far the drop falls before it becomes one */
const PILL = { w: 196, h: 44, y: 74 };
/** the pointer is near the top centre: open; it has gone well away: close (after a breath) */
const NEAR = { y: 96, x: 170 };
const FAR = { y: 170, x: 260 };
const CLOSE_AFTER_MS = 650;

/**
 * ── THE INK DROP ──────────────────────────────────────────────
 * Nothing is shown at the top of the room until the pointer comes
 * near its centre: then a drop of ink swells at the edge, slips
 * down, and spreads into the TEXT / AUDIO switch. Going away pulls it
 * back up. The liquid look is one SVG goo filter (a blur, then a
 * hard alpha threshold) over plain shapes; the labels sit outside the
 * filter so they stay sharp. On touch, a bead at the edge opens it.
 */
export function ModeDrop() {
  const mode = useInterview((s) => s.mode);
  const setMode = useInterview((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const dx = Math.abs(e.clientX - window.innerWidth / 2);
      if (e.clientY < NEAR.y && dx < NEAR.x) {
        window.clearTimeout(closeTimer.current);
        setOpen(true);
      } else if (e.clientY > FAR.y || dx > FAR.x) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
          if (!root.current?.contains(document.activeElement)) setOpen(false);
        }, CLOSE_AFTER_MS);
      }
    };
    // a tap anywhere else closes it on touch
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (open) play("hover", { volume: 0.25, rate: 0.8 });
  }, [open]);

  const choose = (next: InterviewMode) => {
    if (next !== mode) play("click", { volume: 0.45 });
    setMode(next);
  };

  const cx = 130;
  return (
    <div
      ref={root}
      className="fixed top-0 left-1/2 z-40 h-[130px] w-[260px] -translate-x-1/2"
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <svg width={260} height={130} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
        <defs>
          <filter id="ink-goo" x="-20%" y="-20%" width="140%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
          <linearGradient id="ink-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.36 0.16 292)" />
            <stop offset="100%" stopColor="oklch(0.2 0.1 285)" />
          </linearGradient>
        </defs>
        <g filter="url(#ink-goo)" fill="url(#ink-fill)">
          {/* the ink gathered at the edge */}
          <motion.ellipse
            cx={cx}
            cy={0}
            initial={false}
            animate={open ? { rx: [16, 46, 22], ry: [6, 20, 9] } : { rx: 16, ry: 6 }}
            transition={{ duration: open ? 0.7 : 0.45, times: [0, 0.35, 1], ease: "easeInOut" }}
          />
          {/* the drop: it swells, falls, and is spread into the pill */}
          <motion.circle
            cx={cx}
            initial={false}
            animate={open ? { cy: [4, 16, PILL.y], r: [6, 15, PILL.h / 2] } : { cy: 2, r: 4 }}
            transition={open ? { duration: 0.62, times: [0, 0.35, 1], ease: ["easeOut", [0.55, 0, 0.9, 0.6]] } : { duration: 0.42, ease: [0.4, 0, 0.6, 1] }}
          />
          <motion.rect
            y={PILL.y - PILL.h / 2}
            height={PILL.h}
            rx={PILL.h / 2}
            initial={false}
            animate={open ? { width: PILL.w, x: cx - PILL.w / 2, opacity: 1 } : { width: PILL.h, x: cx - PILL.h / 2, opacity: 0 }}
            transition={open ? { delay: 0.5, type: "spring", stiffness: 260, damping: 17 } : { duration: 0.22 }}
          />
          {/* a last droplet that follows the first, for weight */}
          <motion.circle
            cx={cx}
            initial={false}
            animate={open ? { cy: [2, 30, PILL.y - 12], r: [3, 7, 0] } : { cy: 0, r: 0 }}
            transition={{ delay: open ? 0.28 : 0, duration: 0.55, ease: "easeIn" }}
          />
        </g>
      </svg>

      <AnimatePresence>
        {open && (
          <motion.div
            role="radiogroup"
            aria-label={copy.switchLabel}
            className="absolute left-1/2 flex -translate-x-1/2 items-center p-1"
            style={{ top: PILL.y - PILL.h / 2, width: PILL.w, height: PILL.h }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.62, duration: 0.25 } }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
          >
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => choose(m)}
                className={cn(
                  "relative flex-1 rounded-full py-2 font-display text-[10px] tracking-[0.32em] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-system",
                  mode === m ? "text-white" : "text-white/45 hover:text-white/80",
                )}
              >
                {mode === m && (
                  <motion.span
                    layoutId="ink-mode"
                    className="absolute inset-0 rounded-full bg-white/[0.13] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_18px_oklch(0.62_0.22_295/0.5)]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative">{copy.modes[m]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* the bead: what a finger can find, and what the keyboard focuses */}
      {!open && (
        <button
          type="button"
          aria-label={copy.switchLabel}
          onClick={() => setOpen(true)}
          className="absolute top-0 left-1/2 h-7 w-16 -translate-x-1/2 outline-none [@media(pointer:fine)]:opacity-0 focus-visible:opacity-100"
        />
      )}
    </div>
  );
}
