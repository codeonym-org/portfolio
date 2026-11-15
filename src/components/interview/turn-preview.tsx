"use client";

import { motion } from "motion/react";
import { History } from "lucide-react";
import { world } from "@/config/world.config";
import { cn } from "@/lib/utils";
import type { InterviewTurn } from "./turns";

const copy = world.interview;

/** his words without the marks of Markdown, for one or two lines */
const plain = (text: string) => text.replace(/[*_`#>]+/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();

/**
 * ── THE TURN BEFORE ───────────────────────────────────────────
 * When a new question is asked, the question and the answer on the
 * canvas fly here and become two short lines: the last turn, kept
 * in sight. Pressing it opens the transcript.
 */
export function TurnPreview({ turn, compact, onOpen }: { turn: InterviewTurn; compact?: boolean; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      aria-label={`${copy.previous}: ${turn.you}`}
      title={copy.transcript}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, transition: { delay: 0.15 } }}
      exit={{ opacity: 0, scale: 0.7, y: 12, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.03 }}
      className={cn("air pointer-events-auto block text-left outline-none focus-visible:ring-1 focus-visible:ring-system", compact ? "w-full !rounded-2xl px-3 py-1.5" : "w-[270px] px-3.5 py-2.5")}
      style={{ ["--air-tint" as string]: "oklch(0.75 0.02 260)" }}
    >
      <span className={cn("flex items-center gap-1.5", compact ? "hidden" : "mb-1")}>
        <History className="size-3 text-white/45" />
        <span className="air-label text-[8px]">{copy.previous}</span>
      </span>
      <motion.span layout="position" layoutId={`q:${turn.id}`} className="block truncate text-[12px] text-white/75">
        <span className="mr-1.5 text-[oklch(0.78_0.13_232)]">›</span>
        {turn.you}
      </motion.span>
      <motion.span layout="position" layoutId={`a:${turn.id}`} className={cn("block text-[12px] leading-snug text-white/50", compact ? "truncate" : "line-clamp-2")}>
        <span className="mr-1.5 text-[oklch(0.74_0.17_300)]">‹</span>
        {plain(turn.him) || "…"}
      </motion.span>
    </motion.button>
  );
}
