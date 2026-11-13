"use client";

import { Plus, X } from "lucide-react";
import { toneColor } from "@/components/scene/view";
import { erebus } from "@/config/erebus.config";
import { spendPoint } from "@/erebus/game";
import { useGame } from "@/erebus/game-store";
import { useProfile } from "@/erebus/profile-store";
import { derive, hunterRank, levelOf, STAT_IDS } from "@/erebus/rules";

/** The hunter's profile: the game waits while it is open. */
export function ProfilePanel() {
  const open = useGame((s) => s.open);
  const p = useProfile();
  const { level, into, need } = levelOf(p.xp);
  const d = derive(p.stats, level);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm" onClick={() => open(null)}>
      <div className="sys-window flex max-h-[88dvh] w-[min(560px,100%)] flex-col overflow-hidden" style={{ ["--sys" as string]: toneColor.system }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your profile">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <p className="sys-head text-xs">HUNTER PROFILE</p>
          <button type="button" onClick={() => open(null)} aria-label="Close" className="grid size-7 place-items-center opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="answer-scroll overflow-y-auto px-5 py-4">
          <p className="font-[family-name:var(--font-system)] text-3xl leading-none font-semibold text-white">{p.name}</p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-arcane-hot uppercase">
            Rank {hunterRank(level)} · Level {level} · {into}/{need} XP{p.title ? ` · ${p.title}` : ""}
          </p>
          <p className="sys-heading mt-5">Stats · {p.points} {p.points === 1 ? "point" : "points"} to spend</p>
          <ul className="mt-3 space-y-2">
            {STAT_IDS.map((id) => (
              <li key={id} className="flex items-center gap-3">
                <span className="w-10 font-mono text-xs text-system">{erebus.stats[id].short}</span>
                <span className="w-8 text-right font-[family-name:var(--font-system)] text-xl font-semibold text-white">{p.stats[id]}</span>
                <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">{erebus.stats[id].effect}</span>
                <button type="button" disabled={!p.points} onClick={() => spendPoint(id)} className="hud-chip size-8 disabled:opacity-30" aria-label={`Add a point to ${erebus.stats[id].name}`}>
                  <Plus className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Health {d.maxHp} · Damage {d.damage.toFixed(0)} · Speed {d.speed.toFixed(1)} · Dash every {d.dashCd.toFixed(1)}s · Critical {(d.crit * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
