"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ArrowUpRight, Check, LayoutGrid } from "lucide-react";
import { toneColor } from "@/components/scene/view";
import { sectors, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { nodesOfSector } from "@/record/nodes";
import { useWorldStore } from "@/store/world-store";

const copy = world.hud;
const typing = (target: EventTarget | null) => !!(target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable=true]");

/** pointing at a section lights its ring in the sky */
function useAim() {
  const setHovered = useWorldStore((s) => s.setHovered);
  return (index: number | null) => {
    if (index !== null) play("hover", { volume: 0.5 });
    setHovered(index === null ? null : nodesOfSector(sectors[index].id)[0].key);
  };
}

/**
 * ── THE INDEX, IN THE HEADER ──────────────────────────────────
 * The six sections of the record as the site's own navigation,
 * beside the name at the top: each with its colour, lit when it is open, a
 * hairline under it once it has been seen. Pointing at one lights its
 * ring in the sky and says what it holds; a press opens it. Keys 1–6
 * open them from anywhere, Q puts the focus on them, ← → move along.
 */
export function SectionDock() {
  const current = useWorldStore((s) => s.sector);
  const visited = useWorldStore((s) => s.visited);
  const openSector = useWorldStore((s) => s.openSector);
  const aim = useAim();
  const bar = useRef<HTMLElement>(null);

  // Q: to the index
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "q") return;
      const el = bar.current;
      if (!el || el.offsetParent === null) return;
      e.preventDefault();
      (el.querySelector<HTMLElement>("[aria-current=page]") ?? el.querySelector<HTMLElement>("button"))?.focus();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const by = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const items = [...(bar.current?.querySelectorAll<HTMLElement>("button") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + by + items.length) % items.length]?.focus();
  };

  return (
    <nav ref={bar} aria-label={copy.indexLabel} className="hdr-dock" onKeyDown={onKey} onPointerLeave={() => aim(null)}>
      {sectors.map((s, i) => {
        const on = current === s.id;
        const count = nodesOfSector(s.id).length;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={on ? "page" : undefined}
            data-seen={visited.includes(s.id)}
            onPointerEnter={() => aim(i)}
            onFocus={() => aim(i)}
            onBlur={() => aim(null)}
            onClick={() => {
              play("open", { volume: 0.3 });
              openSector(s.id);
            }}
            className="hdr-dock__item"
            style={{ ["--hue" as string]: toneColor[s.tone] }}
          >
            <i className="hdr-dock__dot" aria-hidden />
            {s.name}
            {/* what it holds, under it while pointed at */}
            <span className="hdr-dock__tip" role="tooltip">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--hue)]">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-white/85">{s.section}</span>
              <span className="text-white/45">· {count} on record</span>
              <span className="kbd ml-1">{i + 1}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Where the header has no room for the six: one "Index" key in the
 * tools, and a panel under the header that lists them, each with what
 * it holds and a tick once seen; on a phone, the plain record under
 * them.
 */
export function SectionMenu() {
  const current = useWorldStore((s) => s.sector);
  const visited = useWorldStore((s) => s.visited);
  const openSector = useWorldStore((s) => s.openSector);
  const aim = useAim();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const key = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        key.current?.focus();
        return;
      }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "q") return;
      if (key.current?.offsetParent === null) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const away = (e: PointerEvent) => {
      if (open && !root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("pointerdown", away);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={key}
        type="button"
        aria-expanded={open}
        aria-controls="section-menu"
        aria-label={copy.indexLabel}
        title={`${copy.indexLabel} (Q)`}
        data-on={open}
        onClick={() => {
          play(open ? "close" : "open", { volume: 0.3 });
          setOpen(!open);
        }}
        className="hdr-tool"
      >
        <LayoutGrid className="size-4" />
        <span className="hdr-label">{copy.index}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id="section-menu"
            aria-label={copy.indexLabel}
            className="hdr-menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onPointerLeave={() => aim(null)}
          >
            {sectors.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={current === s.id ? "page" : undefined}
                  autoFocus={i === 0}
                  onPointerEnter={() => aim(i)}
                  onClick={() => {
                    play("open", { volume: 0.3 });
                    openSector(s.id);
                    setOpen(false);
                  }}
                  className="hdr-menu__item"
                  style={{ ["--hue" as string]: toneColor[s.tone] }}
                >
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--hue)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-white">{s.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-white/45">
                      {s.section} · {nodesOfSector(s.id).length} on record
                    </span>
                  </span>
                  {visited.includes(s.id) ? <Check className="size-3.5 text-[var(--hue)]" aria-label="seen" /> : <span className={cn("kbd hidden sm:inline-grid")}>{i + 1}</span>}
                </button>
              </li>
            ))}
            {/* on a phone the plain record has no key of its own in the header */}
            <li className="hdr-menu__foot">
              <Link href="/record" className="hdr-menu__item text-[12px] text-white/60">
                {copy.plain} (text only)
                <ArrowUpRight className="ml-auto size-3.5" />
              </Link>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
