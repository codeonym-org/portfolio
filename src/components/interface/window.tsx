"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Waypoints, X } from "lucide-react";
import type { SectorId } from "@/config/types";
import { sectorById, sectors } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { toneColor } from "@/components/scene/view";
import { CasePanel } from "./case-panel";
import { ArsenalPanel, ChroniclePanel, GatePanel, ShadowsPanel, StatusPanel, VaultPanel } from "./sector-panels";

const BODY: Record<SectorId, () => ReactNode> = {
  status: StatusPanel,
  experience: ChroniclePanel,
  projects: ShadowsPanel,
  skills: ArsenalPanel,
  inventory: VaultPanel,
  contact: GatePanel,
};

/**
 * The window beside the Monolith: a sector of the record, or the case
 * the System assembled. It slides in from the right (desktop) or
 * rises as a sheet above the prompt (touch); the scene slides its
 * framing clear of it, so the halo and the window read together.
 */
export function FocusWindow() {
  const sector = useWorldStore((s) => s.sector);
  const caseFile = useWorldStore((s) => s.caseFile);
  const touch = useWorldStore((s) => s.touch);
  const openSector = useWorldStore((s) => s.openSector);
  const closeFocus = useWorldStore((s) => s.closeFocus);
  const scroller = useRef<HTMLDivElement>(null);

  const key = caseFile ? `case:${caseFile.title}` : sector;
  useEffect(() => {
    if (!key) return;
    play("open");
    scroller.current?.scrollTo({ top: 0 });
  }, [key]);

  const def = sector ? sectorById[sector] : null;
  const Body = sector ? BODY[sector] : null;
  const tone = caseFile ? toneColor.system : def ? toneColor[def.tone] : toneColor.arcane;
  const close = () => {
    play("close");
    closeFocus();
    if (caseFile && window.location.hash.startsWith("#case=")) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  return (
    <AnimatePresence>
      {key && (
        <motion.aside
          key="window"
          role="dialog"
          aria-label={caseFile ? `Case file — ${caseFile.title}` : `${def?.name} — ${def?.section}`}
          className={cn(
            "glass glass-edge notch sys-panel pointer-events-auto fixed z-40 flex flex-col [--n:20px]",
            touch ? "inset-x-2 bottom-[4.6rem] h-[56dvh]" : "top-20 right-[2vw] bottom-6 w-[min(600px,44vw)]",
          )}
          initial={touch ? { y: "110%" } : { x: 90, opacity: 0 }}
          animate={touch ? { y: 0 } : { x: 0, opacity: 1 }}
          exit={touch ? { y: "110%" } : { x: 70, opacity: 0 }}
          transition={{ type: "spring", stiffness: 210, damping: 28 }}
        >
          <div key={key} className="sys-panel__scan" />
          <nav aria-label="Sectors" className="flex items-stretch border-b border-white/[0.07] pr-10">
            {sectors.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-current={!caseFile && sector === s.id}
                title={`${s.name} — ${s.section}`}
                onClick={() => openSector(s.id)}
                className={cn(
                  "group relative flex-1 py-2.5 font-mono text-[10px] tracking-[0.18em] transition-colors",
                  !caseFile && sector === s.id ? "text-white" : "text-muted-foreground/70 hover:text-white",
                )}
              >
                {String(i + 1).padStart(2, "0")}
                <span className="hidden lg:inline"> {s.id.slice(0, 4).toUpperCase()}</span>
                {!caseFile && sector === s.id && <motion.span layoutId="tab" className="absolute inset-x-2 -bottom-px h-px" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />}
              </button>
            ))}
          </nav>
          <header className="relative flex items-start gap-4 px-5 pt-5 pb-4 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="eyebrow flex items-center gap-2" style={{ color: tone }}>
                {caseFile ? (
                  <>
                    <Waypoints className="size-3.5" /> Case file · {caseFile.evidence.length} pieces of evidence
                  </>
                ) : (
                  def?.section
                )}
              </p>
              <h2 className="mt-1.5 font-serif text-[2rem] leading-none text-white sm:text-[2.4rem]">{caseFile ? caseFile.title : def?.name}</h2>
              {!caseFile && <p className="mt-1.5 text-sm text-muted-foreground italic">{def?.epithet}</p>}
            </div>
            <button type="button" aria-label="Close" onClick={close} className="hud-chip size-9 shrink-0">
              <X className="size-4" />
            </button>
          </header>
          <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-6 sm:px-7">
            <div key={key}>{caseFile ? <CasePanel file={caseFile} /> : Body && <Body />}</div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
