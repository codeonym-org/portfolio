"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toneColor } from "@/components/scene/view";
import { sectors, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { nodesOfSector } from "@/record/nodes";
import { useWorldStore } from "@/store/world-store";

const copy = world.hud;
/** the wheel is half a circle docked to the left edge: its segments fan from straight up to straight down */
const SPAN = 156;
const STEP = SPAN / sectors.length;
const START = -SPAN / 2;
const rad = (deg: number) => (deg * Math.PI) / 180;

function point(r: number, deg: number) {
  return `${(Math.cos(rad(deg)) * r).toFixed(1)} ${(Math.sin(rad(deg)) * r).toFixed(1)}`;
}

/** one segment: a slice of a ring between two angles, with a small gap on each side */
function slice(inner: number, outer: number, from: number, to: number) {
  const a = from + 0.9;
  const b = to - 0.9;
  return `M${point(inner, a)} L${point(outer, a)} A${outer} ${outer} 0 0 1 ${point(outer, b)} L${point(inner, b)} A${inner} ${inner} 0 0 0 ${point(inner, a)}Z`;
}

const typing = (target: EventTarget | null) => !!(target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable=true]");

/**
 * The index, as a wheel. It stays out of the way until the pointer
 * reaches the left edge, the visitor holds Q, or (on a touch screen)
 * taps the tab on the edge. The six sectors are its segments:
 * pointing at one lights its ring in the sky; a click, or letting go
 * of Q, opens it. Keys 1–6 still open the sectors without the wheel.
 */
export function IndexWheel() {
  const ready = useWorldStore((s) => s.ready);
  const touch = useWorldStore((s) => s.touch);
  const current = useWorldStore((s) => s.sector);
  const visited = useWorldStore((s) => s.visited);
  const openSector = useWorldStore((s) => s.openSector);
  const setHovered = useWorldStore((s) => s.setHovered);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const held = useRef(false);
  const closing = useRef<number | undefined>(undefined);
  const wheel = useRef<HTMLDivElement>(null);

  const outer = touch ? 232 : 286;
  const inner = touch ? 92 : 118;

  const select = useCallback(
    (index: number | null) => {
      setPick((was) => {
        if (was !== index && index !== null) play("hover");
        return index;
      });
      setHovered(index === null ? null : nodesOfSector(sectors[index].id)[0].key);
    },
    [setHovered],
  );

  const show = useCallback(() => {
    window.clearTimeout(closing.current);
    setOpen((was) => {
      if (!was) play("open", { volume: 0.3 });
      return true;
    });
  }, []);
  const hide = useCallback(() => {
    window.clearTimeout(closing.current);
    setOpen(false);
    select(null);
  }, [select]);
  const choose = useCallback(
    (index: number) => {
      openSector(sectors[index].id);
      hide();
    },
    [openSector, hide],
  );

  // hold Q: the wheel is up while the key is down; letting go opens the pointed sector
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.stopPropagation();
        hide();
        return;
      }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "q" && !e.repeat) {
        held.current = true;
        show();
        setPick((was) => was ?? 0);
      } else if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        select(((pick ?? (step > 0 ? -1 : 0)) + step + sectors.length) % sectors.length);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "q" || !held.current) return;
      held.current = false;
      if (pick !== null) choose(pick);
      else hide();
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up);
    };
  }, [open, pick, show, hide, select, choose]);

  // a tap anywhere else closes it on a touch screen
  useEffect(() => {
    if (!open || !touch) return;
    const away = (e: PointerEvent) => {
      if (!wheel.current?.contains(e.target as Node)) hide();
    };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open, touch, hide]);

  /** the pointer's direction from the hub picks the segment, as a stick would */
  const aim = (e: React.PointerEvent) => {
    const box = wheel.current?.getBoundingClientRect();
    if (!box) return;
    const dx = e.clientX - box.left;
    const dy = e.clientY - (box.top + box.height / 2);
    if (Math.hypot(dx, dy) < inner * 0.55) return select(null);
    const index = Math.floor(((Math.atan2(dy, dx) * 180) / Math.PI - START) / STEP);
    select(index >= 0 && index < sectors.length ? index : null);
  };

  const picked = pick === null ? null : sectors[pick];
  return (
    <>
      {/* the scene steps back while the wheel is up */}
      <div className={cn("pointer-events-none fixed inset-0 z-[24] bg-black/40 backdrop-saturate-50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} aria-hidden />
      <nav
        aria-label={copy.indexLabel}
        className={cn("fixed top-1/2 left-0 z-[25] -translate-y-1/2 transition-opacity duration-700", !ready && "opacity-0", !open && "pointer-events-none")}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse" || held.current) return;
          closing.current = window.setTimeout(hide, 220);
        }}
      >
        {/* the tab on the edge: what there is to see, and to press, while the wheel is away */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="index-wheel"
          onClick={() => (open ? hide() : show())}
          onPointerEnter={(e) => e.pointerType === "mouse" && show()}
          className={cn(
            "pointer-events-auto absolute top-1/2 left-0 flex -translate-y-1/2 flex-col items-center gap-3 border border-l-0 border-white/15 bg-black/40 py-4 pr-1.5 pl-1 backdrop-blur-md transition-all duration-300 hover:border-arcane-hot/70",
            open && "pointer-events-none -translate-x-full opacity-0",
          )}
        >
          <span className="size-1.5 rotate-45 bg-arcane-hot shadow-[0_0_8px_var(--arcane-hot)]" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase [writing-mode:vertical-rl]">{copy.indexLabel}</span>
          {!touch && <span className="kbd">Q</span>}
        </button>
        {/* a wider strip than the tab, so the edge of the screen is enough */}
        {!touch && ready && <span className="pointer-events-auto absolute top-1/2 left-0 h-[70dvh] w-4 -translate-y-1/2" onPointerEnter={show} aria-hidden />}

        <div
          id="index-wheel"
          ref={wheel}
          inert={!open}
          onPointerMove={aim}
          className={cn(
            "relative origin-left transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
            open ? "scale-100 rotate-0 opacity-100" : "pointer-events-none scale-75 -rotate-[28deg] opacity-0",
          )}
          style={{ width: outer + 14, height: outer * 2 + 28 }}
        >
          <svg viewBox={`0 ${-outer - 14} ${outer + 14} ${outer * 2 + 28}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <radialGradient id="wheel-fill" gradientUnits="userSpaceOnUse" cx="0" cy="0" r={outer}>
                <stop offset="0.4" stopColor="#0b0818" stopOpacity="0.92" />
                <stop offset="1" stopColor="#140d2e" stopOpacity="0.78" />
              </radialGradient>
            </defs>
            {sectors.map((s, i) => {
              const active = i === pick;
              const color = toneColor[s.tone];
              return (
                <g key={s.id}>
                  <path
                    d={slice(inner, active ? outer + 10 : outer, START + i * STEP, START + (i + 1) * STEP)}
                    fill={active ? color : "url(#wheel-fill)"}
                    fillOpacity={active ? 0.3 : 1}
                    stroke={active ? color : "oklch(1 0 0 / 0.16)"}
                    strokeWidth={active ? 1.6 : 1}
                    style={{ transition: "all 0.16s ease-out", filter: active ? `drop-shadow(0 0 14px ${color})` : undefined }}
                  />
                  {/* a mark on the rim for every sector already opened */}
                  {visited.includes(s.id) && <path d={slice(outer - 5, outer - 2, START + i * STEP + 3, START + (i + 1) * STEP - 3)} fill={color} />}
                </g>
              );
            })}
            <path d={`M0 ${-inner + 8} A${inner - 8} ${inner - 8} 0 0 1 0 ${inner - 8}`} fill="#07051a" fillOpacity="0.9" stroke="oklch(1 0 0 / 0.18)" />
          </svg>

          <ol>
            {sectors.map((s, i) => {
              const mid = rad(START + (i + 0.5) * STEP);
              const r = (inner + outer) / 2 + 4;
              const active = i === pick;
              return (
                <li key={s.id} className="absolute -translate-y-1/2" style={{ left: Math.cos(mid) * r - (touch ? 44 : 56), top: outer + 14 + Math.sin(mid) * r, width: touch ? 96 : 122 }}>
                  <button
                    type="button"
                    aria-current={current === s.id}
                    onFocus={() => select(i)}
                    onClick={() => choose(i)}
                    className="flex w-full flex-col items-center gap-0.5 py-2 text-center outline-none"
                    style={{ ["--hue" as string]: toneColor[s.tone] }}
                  >
                    <span className={cn("font-mono text-[10px] tracking-[0.2em] transition-colors", active ? "text-[var(--hue)]" : "text-muted-foreground")}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("font-serif leading-none whitespace-nowrap transition-colors", touch ? "text-base" : "text-xl", active ? "text-white" : "text-foreground/75")}>{s.name}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* the hub: what the pointed segment holds */}
          <div className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2" style={{ width: inner - 22 }} aria-live="polite">
            {picked ? (
              <>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: toneColor[picked.tone] }}>
                  {nodesOfSector(picked.id).length} on record
                </p>
                <p className="mt-1 text-[11px] leading-tight text-foreground/80">{picked.section}</p>
              </>
            ) : (
              <p className="eyebrow leading-relaxed">{copy.indexLabel}</p>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
