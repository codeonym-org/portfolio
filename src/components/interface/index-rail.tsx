"use client";

import { toneColor } from "@/components/scene/view";
import { sectors, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { nodesOfSector } from "@/record/nodes";
import { useWorldStore } from "@/store/world-store";

/**
 * The table of contents, for visitors who would rather point than
 * ask: six sectors, keys 1–6. Hovering one lights its ring in the sky.
 */
export function IndexRail() {
  const sector = useWorldStore((s) => s.sector);
  const focused = useWorldStore((s) => !!(s.sector || s.caseFile));
  const visited = useWorldStore((s) => s.visited);
  const touch = useWorldStore((s) => s.touch);
  const ready = useWorldStore((s) => s.ready);
  const openSector = useWorldStore((s) => s.openSector);
  const setHovered = useWorldStore((s) => s.setHovered);
  if (touch && focused) return null;
  return (
    <nav
      aria-label={world.hud.indexLabel}
      className={cn(
        "pointer-events-none fixed z-20 transition-[opacity,transform] duration-700",
        touch ? "inset-x-0 top-[4.4rem]" : "top-1/2 left-[4vw] -translate-y-1/2",
        (!ready || (focused && !touch)) && "-translate-x-6 opacity-0",
      )}
    >
      {!touch && <p className="eyebrow mb-3">{world.hud.indexLabel}</p>}
      <ol className={cn("flex", touch ? "gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]" : "flex-col items-start gap-1")}>
        {sectors.map((s, i) => (
          <li key={s.id} className="shrink-0">
            <button
              type="button"
              disabled={focused && !touch}
              aria-current={sector === s.id}
              onPointerEnter={() => {
                play("hover");
                setHovered(nodesOfSector(s.id)[0].key);
              }}
              onPointerLeave={() => setHovered(null)}
              onClick={() => openSector(s.id)}
              className={cn(
                "group pointer-events-auto flex items-baseline gap-3 transition-colors",
                touch ? "hud-chip px-3 py-1.5 backdrop-blur-md" : "py-1 pr-6 text-left",
              )}
              style={{ ["--hue" as string]: toneColor[s.tone] }}
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-[var(--hue)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn("text-foreground/80 transition-colors group-hover:text-white", touch ? "text-[13px]" : "font-serif text-[1.35rem] leading-none")}>{s.name}</span>
              {!touch && <span className={cn("size-1 rotate-45 transition-colors", visited.includes(s.id) ? "bg-[var(--hue)] shadow-[0_0_8px_var(--hue)]" : "bg-white/20")} />}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
