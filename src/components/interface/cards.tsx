"use client";

import { FileText, Mail, Waypoints } from "lucide-react";
import { GithubMark, LinkedinMark } from "@/components/system/brand-marks";
import { player } from "@/config/player.config";
import { findSkill } from "@/config/skills.config";
import { play } from "@/lib/audio";
import { masteryGrade, rarityTile } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import type { Card } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";

const LINKS = [
  { id: "email", label: "Email", icon: Mail, href: `mailto:${player.links.email}` },
  { id: "linkedin", label: "LinkedIn", icon: LinkedinMark, href: player.links.linkedin },
  { id: "github", label: "GitHub", icon: GithubMark, href: player.links.github },
  { id: "cv", label: "CV (PDF)", icon: FileText, href: "/cv.pdf" },
] as const;

function ContactCard({ ids }: { ids?: string[] }) {
  const shown = LINKS.filter((l) => !ids?.length || ids.includes(l.id));
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((l) => (
        <a
          key={l.id}
          href={l.href}
          target={l.id === "email" ? undefined : "_blank"}
          rel="noreferrer noopener"
          onClick={() => play("click")}
          className="hud-chip px-3.5 py-2 text-sm"
        >
          <l.icon className="size-4 text-system" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

function SkillCard({ ids, title }: { ids: string[]; title?: string }) {
  const setInspect = useWorldStore((s) => s.setInspect);
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

/** what the System drew under its words: contact buttons, skill badges, a way back to its case */
export function Cards({ cards }: { cards?: Card[] }) {
  const setCase = useWorldStore((s) => s.setCase);
  const open = useWorldStore((s) => s.caseFile);
  if (!cards?.length) return null;
  return (
    <div className="pointer-events-auto space-y-3">
      {cards.map((card, i) =>
        card.type === "contact" ? (
          <ContactCard key={i} ids={card.links} />
        ) : card.type === "skills" ? (
          <SkillCard key={i} ids={card.ids} title={card.title} />
        ) : open?.title === card.file.title ? null : (
          <button key={i} type="button" data-active="true" onClick={() => setCase(card.file)} className="hud-chip px-3.5 py-2 text-sm">
            <Waypoints className="size-4" /> Reopen case — {card.file.title}
          </button>
        ),
      )}
    </div>
  );
}
