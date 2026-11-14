"use client";

import Link from "next/link";
import { FileText, Maximize, Minimize, Volume2, UserRound, VolumeX } from "lucide-react";
import { player } from "@/config/player.config";
import { systemConfig } from "@/config/system.config";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { toggleImmersion, useCanImmerse, useImmersive } from "@/lib/immersion";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";

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
        <Link href="/interview" aria-label="The interview — talk to my avatar" title="The interview — talk to my avatar" className="hud-chip h-9 px-2.5">
          <UserRound className="size-4" />
          <span className="hidden font-mono text-[11px] md:inline">{world.hud.interview}</span>
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
