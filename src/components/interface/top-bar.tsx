"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, DoorOpen, FileText, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { player } from "@/config/player.config";
import { systemConfig } from "@/config/system.config";
import { visitorQuests, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { toggleImmersion, useCanImmerse, useImmersive } from "@/lib/immersion";
import { cn } from "@/lib/utils";
import { levelFor, syncPercent, useWorldStore } from "@/store/world-store";

/** how much of the record the visitor has uncovered — and what is left */
function Sync() {
  const visited = useWorldStore((s) => s.visited);
  const risen = useWorldStore((s) => s.risen);
  const completed = useWorldStore((s) => s.completed);
  const xp = useWorldStore((s) => s.xp);
  const [open, setOpen] = useState(false);
  const percent = syncPercent({ visited, risen, completed });
  const R = 9;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} aria-label={`${world.hud.syncLabel} ${percent}% — ${world.hud.questsLabel}`} onClick={() => setOpen((o) => !o)} className="hud-chip h-9 px-2.5">
        <svg viewBox="0 0 24 24" className="size-5 -rotate-90">
          <circle cx="12" cy="12" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
          <circle cx="12" cy="12" r={R} fill="none" stroke="var(--arcane-hot)" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - percent / 100)} className="transition-[stroke-dashoffset] duration-700" />
        </svg>
        <span className="font-mono text-[11px] tabular-nums">
          <span className="hidden text-muted-foreground sm:inline">{world.hud.syncLabel} </span>
          {percent}%
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass glass-edge sys-panel absolute top-11 right-0 z-50 w-72 space-y-3 p-4"
          >
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">{world.hud.questsLabel}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                VISITOR LV.{levelFor(xp)} · {xp} XP
              </p>
            </div>
            <ul className="space-y-2">
              {visitorQuests.map((q) => {
                const done = completed.includes(q.id);
                return (
                  <li key={q.id} className="flex items-start gap-2.5 text-sm">
                    <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center border", done ? "border-rank-s bg-rank-s/20 text-rank-s" : "border-white/20")}>{done && <Check className="size-3" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block leading-tight", done ? "text-muted-foreground line-through" : "text-foreground")}>{q.name}</span>
                      <span className="block text-xs text-muted-foreground">{q.objective}</span>
                    </span>
                    <span className="font-mono text-[10px] text-rank-s">+{q.xp}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopBar() {
  const muted = useWorldStore((s) => s.muted);
  const toggleMuted = useWorldStore((s) => s.toggleMuted);
  const closeFocus = useWorldStore((s) => s.closeFocus);
  const ready = useWorldStore((s) => s.ready);
  const immersive = useImmersive();
  const canImmerse = useCanImmerse();
  return (
    <header className={cn("pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-3 pt-3 transition-opacity duration-1000 sm:px-[4vw] sm:pt-6", !ready && "opacity-0")}>
      <button type="button" onClick={closeFocus} className="pointer-events-auto flex items-center gap-3 text-left" aria-label="codeonym — back to orbit">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG mark */}
        <img src="/brand/mark-small.svg" alt="" className="size-8" />
        <span>
          <span className="block font-display text-[13px] tracking-[0.34em] text-white">{player.handle.toUpperCase()}</span>
          <span className="eyebrow mt-0.5 block text-[9px]">
            {player.title} <span className="text-muted-foreground/50">· v{systemConfig.version}</span>
          </span>
        </span>
      </button>
      <div className="pointer-events-auto flex items-center gap-1.5">
        <Sync />
        <Link href="/gates" aria-label="Gates — every way into the record" title="Gates — every way into the record" className="hud-chip h-9 px-2.5">
          <DoorOpen className="size-4" />
          <span className="hidden font-mono text-[11px] md:inline">{world.hud.gates}</span>
        </Link>
        <Link href="/record" aria-label="The plain record — the same content as one page of text" title="The plain record (text only)" className="hud-chip h-9 px-2.5">
          <FileText className="size-4" />
          <span className="hidden font-mono text-[11px] md:inline">{world.hud.plain}</span>
        </Link>
        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          onClick={() => {
            toggleMuted();
            if (muted) window.setTimeout(() => play("click"), 60);
          }}
          className="hud-chip size-9"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        {canImmerse && (
          <button type="button" aria-label={immersive ? "Leave fullscreen" : "Fullscreen (F)"} aria-pressed={immersive} onClick={() => void toggleImmersion()} className="hud-chip hidden size-9 sm:inline-flex">
            {immersive ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        )}
      </div>
    </header>
  );
}
