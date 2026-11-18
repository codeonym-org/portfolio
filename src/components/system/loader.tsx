"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useProgress } from "@react-three/drei";

/**
 * ── THE WAY IN ────────────────────────────────────────────────
 * What covers a page while its 3D loads: an emblem (the mark on the
 * record, my face in the interview room) in a ring that fills with
 * what has really been downloaded (three's loading manager, through
 * drei's `useProgress`), a comet running round it so it never looks
 * stuck, the name set letter by letter, and the step it is on. Held
 * short of full until the page says it is ready (the shaders still
 * compile after the last byte), then it fills, and opens.
 */

const R = 74;
const C = 2 * Math.PI * R;

export interface LoaderProps {
  /** false once the page is ready */
  show: boolean;
  emblem: ReactNode;
  /** set letter by letter */
  name: string;
  sub: string;
  /** the steps it says, one after another */
  lines: readonly string[];
  /** over the page or under its own bar */
  className?: string;
  label: string;
}

export function Loader({ show, ...rest }: LoaderProps) {
  return <AnimatePresence>{show && <Cover key="loader" {...rest} />}</AnimatePresence>;
}

function Cover({ emblem, name, sub, lines, className, label }: Omit<LoaderProps, "show">) {
  const still = useReducedMotion();
  const { progress, active } = useProgress();
  // nothing to fetch (cached) still takes a moment: a floor that creeps
  const [floor, setFloor] = useState(4);
  useEffect(() => {
    const t = window.setInterval(() => setFloor((f) => Math.min(f + (90 - f) * 0.05, 90)), 160);
    return () => window.clearInterval(t);
  }, []);
  const present = useIsPresent();
  // ready: it fills, then opens (the exit waits for it)
  const target = present ? Math.min(96, Math.max(floor, active || progress > 0 ? progress : floor)) : 100;
  const spring = useSpring(4, { stiffness: 60, damping: 20 });
  useEffect(() => spring.set(target), [spring, target]);
  const dash = useTransform(spring, (v) => C * (1 - v / 100));
  const pct = useTransform(spring, (v) => `${Math.round(v)}`);

  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setLine((l) => (l + 1) % lines.length), 1400);
    return () => window.clearInterval(t);
  }, [lines.length]);

  return (
    <motion.div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={`ldr ${className ?? ""}`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.25 } }}
    >
      <div className="ldr__aura" aria-hidden />
      <motion.div className="ldr__center" exit={still ? undefined : { scale: 1.06, filter: "blur(6px)", opacity: 0, transition: { duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] } }}>
        <div className="ldr__emblem">
          <svg viewBox="0 0 180 180" className="ldr__ring" aria-hidden>
            <defs>
              <linearGradient id="ldr-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e3d4ff" />
                <stop offset=".45" stopColor="#9d70ff" />
                <stop offset="1" stopColor="#3fc8f6" />
              </linearGradient>
            </defs>
            <circle cx="90" cy="90" r={R} className="ldr__track" />
            <motion.circle cx="90" cy="90" r={R} className="ldr__fill" stroke="url(#ldr-arc)" strokeDasharray={C} style={{ strokeDashoffset: dash }} />
            {/* the comet: always moving, whatever the bytes do */}
            <g className="ldr__comet">
              <circle cx="90" cy="90" r={R + 9} className="ldr__comet-tail" strokeDasharray={`${C * 0.16} ${C * 2}`} />
              <circle cx={90 + R + 9} cy="90" r="2.2" className="ldr__comet-head" />
            </g>
          </svg>
          <div className="ldr__core">{emblem}</div>
        </div>

        <p className="ldr__name" aria-hidden>
          {[...name].map((ch, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 6, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.15 + i * 0.05, duration: 0.5 }}>
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </p>
        <motion.p className="ldr__sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + name.length * 0.05 }}>
          {sub}
        </motion.p>

        <div className="ldr__step">
          <span className="ldr__pct">
            <motion.span>{pct}</motion.span>
            <i>%</i>
          </span>
          <span className="ldr__sep" aria-hidden />
          <span className="ldr__line">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={line} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.25 }}>
                {lines[line]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
