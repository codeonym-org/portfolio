"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { converse } from "@/agent/converse";
import { executeSystemCommand } from "@/agent/system-commands";
import { activateNode } from "@/components/scene/constellation";
import { hueColor, toneColor } from "@/components/scene/view";
import { sectorById, sectors, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { recordNodes } from "@/record/nodes";
import { compactArgs, useSession } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";

interface Entry {
  id: string;
  label: string;
  sub: string;
  group: string;
  color: string;
  search: string;
  run: () => void;
}

/** a command run by the visitor's own hand is logged in the trace like any other */
function runCommand(name: string, args: Record<string, unknown> = {}) {
  const id = `you-${Date.now()}`;
  const session = useSession.getState();
  session.step({ id, name, args: compactArgs(args), source: "you" });
  void Promise.resolve(executeSystemCommand(name, args)).then(() => session.step({ id, status: "done" }));
}

const ACTIONS: { label: string; sub: string; search: string; name: string; args?: Record<string, unknown> }[] = [
  { label: "ARISE — raise every shadow", sub: "arise_all()", search: "arise all raise shadows projects", name: "arise_all" },
  { label: "Open the CV", sub: "open_cv()", search: "cv resume license pdf", name: "open_cv" },
  { label: "Download the CV", sub: "download_cv()", search: "cv resume download pdf", name: "download_cv" },
  { label: "Copy the email address", sub: 'copy_contact(channel: "email")', search: "email copy contact", name: "copy_contact", args: { channel: "email" } },
  { label: "Save a picture of the Monolith", sub: "capture_snapshot()", search: "snapshot screenshot picture photo", name: "capture_snapshot" },
  { label: "Cast: awaken", sub: 'cast_effect(effect: "awaken")', search: "effect awaken shockwave", name: "cast_effect", args: { effect: "awaken" } },
  { label: "Back to orbit", sub: "close_windows()", search: "close home orbit reset view", name: "close_windows" },
];

function buildEntries(): Entry[] {
  return [
    ...sectors.map((s, i) => ({
      id: `sector:${s.id}`,
      label: s.name,
      sub: `${String(i + 1).padStart(2, "0")} · ${s.section}`,
      group: "Sectors",
      color: toneColor[s.tone],
      search: `${s.name} ${s.section} ${s.id} ${s.description}`.toLowerCase(),
      run: () => runCommand("open_sector", { sector: s.id }),
    })),
    ...ACTIONS.map((a) => ({
      id: `action:${a.label}`,
      label: a.label,
      sub: a.sub,
      group: "Commands",
      color: toneColor.system,
      search: `${a.label} ${a.search}`.toLowerCase(),
      run: () => runCommand(a.name, a.args),
    })),
    ...recordNodes
      .filter((n) => n.kind !== "player")
      .map((n) => ({
        id: n.key,
        label: n.label,
        sub: `${sectorById[n.sector].name} · ${n.sub ?? n.kind}`,
        group: "The record",
        color: hueColor[n.hue],
        search: n.search,
        run: () => activateNode(n),
      })),
  ];
}

/**
 * ⌘K — the whole record and every command the agent has, searchable.
 * The same registry the System drives; a query that matches nothing
 * can be handed to it with Enter.
 */
export function Palette() {
  const open = useWorldStore((s) => s.paletteOpen);
  const setOpen = useWorldStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const entries = useMemo(() => buildEntries(), []);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return entries.filter((e) => e.group !== "The record");
    return entries
      .map((e) => ({ e, score: words.every((w) => e.search.includes(w)) ? (e.label.toLowerCase().startsWith(words[0]) ? 2 : 1) : 0 }))
      .filter((r) => r.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((r) => r.e);
  }, [query, entries]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  };
  const pick = (entry: Entry | undefined) => {
    play("confirm", { volume: 0.3 });
    const ask = query.trim();
    close();
    if (entry) entry.run();
    else if (ask) void converse(ask);
  };

  useEffect(() => {
    list.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-void/55 px-3 pt-[14dvh] backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-label="Search the record"
            className="glass glass-edge notch sys-panel flex max-h-[62dvh] w-full max-w-xl flex-col [--n:16px]"
            initial={{ y: -16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <Search className="size-4 shrink-0 text-arcane-hot" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(results.length - 1, c + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    pick(results[cursor]);
                  } else if (e.key === "Escape") {
                    e.stopPropagation();
                    close();
                  }
                }}
                placeholder={world.hud.paletteHint}
                aria-label={world.hud.paletteHint}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <span className="kbd">ESC</span>
            </div>
            <ul ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {results.map((entry, i) => {
                const heading = results[i - 1]?.group !== entry.group ? entry.group : null;
                return (
                  <li key={entry.id}>
                    {heading && <p className="eyebrow px-2.5 pt-2.5 pb-1">{heading}</p>}
                    <button
                      type="button"
                      data-index={i}
                      onPointerMove={() => setCursor(i)}
                      onClick={() => pick(entry)}
                      className={cn("flex w-full items-center gap-3 rounded-[2px] px-2.5 py-2 text-left", i === cursor && "bg-white/[0.06]")}
                    >
                      <span className="size-1.5 shrink-0 rotate-45" style={{ background: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground/95">{entry.label}</span>
                      <span className="max-w-[48%] truncate font-mono text-[10px] text-muted-foreground">{entry.sub}</span>
                    </button>
                  </li>
                );
              })}
              {!results.length && (
                <li className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <CornerDownLeft className="size-4 text-arcane-hot" /> Nothing by that name in the record — press Enter to ask the System.
                </li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
