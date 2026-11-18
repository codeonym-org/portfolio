"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import type { Place } from "./stage";

const copy = world.interview.table;

export interface Exhibit {
  id: string;
  /** what it is ("Section", "Skill") */
  kind: string;
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  /** the question it answered; null when it was there before the first */
  turn: string | null;
  /** when it came */
  at: number;
  close: () => void;
}

/** a question that put something on the table */
export interface Asked {
  n: number;
  you: string;
}

interface Group {
  turn: string | null;
  items: Exhibit[];
}

/** the things on the table by the question that brought them, in the order they came */
function grouped(items: readonly Exhibit[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const g = groups.find((x) => x.turn === item.turn);
    if (g) g.items.push(item);
    else groups.push({ turn: item.turn, items: [item] });
  }
  return groups;
}

/**
 * ── ON THE TABLE ──────────────────────────────────────────────
 * Everything he shows or opens during the conversation lands in one
 * panel on his right, and stays there until it is put away. One thing
 * is read at a time; once there are several, a rail on the panel's
 * outer edge switches between them, by the question that brought
 * them: this question's things lit and named at the top, each earlier
 * question folded into one mark with how many it brought, unfolded on
 * a press. The arrows under the page, or the keys, step through all
 * of them in order. On a phone it is a sheet that slides up over the
 * conversation, the rail a row across its top.
 */
export function Table({
  place,
  wide,
  items,
  selected,
  onSelect,
  open,
  onDismiss,
  current,
  asked,
}: {
  place: Place;
  wide: boolean;
  /** oldest first */
  items: readonly Exhibit[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** on a phone: the sheet is up */
  open: boolean;
  onDismiss: () => void;
  /** the question in progress */
  current: string | null;
  asked: (turn: string) => Asked | undefined;
}) {
  const rail = useRef<HTMLElement>(null);
  const front = items.find((i) => i.id === selected) ?? items.at(-1);
  const at = front ? items.indexOf(front) : -1;
  const visible = items.length > 0 && (wide || open);
  const groups = grouped(items);
  const now = groups.find((g) => g.turn === current && current !== null);
  const earlier = groups.filter((g) => g !== now).reverse();
  // the earlier question unfolded on the rail: the one whose thing is in front, unless another was asked for
  const [unfolded, setUnfolded] = useState<{ turn: string | null; for: string | undefined } | null>(null);
  const shownTurn = unfolded && unfolded.for === front?.id ? unfolded.turn : front?.turn;

  const pick = (id: string) => {
    if (id !== front?.id) play("click", { volume: 0.3 });
    onSelect(id);
  };
  const step = (by: 1 | -1) => {
    const next = items[(at + by + items.length) % items.length];
    if (next) pick(next.id);
    return next;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const keys = wide ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
    const by = e.key === keys[0] ? 1 : e.key === keys[1] ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const next = step(by);
    if (next) requestAnimationFrame(() => rail.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(next.id)}"]`)?.focus());
  };

  const tile = (item: Exhibit, small = false) => {
    const on = item.id === front?.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        data-item={item.id}
        aria-current={on ? "true" : undefined}
        tabIndex={on ? 0 : -1}
        title={`${item.kind} · ${item.title}`}
        onClick={() => pick(item.id)}
        className={cn("rail-item", small && "rail-item--small")}
        data-on={on}
      >
        <Icon className="rail-item__icon" aria-hidden />
        <span className="rail-item__title">{item.title}</span>
      </button>
    );
  };

  const multiple = items.length > 1;
  const Kind = front?.icon;

  return (
    <AnimatePresence>
      {visible && front && (
        <motion.section
          key="table"
          aria-label={copy.label}
          className="stage-panel stage-table pointer-events-auto fixed z-[1] flex"
          data-wide={wide}
          style={
            wide
              ? { left: place.left, width: place.width, top: place.top, maxHeight: `calc(100dvh - ${place.top + place.bottom}px)` }
              : { left: place.left, width: place.width, top: place.top, bottom: place.bottom, flexDirection: "column" }
          }
          initial={wide ? { opacity: 0, x: 28 } : { opacity: 0, y: "30%" }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={wide ? { opacity: 0, x: 28, transition: { duration: 0.2 } } : { opacity: 0, y: "30%", transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 230, damping: 28 }}
        >
          <div className="table-main">
            <header className="table-head">
              {Kind && (
                <span className="table-head__icon" aria-hidden>
                  <Kind className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="table-head__kind">
                  {front.kind}
                  {front.turn && asked(front.turn) && <span> · {copy.from(asked(front.turn)!.n)}</span>}
                </p>
                <h2 className="table-head__title">{front.title}</h2>
              </div>
              <button
                type="button"
                className="talk-icon"
                aria-label={`${copy.close}: ${front.title}`}
                title={copy.close}
                onClick={() => {
                  play("close", { volume: 0.3 });
                  front.close();
                }}
              >
                <X className="size-4" />
              </button>
              {!wide && (
                <button type="button" className="talk-icon" title={copy.back} aria-label={copy.back} onClick={onDismiss}>
                  <ChevronDown className="size-4" />
                </button>
              )}
            </header>

            {/* on a phone the rail is a row under the head */}
            {!wide && multiple && (
              <nav ref={rail} aria-label={copy.label} className="table-strip" onKeyDown={onKey}>
                {[...(now ? [now] : []), ...earlier].map((g, n) => (
                  <div key={g.turn ?? "before"} className="table-strip__group" data-now={g === now}>
                    {n > 0 && <i className="table-strip__sep" aria-hidden />}
                    {g.items
                      .slice()
                      .reverse()
                      .map((i) => tile(i))}
                  </div>
                ))}
              </nav>
            )}

            <div id="table-body" role="region" aria-label={front.title} className="table-body">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={front.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {front.body}
                </motion.div>
              </AnimatePresence>
            </div>

            {multiple && (
              <footer className="table-foot">
                <button type="button" className="talk-icon" aria-label={copy.prev} title={copy.prev} onClick={() => step(-1)}>
                  <ChevronLeft className="size-4" />
                </button>
                <span className="table-foot__at" aria-live="polite">
                  {at + 1} / {items.length}
                </span>
                <button type="button" className="talk-icon" aria-label={copy.next} title={copy.next} onClick={() => step(1)}>
                  <ChevronRight className="size-4" />
                </button>
              </footer>
            )}
          </div>

          {/* beside his face: the rail on the panel's outer edge */}
          {wide && multiple && (
            <nav ref={rail} aria-label={copy.label} className="table-rail" onKeyDown={onKey}>
              {now && (
                <div className="table-rail__group" data-now="true">
                  <p className="table-rail__label">{copy.now}</p>
                  {now.items.map((i) => tile(i))}
                </div>
              )}
              {earlier.length > 0 && (
                <div className="table-rail__group">
                  <p className="table-rail__label">{copy.earlier}</p>
                  {earlier.map((g) => {
                    const q = g.turn ? asked(g.turn) : undefined;
                    const expanded = shownTurn === g.turn;
                    return (
                      <div key={g.turn ?? "before"} className="table-rail__q" data-open={expanded}>
                        <button
                          type="button"
                          className="rail-q"
                          aria-expanded={expanded}
                          title={q ? q.you : copy.before}
                          onClick={() => setUnfolded({ turn: expanded ? "" : g.turn, for: front.id })}
                        >
                          <span className="rail-q__n">{q ? `Q${q.n}` : "·"}</span>
                          <span className="rail-q__count">{g.items.length}</span>
                        </button>
                        {expanded && g.items.map((i) => tile(i, true))}
                      </div>
                    );
                  })}
                </div>
              )}
            </nav>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
