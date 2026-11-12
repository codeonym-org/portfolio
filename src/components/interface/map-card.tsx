"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { player } from "@/config/player.config";
import { clockIn, difference, offsetMinutes } from "@/record/time";
import { WORLD_LAND } from "@/record/world-map";

/**
 * Where the Player is, and what time it is there. The land is one
 * SVG path (Natural Earth, public domain); the time comes from the
 * visitor's own clock. Nothing is requested, nobody is located.
 */
export function MapCard() {
  const base = player.base;
  // the clock is the visitor's: it only exists in the browser
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const x = base.lon + 180;
  const y = 90 - base.lat;
  return (
    <figure className="glass-edge w-full max-w-md overflow-hidden bg-black/40" aria-label={`Map: ${base.city}, ${base.country}`}>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-b border-white/[0.07] px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-semibold text-white">
          <MapPin className="size-4 text-rank-s" /> {base.city}, {base.country}
        </span>
        <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Clock className="size-3.5 text-system" />
          {now ? (
            <>
              <span className="text-white">{clockIn(base.timeZone, now)}</span> there · {difference(offsetMinutes(base.timeZone, now), -now.getTimezoneOffset())}
            </>
          ) : (
            base.timeZone
          )}
        </span>
      </figcaption>
      <svg viewBox={"0 4 360 132"} className="block w-full" role="img" aria-label={`World map with ${base.city}, ${base.country} marked`}>
        <path d={WORLD_LAND} fill="oklch(0.62 0.22 295 / 0.22)" stroke="oklch(0.74 0.17 300 / 0.55)" strokeWidth="0.25" strokeLinejoin="round" />
        <line x1={x} x2={x} y1="0" y2="150" stroke="oklch(0.8 0.15 80 / 0.25)" strokeWidth="0.3" strokeDasharray="1 2" />
        <line x1="0" x2="360" y1={y} y2={y} stroke="oklch(0.8 0.15 80 / 0.25)" strokeWidth="0.3" strokeDasharray="1 2" />
        <circle cx={x} cy={y} r="2" fill="none" stroke="oklch(0.8 0.15 80)" strokeWidth="0.5">
          <animate attributeName="r" values="2;9" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={x} cy={y} r="1.6" fill="oklch(0.8 0.15 80)" />
      </svg>
    </figure>
  );
}
