"use client";

import Link from "next/link";
import { ArrowRight, FileText, IdCard, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { familyName } from "@/components/interview/vcard";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { toggleImmersion, useCanImmerse, useImmersive } from "@/lib/immersion";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { SectionDock, SectionMenu } from "./section-nav";

const hud = world.hud;
const fullName = `${player.firstName} ${familyName(player.name, player.firstName)}`;

/**
 * ── THE TOP OF THE RECORD ─────────────────────────────────────
 * On the left, who this is: the mark, the name codeonym, and his own
 * name and title under it. Beside it, the six sections of the
 * record (`section-nav.tsx`). On the right, one bar of tools (the
 * index when the middle has no room for it, his business card, the
 * plain record, sound, fullscreen) and, apart from
 * it and lit, the way into the interview: his face with a live dot,
 * "Interview me", a light running round its edge.
 */
export function TopBar() {
  const muted = useWorldStore((s) => s.muted);
  const toggleMuted = useWorldStore((s) => s.toggleMuted);
  const closeFocus = useWorldStore((s) => s.closeFocus);
  const ready = useWorldStore((s) => s.ready);
  const card = useWorldStore((s) => s.cardOpen);
  const immersive = useImmersive();
  const canImmerse = useCanImmerse();
  return (
    <header className={cn("hdr pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-3 pt-3 transition-opacity duration-1000 sm:px-[4vw] sm:pt-5", !ready && "opacity-0")}>
      <div className="flex min-w-0 items-center gap-5">
      <button type="button" onClick={closeFocus} className="hdr-brand pointer-events-auto flex min-w-0 shrink-0 items-center gap-3 text-left" aria-label={`${player.handle}: back to orbit`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG mark */}
        <img src="/brand/mark-small.svg" alt="" className="size-9 shrink-0" />
        <span className="hidden min-w-0 min-[430px]:block">
          <span className="block font-display text-[13px] leading-none tracking-[0.34em] text-white">{player.handle.toUpperCase()}</span>
          <span className="mt-1.5 flex items-center gap-2 truncate text-[11px] leading-none text-white/55">
            <span className="text-white/80">{fullName}</span>
            <i className="hdr-brand__dot" aria-hidden />
            <span>{player.title}</span>
          </span>
        </span>
      </button>
      {/* the six sections, beside the name, where there is room for them */}
      <div className="hdr-wide pointer-events-auto">
        <SectionDock />
      </div>
      </div>

      <div className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <nav aria-label="Tools" className="hdr-bar">
          <div className="hdr-narrow">
            <SectionMenu />
          </div>
          <button
            type="button"
            data-cta="card"
            aria-pressed={card}
            data-on={card}
            aria-label={hud.cardLabel}
            title={hud.cardLabel}
            onClick={() => {
              play("click", { volume: 0.4 });
              useWorldStore.getState().setCardOpen(!card);
            }}
            className="hdr-tool"
          >
            <IdCard className="size-4" />
            <span className="hdr-label">{hud.card}</span>
          </button>
          <Link href="/record" aria-label="The plain record: the same content as one page of text" title="The plain record (text only)" className="hdr-tool hdr-record">
            <FileText className="size-4" />
            <span className="hdr-label">{hud.plain}</span>
          </Link>
          <i className="hdr-bar__sep" aria-hidden />
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute (M)" : "Mute (M)"}
            aria-pressed={muted}
            onClick={() => {
              toggleMuted();
              if (muted) window.setTimeout(() => play("click"), 60);
            }}
            className="hdr-tool hdr-tool--icon"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          {canImmerse && (
            <button
              type="button"
              aria-label={immersive ? "Leave fullscreen" : "Fullscreen (F)"}
              title={immersive ? "Leave fullscreen (F)" : "Fullscreen (F)"}
              aria-pressed={immersive}
              onClick={() => void toggleImmersion()}
              className="hdr-tool hdr-tool--icon !hidden sm:!inline-flex"
            >
              {immersive ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
          )}
        </nav>

        <Link href="/interview" data-cta="interview" aria-label={hud.interviewLabel} title={hud.interviewLabel} onClick={() => play("confirm", { volume: 0.4 })} className="hdr-cta group">
          <span className="hdr-cta__face">
            {/* eslint-disable-next-line @next/next/no-img-element -- a 3 KB local portrait */}
            <img src="/brand/avatar.webp" alt="" width={64} height={64} />
            <i className="hdr-cta__live" aria-hidden />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[10px] tracking-[0.26em] text-white uppercase">{hud.interview}</span>
            <span className="mt-1.5 hidden text-[11px] text-white/60 sm:block">{hud.interviewSub}</span>
          </span>
          <ArrowRight className="hidden size-4 text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-white sm:block" />
        </Link>
      </div>
    </header>
  );
}
