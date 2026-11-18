"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, RotateCw } from "lucide-react";
import { systemConfig } from "@/config/system.config";

/**
 * ── WHEN SOMETHING IS NOT THERE ───────────────────────────────
 * The 404 and the error pages, in one design: the mark's ring drawn
 * large, its orb drifted out of it (a page that is not here) or the
 * ring cracked (something broke), the code inside, one plain
 * sentence, and the ways on. What was asked for (the path) or the
 * error's reference, to quote if they write to me.
 */

const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 26 } },
};

type Props = { kind: "notFound" } | { kind: "error"; reset: () => void; digest?: string };

export function StatusScreen(props: Props) {
  const lost = props.kind === "notFound";
  const copy = lost ? systemConfig.notFound : systemConfig.runtimeError;
  return (
    <main className="sts" data-kind={props.kind}>
      <div className="sts__aura" aria-hidden />
      <motion.div className="sts__body" initial="hidden" animate="show" transition={{ staggerChildren: 0.07, delayChildren: 0.1 }}>
        <motion.div variants={rise}>
          <Ring lost={lost} code={copy.code} />
        </motion.div>
        <motion.p variants={rise} className="sts__kicker">
          <i aria-hidden /> {copy.kicker}
        </motion.p>
        <motion.h1 variants={rise} className="sts__title">
          {copy.title}
        </motion.h1>
        <motion.p variants={rise} className="sts__text">
          {copy.body}
        </motion.p>
        <motion.div variants={rise} className="sts__actions">
          {props.kind === "error" ? (
            <>
              <button type="button" className="sts-btn sts-btn--go" onClick={props.reset}>
                <RotateCw className="size-4" /> {systemConfig.runtimeError.retry}
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load: whatever broke is left behind */}
              <a href="/" className="sts-btn">
                <ArrowLeft className="size-4" /> {systemConfig.runtimeError.home}
              </a>
            </>
          ) : (
            <>
              <Link href="/" className="sts-btn sts-btn--go">
                <ArrowLeft className="size-4" /> {systemConfig.notFound.home}
              </Link>
              <Link href="/interview" className="sts-btn">
                {systemConfig.notFound.interview} <ArrowRight className="size-4" />
              </Link>
              <Link href="/record" className="sts-btn sts-btn--quiet">
                <FileText className="size-4" /> {systemConfig.notFound.plain}
              </Link>
            </>
          )}
        </motion.div>
        <motion.div variants={rise}>{props.kind === "error" ? props.digest ? <Reference digest={props.digest} /> : null : <Asked />}</motion.div>
      </motion.div>
      <footer className="sts__foot">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG mark */}
        <img src="/brand/mark-small.svg" alt="" width={22} height={22} />
        <span className="sts__brand">CODEONYM</span>
        <span className="sts__dot" aria-hidden />
        <span>{systemConfig.notFound.site}</span>
      </footer>
    </main>
  );
}

function Asked() {
  const path = usePathname();
  if (!path || path === "/") return null;
  return (
    <Chip label={systemConfig.notFound.tried}>
      <code>{path.length > 48 ? `${path.slice(0, 45)}…` : path}</code>
    </Chip>
  );
}

function Reference({ digest }: { digest: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Chip label={systemConfig.runtimeError.ref}>
      <code>{digest}</code>
      <button
        type="button"
        className="sts-chip__copy"
        aria-label={copied ? systemConfig.runtimeError.copied : systemConfig.runtimeError.copy}
        title={copied ? systemConfig.runtimeError.copied : systemConfig.runtimeError.copy}
        onClick={() =>
          void navigator.clipboard?.writeText(digest).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          })
        }
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </Chip>
  );
}

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="sts-chip">
      <span className="sts-chip__label">{label}</span>
      {children}
    </p>
  );
}

/**
 * the mark's ring, large: a C open to the right. Lost: its orb has drifted
 * out through the opening, a dotted trail behind it. Broken: the ring is
 * cracked low on the left, its two pieces a little apart, a spark between.
 */
function Ring({ lost, code }: { lost: boolean; code: string }) {
  const cx = 120;
  const cy = 120;
  const r = 78;
  const at = (deg: number, rr = r) => [cx + rr * Math.cos((deg * Math.PI) / 180), cy + rr * Math.sin((deg * Math.PI) / 180)] as const;
  const arc = (from: number, to: number) => {
    const [x1, y1] = at(from);
    const [x2, y2] = at(to);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };
  return (
    <svg viewBox="0 0 240 240" className="sts-ring" role="img" aria-label={code}>
      <defs>
        <linearGradient id="sts-arc" gradientUnits="userSpaceOnUse" x1="120" y1="40" x2="120" y2="200">
          <stop offset="0" stopColor="#e3d4ff" />
          <stop offset=".42" stopColor="#9d70ff" />
          <stop offset=".78" stopColor="#5a7dff" />
          <stop offset="1" stopColor="#3fc8f6" />
        </linearGradient>
        <radialGradient id="sts-orb" cx=".38" cy=".34" r=".75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#cfe9ff" />
          <stop offset="1" stopColor="#6fb6ff" />
        </radialGradient>
        <linearGradient id="sts-code" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9a6ff" />
        </linearGradient>
        <filter id="sts-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {/* the orbit, faint, turning */}
      <circle cx={cx} cy={cy} r={106} className="sts-ring__orbit" />
      {lost ? (
        <>
          <path d={arc(38, 322)} stroke="url(#sts-arc)" className="sts-ring__glow" filter="url(#sts-glow)" />
          <path d={arc(38, 322)} stroke="url(#sts-arc)" className="sts-ring__arc" />
          {/* where the orb went: out through the opening, up and away */}
          <path d="M184,108 C196,94 200,74 199,54" className="sts-ring__trail" />
          <g className="sts-ring__orb">
            <circle cx="198" cy="40" r="16" fill="#9d70ff" opacity=".35" filter="url(#sts-glow)" />
            <circle cx="198" cy="40" r="9" fill="url(#sts-orb)" />
          </g>
        </>
      ) : (
        <>
          <g className="sts-ring__piece">
            <path d={arc(38, 140)} stroke="url(#sts-arc)" className="sts-ring__glow" filter="url(#sts-glow)" />
            <path d={arc(38, 140)} stroke="url(#sts-arc)" className="sts-ring__arc" />
          </g>
          <g className="sts-ring__piece sts-ring__piece--off">
            <path d={arc(156, 322)} stroke="url(#sts-arc)" className="sts-ring__glow" filter="url(#sts-glow)" />
            <path d={arc(156, 322)} stroke="url(#sts-arc)" className="sts-ring__arc" />
          </g>
          {/* the spark in the crack */}
          <g className="sts-ring__spark">
            <path d="M42,156 l-12,6 M44,166 l-10,12 M52,160 l-4,16" />
          </g>
          <g className="sts-ring__orb sts-ring__orb--dim">
            <circle cx="196" cy="120" r="7" fill="url(#sts-orb)" />
          </g>
        </>
      )}
      <text x={cx} y={cy + 1} className="sts-ring__code" fill="url(#sts-code)">
        {code}
      </text>
    </svg>
  );
}
