"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, ExternalLink, X } from "lucide-react";
import { findItem, inventoryCategories } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { findGuild } from "@/config/guilds.config";
import { quests } from "@/config/quests.config";
import { findSkill, skillCategories } from "@/config/skills.config";
import type { InspectTarget, Rarity } from "@/config/types";
import { sectorById } from "@/config/world.config";
import { play } from "@/lib/audio";
import { masteryGrade, rarityBar, rarityText, rarityTile } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";

const CV_URL = "/cv.pdf";
const SEGMENTS = 20;

function Mastery({ mastery, rarity }: { mastery: number; rarity: Rarity }) {
  const filled = Math.round((mastery / 100) * SEGMENTS);
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-[8px] tracking-[0.25em] text-muted-foreground">MASTERY</span>
      <div className="flex flex-1 gap-[2px]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.15 + i * 0.02 }}
            className={cn("h-2 flex-1 skew-x-[-14deg]", i < filled ? rarityBar[rarity] : "bg-white/8")}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-white tabular-nums">{mastery}</span>
    </div>
  );
}

function Tags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="border border-system/30 bg-system/10 px-2 py-0.5 font-mono text-[10px] text-system">
          {t}
        </span>
      ))}
    </div>
  );
}

function Body({ target }: { target: InspectTarget }) {
  const setCvOpen = useWorldStore((s) => s.setCvOpen);
  const openSector = useWorldStore((s) => s.openSector);
  const setInspect = useWorldStore((s) => s.setInspect);

  if (target.kind === "skill") {
    const skill = findSkill(target.id);
    if (!skill) return null;
    const cat = skillCategories.find((c) => c.id === skill.category);
    return (
      <>
        <Header icon={<skill.icon className="size-8" strokeWidth={1.4} />} rarity={skill.rarity} kind="SKILL" title={skill.name} sub={`${cat?.name ?? ""} · GRADE ${masteryGrade(skill.mastery)}`} />
        <Mastery mastery={skill.mastery} rarity={skill.rarity} />
        <p className="text-[15px] leading-relaxed text-foreground/85 italic">“{skill.lore}”</p>
        <Tags tags={skill.tags} />
      </>
    );
  }

  if (target.kind === "item") {
    const item = findItem(target.id);
    if (!item) return null;
    const cat = inventoryCategories.find((c) => c.id === item.category);
    const use = () => {
      play("confirm");
      if (item.unlocks === "cv") return setCvOpen(true);
      if (item.unlocks) {
        setInspect(null);
        return openSector(item.unlocks);
      }
      if (item.link) window.open(item.link, "_blank", "noopener");
    };
    const usable = item.unlocks || item.link;
    return (
      <>
        <Header icon={<item.icon className="size-8" strokeWidth={1.4} />} rarity={item.rarity} kind={cat?.name ?? "ITEM"} title={item.name} sub={item.meta} />
        <p className="text-[15px] leading-relaxed text-foreground/85 italic">“{item.lore}”</p>
        <Tags tags={item.tags} />
        {usable && (
          <button type="button" data-active="true" onClick={use} className="hud-chip w-full py-3 font-display text-[11px] tracking-[0.3em]">
            USE{item.unlocks && item.unlocks !== "cv" ? ` — ${sectorById[item.unlocks].name.toUpperCase()}` : ""}
            {item.link && !item.unlocks && <ExternalLink className="size-3.5" />}
          </button>
        )}
      </>
    );
  }

  const quest = quests.find((q) => q.id === target.id);
  if (!quest) return null;
  return (
    <>
      <Header
        icon={<span className="font-display text-2xl">{quest.rank}</span>}
        rarity={quest.rank === "S" ? "legendary" : quest.rank === "A" ? "epic" : "rare"}
        kind={`${quest.type.toUpperCase()} QUEST · ${(quest.stage ?? quest.status).toUpperCase()}`}
        title={quest.name}
        sub={[findGuild(quest.guild)?.name, quest.period].filter(Boolean).join(" · ")}
      />
      <p className="text-[15px] leading-relaxed text-foreground/85">{quest.summary}</p>
      <ul className="space-y-1 text-sm text-foreground/80">
        {quest.details.map((d) => (
          <li key={d} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rotate-45 bg-arcane-hot" />
            {d}
          </li>
        ))}
      </ul>
      <Tags tags={quest.rewards} />
      {quest.link && (
        <a href={quest.link} target="_blank" rel="noreferrer" className="hud-chip w-full py-2.5 text-sm">
          <ExternalLink className="size-4" /> View source
        </a>
      )}
      {quest.docs && (
        <a href={quest.docs} target="_blank" rel="noreferrer" className="hud-chip w-full py-2.5 text-sm">
          <ExternalLink className="size-4" /> Read the docs
        </a>
      )}
    </>
  );
}

function Header({ icon, rarity, kind, title, sub }: { icon: React.ReactNode; rarity: Rarity; kind: string; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className={cn("grid size-16 shrink-0 place-items-center border", rarityTile[rarity])}>{icon}</span>
      <div className="min-w-0 flex-1 pr-8">
        <p className={cn("font-display text-[9px] tracking-[0.3em] uppercase", rarityText[rarity])}>
          ◆ {rarity} · {kind}
        </p>
        <h3 className="mt-1 text-xl leading-tight font-bold text-white">{title}</h3>
        {sub && <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{sub}</p>}
      </div>
    </div>
  );
}

/** game-style detail card for a skill, item or quest */
export function InspectCard() {
  const target = useWorldStore((s) => s.inspect);
  const setInspect = useWorldStore((s) => s.setInspect);
  return (
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-void/60 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setInspect(null)}
        >
          <motion.div
            key={`${target.kind}:${target.id}`}
            role="dialog"
            aria-label="Inspect"
            className="glass glass-edge notch sys-panel relative w-full max-w-md space-y-4 p-6 [--n:16px]"
            initial={{ scale: 0.85, rotateX: 18, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sys-panel__scan" />
            <button type="button" aria-label="Close" onClick={() => setInspect(null)} className="hud-chip absolute top-4 right-4 size-8">
              <X className="size-4" />
            </button>
            <Body target={target} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** the Hunter's License projected: the full CV */
export function CvModal() {
  const open = useWorldStore((s) => s.cvOpen);
  const setOpen = useWorldStore((s) => s.setCvOpen);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[52] grid place-items-center bg-void/75 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Official record"
            className="glass glass-edge notch sys-panel flex h-full max-h-[900px] w-full max-w-4xl flex-col [--n:18px]"
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-arcane/20 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[9px] tracking-[0.35em] text-rank-s">OFFICIAL RECORD · HUNTER&apos;S LICENSE</p>
                <p className="truncate font-semibold text-white">{player.name} — {player.job}</p>
              </div>
              <a href={CV_URL} download="bouarour-ayoub-cv.pdf" className="hud-chip px-3 py-2 text-sm">
                <Download className="size-4" /> <span className="hidden sm:inline">Download</span>
              </a>
              <a href={CV_URL} target="_blank" rel="noreferrer" className="hud-chip px-3 py-2 text-sm">
                <ExternalLink className="size-4" />
              </a>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="hud-chip size-9">
                <X className="size-4" />
              </button>
            </header>
            <iframe title="CV" src={`${CV_URL}#view=FitH`} className="min-h-0 w-full flex-1 bg-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
