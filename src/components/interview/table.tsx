"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import type { Place } from "./stage";

const copy = world.interview.table;

export interface Exhibit {
  id: string;
  /** what it is ("Section", "Skill") */
  kind: string;
  title: string;
  body: ReactNode;
  close: () => void;
}

/**
 * ── ON THE TABLE ──────────────────────────────────────────────
 * Everything he shows or opens lands in one panel on his right, one
 * at a time, each behind a tab: the newest in front, the others a
 * press away, each put away by its cross. Nothing piles up and
 * nothing covers his face. On a phone it is a sheet that slides up
 * over the conversation when he shows something, and back down.
 */
export function Table({
  place,
  wide,
  items,
  selected,
  onSelect,
  open,
  onDismiss,
}: {
  place: Place;
  wide: boolean;
  items: readonly Exhibit[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** on a phone: the sheet is up */
  open: boolean;
  onDismiss: () => void;
}) {
  const tabs = useRef<HTMLDivElement>(null);
  const current = items.find((i) => i.id === selected) ?? items.at(-1);
  const visible = items.length > 0 && (wide || open);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const at = items.findIndex((i) => i.id === current?.id);
    const next = items[(at + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    if (!next) return;
    e.preventDefault();
    onSelect(next.id);
    tabs.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(next.id)}"]`)?.focus();
  };

  return (
    <AnimatePresence>
      {visible && current && (
        <motion.section
          key="table"
          aria-label={copy.label}
          className="stage-panel stage-table pointer-events-auto fixed z-[1] flex flex-col"
          data-wide={wide}
          style={
            wide
              ? { left: place.left, width: place.width, top: place.top, maxHeight: `calc(100dvh - ${place.top + place.bottom}px)` }
              : { left: place.left, width: place.width, top: place.top, bottom: place.bottom }
          }
          initial={wide ? { opacity: 0, x: 28 } : { opacity: 0, y: "30%" }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={wide ? { opacity: 0, x: 28, transition: { duration: 0.2 } } : { opacity: 0, y: "30%", transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 230, damping: 28 }}
        >
          <header className="table-head">
            <span className="table-dot" aria-hidden />
            <p className="table-label">{copy.label}</p>
            <span className="table-count">{items.length}</span>
            {!wide && (
              <button type="button" className="talk-icon" title={copy.back} aria-label={copy.back} onClick={onDismiss}>
                <ChevronDown className="size-4" />
              </button>
            )}
          </header>

          <div ref={tabs} role="tablist" aria-label={copy.label} className="table-tabs" onKeyDown={onKey}>
            {items.map((item) => {
              const on = item.id === current.id;
              return (
                <div key={item.id} className="table-tab" data-on={on}>
                  <button
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    data-tab={item.id}
                    aria-selected={on}
                    aria-controls="table-body"
                    tabIndex={on ? 0 : -1}
                    onClick={() => {
                      if (!on) play("click", { volume: 0.3 });
                      onSelect(item.id);
                    }}
                    className="table-tab__pick"
                  >
                    <span className="table-tab__kind">{item.kind}</span>
                    <span className="table-tab__title">{item.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${copy.close}: ${item.title}`}
                    title={copy.close}
                    className="table-tab__close"
                    onClick={() => {
                      play("close", { volume: 0.3 });
                      item.close();
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div id="table-body" role="tabpanel" aria-labelledby={`tab-${current.id}`} className={cn("table-body")}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
                {current.body}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
