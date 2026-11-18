"use client";

import { Waypoints } from "lucide-react";
import { useOpenEntry } from "./open-entry";
import { findSkill } from "@/config/skills.config";
import { play } from "@/lib/audio";
import { MapCard } from "./map-card";
import { masteryGrade, rarityTile } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import type { Card } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";

function SkillCard({ ids, title }: { ids: string[]; title?: string }) {
  const setInspect = useOpenEntry();
  const setHovered = useWorldStore((s) => s.setHovered);
  const list = ids.map((id) => findSkill(id)).filter((s): s is NonNullable<typeof s> => !!s);
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      {title && <p className="eyebrow text-system">{title}</p>}
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            onPointerEnter={() => setHovered(`skill:${s.id}`)}
            onPointerLeave={() => setHovered(null)}
            onClick={() => {
              play("click");
              setInspect({ kind: "skill", id: s.id });
            }}
            className={cn("flex items-center gap-1.5 rounded-[2px] border px-2 py-1 text-xs backdrop-blur-sm transition-shadow", rarityTile[s.rarity])}
          >
            <s.icon className="size-3.5" />
            <span className="text-foreground/90">{s.name}</span>
            <span className="font-display text-[9px]">{masteryGrade(s.mastery)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** what the System drew under its words: skill badges, the map, a way back to its case */
export function Cards({ cards }: { cards?: Card[] }) {
  const setCase = useWorldStore((s) => s.setCase);
  const open = useWorldStore((s) => s.caseFile);
  if (!cards?.length) return null;
  return (
    <div className="pointer-events-auto space-y-3">
      {cards.map((card, i) =>
        card.type === "skills" ? (
          <SkillCard key={i} ids={card.ids} title={card.title} />
        ) : card.type === "map" ? (
          <MapCard key={i} />
        ) : card.type !== "case" || open?.title === card.file.title ? null : (
          <button key={i} type="button" data-active="true" onClick={() => setCase(card.file)} className="hud-chip px-3.5 py-2 text-sm">
            <Waypoints className="size-4" /> Reopen case — {card.file.title}
          </button>
        ),
      )}
    </div>
  );
}
