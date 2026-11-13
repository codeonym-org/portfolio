"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { LEVELS, type HoloData, type HoloPlace } from "@/components/map/holo-scene";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { clockIn, difference, offsetMinutes } from "@/record/time";
import { useWorldStore } from "@/store/world-store";

const HoloScene = dynamic(() => import("@/components/map/holo-scene"), { ssr: false });

const copy = world.map;
const base = player.base;
const PLACE: HoloPlace = { lon: base.lon, lat: base.lat, country: base.countryCentre };
const coordinates = `${Math.abs(base.lat).toFixed(2)}° ${base.lat >= 0 ? "N" : "S"} · ${Math.abs(base.lon).toFixed(2)}° ${base.lon >= 0 ? "E" : "W"}`;

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const q = window.matchMedia(motionQuery);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

/**
 * The holographic map: a System window over the whole stage with a
 * globe inside. It opens on the whole planet and comes down to the
 * Player's city. The data is one file served by this site; the time
 * comes from the visitor's own clock. Nobody is located.
 */
export default function HoloMap() {
  const close = useWorldStore((s) => s.setMapOpen);
  const still = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
  const [data, setData] = useState<HoloData | null>(null);
  const [failed, setFailed] = useState(false);
  const [level, setLevel] = useState(0);
  const [want, setWant] = useState({ level: 0, n: 0 });
  const [now, setNow] = useState<Date | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/holo-map.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: HoloData) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // the keyboard goes into the window and comes back out to where it was
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    play("open", { volume: 0.4 });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  const step = useCallback((to: number) => {
    play("hover");
    setWant((w) => ({ level: Math.min(LEVELS.length - 1, Math.max(0, to)), n: w.n + 1 }));
  }, []);

  // left and right walk the levels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "+" || e.key === "=") step(level + 1);
      else if (e.key === "ArrowLeft" || e.key === "-") step(level - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [level, step]);

  return (
    <div className="holo-backdrop fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" onClick={(e) => e.target === e.currentTarget && close(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="holo-map-title" className="sys-window flex h-[min(760px,100%)] w-[min(1180px,100%)] flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-[color-mix(in_oklch,var(--sys)_30%,transparent)] py-2.5 pr-2 pl-4">
          <p className="sys-head min-w-0 flex-1 text-xs">
            <span id="holo-map-title" className="truncate">
              {copy.title}
            </span>
          </p>
          <button ref={closeButton} type="button" aria-label="Close the map" onClick={() => close(false)} className="sys-button grid size-8 place-items-center">
            <X className="size-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <div className="holo-stage absolute inset-0 cursor-grab active:cursor-grabbing" aria-hidden>
            <HoloScene data={data} place={PLACE} want={want} still={still} onLevel={setLevel} />
          </div>
          <span className="holo-lines" aria-hidden />

          <div className="pointer-events-none absolute top-3 left-4 max-w-[70%]">
            <p className="text-[11px] font-bold tracking-[0.3em] text-[color-mix(in_oklch,var(--sys)_80%,transparent)] uppercase">
              {copy.level} {level + 1}/{LEVELS.length} · {LEVELS[level]}
            </p>
            <p className="mt-1 text-2xl leading-tight font-bold tracking-wide text-white sm:text-3xl">
              {level < 2 ? base.country : base.city}
              <span className="font-medium text-white/60">{level < 2 ? "" : `, ${base.country}`}</span>
            </p>
            <p className="mt-0.5 text-sm tracking-widest text-gold tabular-nums">{coordinates}</p>
            {level === 3 && <p className="mt-1 text-xs tracking-wider text-white/55">{data ? copy.rings : copy.noRoads}</p>}
          </div>

          <div className="pointer-events-none absolute top-3 right-4 text-right">
            <p className="text-[11px] font-bold tracking-[0.3em] text-[color-mix(in_oklch,var(--sys)_80%,transparent)] uppercase">{copy.time}</p>
            <p className="mt-1 text-2xl leading-tight font-bold text-white tabular-nums sm:text-3xl">{now ? clockIn(base.timeZone, now) : "--:--"}</p>
            <p className="mt-0.5 text-sm tracking-wider text-white/70">{now ? difference(offsetMinutes(base.timeZone, now), -now.getTimezoneOffset()) : base.timeZone}</p>
          </div>

          {!data && (
            <p role="status" className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm font-bold tracking-[0.3em] text-white/70 uppercase">
              {failed ? copy.failed : copy.loading}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color-mix(in_oklch,var(--sys)_30%,transparent)] px-3 py-2.5">
          <div className="flex gap-1.5" role="group" aria-label="Zoom level">
            {LEVELS.map((name, i) => (
              <button key={name} type="button" aria-pressed={level === i} data-primary={level === i} onClick={() => step(i)} className={cn("sys-button px-3 py-1.5 text-[11px] sm:px-4 sm:text-xs")}>
                {name}
              </button>
            ))}
          </div>
          <p className="hidden text-[11px] tracking-[0.16em] text-white/50 uppercase md:block">{copy.hint}</p>
          <p className="ml-auto text-[10px] leading-snug tracking-wide text-white/45">{copy.credits}</p>
        </footer>
      </div>
    </div>
  );
}
