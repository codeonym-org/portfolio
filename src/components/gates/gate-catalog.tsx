"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { gates } from "@/config/gates.config";
import type { Gate, GateRank } from "@/config/types";
import { cn } from "@/lib/utils";
import { GateArt } from "./gate-art";

const rankTone: Record<GateRank, string> = {
  S: "border-rank-s text-rank-s shadow-[0_0_18px_oklch(0.8_0.15_80/0.45)]",
  A: "border-arcane-hot text-arcane-hot",
  B: "border-system text-system",
  C: "border-white/50 text-white",
};

export function RankBadge({ rank, className }: { rank: GateRank; className?: string }) {
  return (
    <span className={cn("grid place-items-center border bg-black/50 font-display", rankTone[rank], className)} aria-label={`Rank ${rank}`}>
      {rank}
    </span>
  );
}

/**
 * The gates, laid out like a console library: the selected gate fills
 * the screen behind, its details sit on the left, and the shelf of
 * covers runs along the bottom. Hover, focus or arrow keys select;
 * a click or Enter opens.
 */
export function GateCatalog() {
  const [selected, setSelected] = useState<Gate>(gates[0]);
  const sealed = selected.state === "sealed";
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {gates.map((g) => (
        <GateArt key={g.id} gate={g} className={cn("pointer-events-none absolute inset-0 size-full transition-opacity duration-700", g.id === selected.id ? "opacity-55" : "opacity-0")} />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-[5vw] sm:pt-8">
        <Link href="/" prefetch={false} className="flex items-center gap-3" aria-label="codeonym — open the default gate">
          {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG mark */}
          <img src="/brand/mark.svg" alt="" className="size-8" />
          <span className="hidden font-display text-[13px] tracking-[0.34em] text-white sm:inline">CODEONYM</span>
        </Link>
        <nav className="flex shrink-0 gap-4 font-mono text-[11px] tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase">
          <Link href="/record" className="plain-link">
            plain record
          </Link>
          <a href="/cv.pdf" className="plain-link">
            cv.pdf
          </a>
        </nav>
      </header>

      <section className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 sm:px-[5vw]" aria-live="polite">
        <p className="eyebrow mb-5">Gates · {gates.length} on record</p>
        <div key={selected.id} className="max-w-xl animate-[gate-in_0.5s_ease-out]">
          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            <RankBadge rank={selected.rank} className="size-9 text-base" />
            <span>Rank {selected.rank}</span>
            <span>·</span>
            <span className={sealed ? "text-rank-s" : "text-system"}>{sealed ? "Sealed" : "Open"}</span>
            <span>·</span>
            <span>{selected.cost}</span>
          </div>
          <h1 className="font-serif text-6xl leading-[0.95] text-balance text-white sm:text-8xl">{selected.name}</h1>
          <p className="mt-5 font-serif text-2xl leading-snug text-foreground/90 italic">{selected.tagline}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-foreground/75">{selected.description}</p>
          <ul className="mt-5 space-y-1.5 text-sm text-foreground/80">
            {selected.holds.map((h) => (
              <li key={h} className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rotate-45 bg-arcane-hot" />
                {h}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">For: {selected.audience}</p>
          <Link href={`/gates/${selected.id}`} prefetch={false} data-active={!sealed} className="hud-chip mt-7 px-6 py-3 font-display text-[11px] tracking-[0.3em]">
            {sealed ? (
              <>
                <Lock className="size-4" /> SEE THE SEAL
              </>
            ) : (
              <>
                ENTER THE GATE <ArrowRight className="size-4" />
              </>
            )}
          </Link>
        </div>
      </section>

      <nav className="relative z-10 px-5 pb-8 sm:px-[5vw] sm:pb-12" aria-label="All gates">
        <ul className="flex gap-4 overflow-x-auto pb-2">
          {gates.map((g) => {
            const active = g.id === selected.id;
            return (
              <li key={g.id} className="shrink-0">
                <Link
                  href={`/gates/${g.id}`}
                  prefetch={false}
                  onPointerEnter={() => setSelected(g)}
                  onFocus={() => setSelected(g)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group relative block h-36 w-56 overflow-hidden border transition-all duration-300 sm:h-44 sm:w-72",
                    active ? "scale-100 border-white/80 shadow-[0_0_40px_oklch(0.62_0.22_295/0.45)]" : "scale-[0.94] border-white/15 opacity-70 hover:opacity-100",
                  )}
                >
                  <GateArt gate={g} className={cn("absolute inset-0 size-full", g.state === "sealed" && "saturate-50")} />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <RankBadge rank={g.rank} className="absolute top-3 left-3 size-8 text-sm" />
                  {g.state === "sealed" && (
                    <span className="absolute top-3 right-3 flex items-center gap-1.5 border border-rank-s/60 bg-black/60 px-2 py-1 font-mono text-[9px] tracking-[0.2em] text-rank-s">
                      <Lock className="size-3" /> SEALED
                    </span>
                  )}
                  <span className="absolute inset-x-3 bottom-3">
                    <span className="block font-serif text-2xl leading-none text-white">{g.name}</span>
                    <span className="mt-1 block font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{g.audience}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="grid h-36 w-40 shrink-0 scale-[0.94] place-items-center border border-dashed border-white/15 px-4 text-center font-mono text-[10px] leading-relaxed tracking-[0.14em] text-muted-foreground/70 uppercase sm:h-44 sm:w-48">
            More gates will open here
          </li>
        </ul>
      </nav>
    </div>
  );
}
