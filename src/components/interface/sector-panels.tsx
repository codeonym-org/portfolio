"use client";

import { GithubMark, LinkedinMark } from "@/components/system/brand-marks";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { achievements, chronicle } from "@/config/chronicle.config";
import { inventoryCategories, inventoryItems } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { findGuild, guilds } from "@/config/guilds.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skillSets, skills } from "@/config/skills.config";
import type { Quest, QuestRank } from "@/config/types";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { masteryGrade, rarityBar, rarityText, rarityTile } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { MapCard } from "./map-card";

/* ── shared bits ─────────────────────────────────────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.section variants={rise} className={cn("space-y-3", className)}>
      <h3 className="sys-heading">{title}</h3>
      {children}
    </motion.section>
  );
}

function Stack({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-7">
      {children}
    </motion.div>
  );
}

const rankRing: Record<QuestRank, string> = {
  S: "text-rank-s border-rank-s/60 shadow-[0_0_14px_var(--rank-s)]",
  A: "text-arcane-hot border-arcane/60 shadow-[0_0_12px_var(--arcane)]",
  B: "text-system border-system/60 shadow-[0_0_10px_var(--system)]",
};

function Chip({ children, tone = "arcane" }: { children: React.ReactNode; tone?: "arcane" | "system" | "gold" }) {
  const c = {
    arcane: "border-arcane/35 bg-arcane/10 text-arcane-hot",
    system: "border-system/35 bg-system/10 text-system",
    gold: "border-rank-s/40 bg-rank-s/10 text-rank-s",
  }[tone];
  return <span className={cn("inline-flex items-center border px-2 py-0.5 font-mono text-[10px] tracking-wide", c)}>{children}</span>;
}

/* ── PROFILE ─────────────────────────────── */

/** the six core stats as a hexagonal radar */
function StatRadar() {
  const stats = player.stats;
  const n = stats.length;
  const R = 78;
  const pt = (i: number, v: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * R * v, Math.sin(a) * R * v] as const;
  };
  const poly = (v: (i: number) => number) => stats.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[210px_1fr]">
      <svg viewBox="-110 -105 220 210" className="mx-auto w-full max-w-[230px]">
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon key={k} points={poly(() => k)} fill="none" stroke="var(--arcane)" strokeOpacity={0.18 + k * 0.1} strokeWidth="0.8" />
        ))}
        {stats.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke="var(--arcane)" strokeOpacity="0.2" />;
        })}
        <motion.polygon
          points={poly((i) => stats[i].value / 100)}
          fill="var(--arcane)"
          fillOpacity="0.28"
          stroke="var(--arcane-hot)"
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.3 }}
          style={{ filter: "drop-shadow(0 0 8px var(--arcane))" }}
        />
        {stats.map((s, i) => {
          const [x, y] = pt(i, 1.2);
          return (
            <text key={s.code} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-system font-display text-[10px]">
              {s.code}
            </text>
          );
        })}
      </svg>
      <ul className="space-y-2">
        {stats.map((s) => (
          <li key={s.code} className="flex items-center gap-3 text-sm">
            <span className="w-9 font-display text-[10px] text-system">{s.code}</span>
            <span className="min-w-0 flex-1 truncate text-foreground/85">{s.label}</span>
            <span className="font-mono text-xs text-white tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusPanel() {
  return (
    <Stack>
      <motion.div variants={rise} className="flex flex-wrap items-end gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[9px] tracking-[0.35em] text-muted-foreground">{player.handle.toUpperCase()}</p>
          <h3 className="mt-1 font-display text-2xl leading-tight text-white text-glow-arcane sm:text-3xl">
            {player.name}
          </h3>
          <p className="mt-1.5 font-display text-[10px] tracking-[0.22em] text-system">
            {player.job.toUpperCase()} · {player.title.toUpperCase()}
          </p>
        </div>
      </motion.div>

      <motion.div variants={rise} className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        {[
          { k: "ORGANISATIONS", v: guilds.map((g) => `${g.name} (${g.role})`).join(" · ") },
          { k: "BASED IN", v: player.location },
          { k: "LANGUAGES", v: player.languages.map((l) => l.name).join(" · ") },
        ].map((f) => (
          <div key={f.k} className="border-l-2 border-arcane/50 bg-arcane/5 px-3 py-2">
            <p className="font-display text-[8px] tracking-[0.3em] text-muted-foreground">{f.k}</p>
            <p className="mt-0.5 font-semibold text-foreground/90">{f.v}</p>
          </div>
        ))}
      </motion.div>

      <Section title="Strengths">
        <StatRadar />
      </Section>

      <Section title="Known for">
        <div className="grid gap-2 sm:grid-cols-2">
          {player.titles.map((t) => (
            <div key={t.id} className="glass-edge notch relative bg-rank-s/5 px-3 py-2.5 [--n:8px]">
              <p className="font-display text-[10px] tracking-[0.15em] text-rank-s text-glow-gold">{t.name.toUpperCase()}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="About">
        <div className="space-y-2.5 text-[15px] leading-relaxed text-foreground/85">
          {player.profile.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <blockquote className="relative mt-2 border-l-2 border-arcane-hot/70 bg-arcane/5 py-3 pr-3 pl-4 text-[15px] italic leading-relaxed text-foreground/85">
          “{player.creed}”
        </blockquote>
      </Section>
    </Stack>
  );
}

/* ── EXPERIENCE · experience & education ──────────────────── */

export function ChroniclePanel() {
  return (
    <Stack>
      <Section title="Experience">
        <ol className="relative space-y-5 pl-6">
          <span className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-rank-s via-arcane/60 to-transparent" />
          {chronicle.map((c, i) => (
            <motion.li key={c.id} variants={rise} className="relative">
              <span className={cn("absolute top-1.5 -left-6 size-3.5 rotate-45 border", i === 0 ? "border-rank-s bg-rank-s/40 shadow-[0_0_12px_var(--rank-s)]" : "border-arcane bg-arcane/30")} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h4 className="text-lg font-bold leading-tight text-white">{c.role}</h4>
                <span className="font-mono text-[11px] text-rank-s">{c.period}</span>
              </div>
              <p className="text-sm text-system">{c.organization}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{c.summary}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {c.highlights.map((h) => (
                  <Chip key={h}>{h}</Chip>
                ))}
              </div>
            </motion.li>
          ))}
        </ol>
      </Section>
      <Section title="Education">
        <div className="grid gap-2">
          {achievements.map((a) => (
            <div key={a.id} className="glass-edge notch relative flex items-center gap-3 bg-rank-s/5 px-3 py-3 [--n:8px]">
              <span className="grid size-9 shrink-0 rotate-45 place-items-center border border-rank-s/60 bg-rank-s/15">
                <span className="-rotate-45 font-display text-[10px] text-rank-s">✦</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight text-white">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.issuer}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-rank-s">{a.period}</span>
            </div>
          ))}
        </div>
      </Section>
    </Stack>
  );
}

/* ── PROJECTS ──────────────────────────────── */

function QuestCard({ quest }: { quest: Quest }) {
  const setInspect = useWorldStore((s) => s.setInspect);
  const setHovered = useWorldStore((s) => s.setHovered);
  const onDisplay = useWorldStore((s) => s.chosen === quest.id);
  return (
    <motion.article
      variants={rise}
      layout
      onPointerEnter={() => setHovered(`quest:${quest.id}`)}
      onPointerLeave={() => setHovered(null)}
      aria-current={onDisplay || undefined}
      className={cn("glass-edge notch relative overflow-hidden bg-arcane/10 px-4 py-4 transition-colors [--n:10px]", onDisplay && "on-display")}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center border font-display text-sm", rankRing[quest.rank])}>{quest.rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold leading-tight text-white">{quest.name}</h4>
            <Chip tone={quest.stage === "released" ? "system" : quest.status === "ongoing" ? "gold" : "system"}>{(quest.stage ?? (quest.status === "ongoing" ? "ongoing" : "delivered")).toUpperCase()}</Chip>
            {onDisplay && <Chip tone="gold">ON DISPLAY</Chip>}
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">{[findGuild(quest.guild)?.name, quest.period].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">{quest.summary}</p>
      <div className="mt-3 space-y-3">
        <ul className="space-y-1 text-sm text-foreground/80">
          {quest.details.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rotate-45 bg-arcane-hot" />
              {d}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {quest.rewards.map((r) => (
            <Chip key={r} tone="system">{r}</Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setInspect({ kind: "quest", id: quest.id })} className="hud-chip px-3 py-1.5 text-xs">
            Details
          </button>
          {quest.link && (
            <a href={quest.link} target="_blank" rel="noreferrer" className="hud-chip px-3 py-1.5 text-xs">
              <ExternalLink className="size-3.5" /> Source
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function ShadowsPanel() {
  const main = quests.filter((q) => q.type === "main");
  const side = quests.filter((q) => q.type === "side");
  return (
    <Stack>
      <Section title="At OpenSNZ-Technology">
        <div className="space-y-3">
          {main.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      </Section>
      {guilds
        .filter((g) => side.some((q) => q.guild === g.id))
        .map((g) => (
          <Section key={g.id} title={`${g.name} · ${g.role}`}>
            <p className="-mt-1 mb-3 text-sm text-muted-foreground">{g.summary}</p>
            <div className="space-y-3">
              {side
                .filter((q) => q.guild === g.id)
                .map((q) => (
                  <QuestCard key={q.id} quest={q} />
                ))}
            </div>
          </Section>
        ))}
    </Stack>
  );
}

/* ── SKILLS ──────────────────────────────────────── */

export function ArsenalPanel() {
  const setInspect = useWorldStore((s) => s.setInspect);
  const setHovered = useWorldStore((s) => s.setHovered);
  return (
    <Stack>
      {skillSets.map((set) => (
        <Section key={set.id} title={set.name}>
          <p className="-mt-1 font-mono text-[11px] text-muted-foreground">{set.blurb}</p>
          <div className="space-y-5">
            {skillCategories
              .filter((c) => c.set === set.id)
              .map((cat) => (
                <div key={cat.id}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/90">
                    <cat.icon className="size-4 text-arcane-hot" /> {cat.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {skills
                      .filter((s) => s.category === cat.id)
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onPointerEnter={() => {
                            play("hover");
                            setHovered(`skill:${s.id}`);
                          }}
                          onPointerLeave={() => setHovered(null)}
                          onClick={() => {
                            play("blade", { volume: 0.35 });
                            setInspect({ kind: "skill", id: s.id });
                          }}
                          className={cn("group relative flex flex-col gap-1.5 border px-2.5 py-2 text-left transition-all hover:-translate-y-0.5", rarityTile[s.rarity])}
                        >
                          <span className="flex items-center gap-2">
                            <s.icon className="size-4 shrink-0" strokeWidth={1.6} />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/90">{s.name}</span>
                            <span className={cn("font-display text-[10px]", rarityText[s.rarity])}>{masteryGrade(s.mastery)}</span>
                          </span>
                          <span className="block h-1 bg-white/5">
                            <span className={cn("block h-full", rarityBar[s.rarity])} style={{ width: `${s.mastery}%` }} />
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </Section>
      ))}
    </Stack>
  );
}

/* ── VAULT · inventory & CV ────────────────────────────── */

export function VaultPanel() {
  const setInspect = useWorldStore((s) => s.setInspect);
  const setHovered = useWorldStore((s) => s.setHovered);
  const setCvOpen = useWorldStore((s) => s.setCvOpen);
  const license = inventoryItems.find((i) => i.unlocks === "cv");
  return (
    <Stack>
      {license && (
        <motion.div variants={rise} className="glass-edge notch relative overflow-hidden bg-gradient-to-br from-rank-s/15 via-transparent to-arcane/10 p-4 [--n:12px]">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center border border-rank-s/60 bg-rank-s/10 shadow-[0_0_24px_var(--rank-s)]">
              <license.icon className="size-7 text-rank-s" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[9px] tracking-[0.3em] text-rank-s">CURRICULUM VITAE</p>
              <h4 className="mt-0.5 text-lg font-bold text-white">{license.name}</h4>
              <p className="mt-1 text-sm leading-relaxed text-foreground/75">{license.lore}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" data-active="true" onClick={() => { play("coins"); setCvOpen(true); }} className="hud-chip px-5 py-2.5 font-display text-[10px] tracking-[0.25em]">
              <FileText className="size-4" /> VIEW THE CV
            </button>
            <a href="/cv.pdf" download="bouarour-ayoub-cv.pdf" className="hud-chip px-4 py-2.5 text-sm">
              <Download className="size-4" /> Download CV
            </a>
          </div>
        </motion.div>
      )}
      {inventoryCategories.map((cat) => (
        <Section key={cat.id} title={cat.name}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {inventoryItems
              .filter((i) => i.category === cat.id)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.name}
                  onPointerEnter={() => {
                    play("hover");
                    setHovered(`item:${item.id}`);
                  }}
                  onPointerLeave={() => setHovered(null)}
                  onClick={() => {
                    play("click");
                    setInspect({ kind: "item", id: item.id });
                  }}
                  className={cn("group flex aspect-square flex-col items-center justify-center gap-2 border p-2 text-center transition-all hover:-translate-y-0.5", rarityTile[item.rarity])}
                >
                  <item.icon className="size-7" strokeWidth={1.4} />
                  <span className="line-clamp-2 text-[11px] leading-tight font-semibold text-foreground/85">{item.name}</span>
                </button>
              ))}
          </div>
        </Section>
      ))}
    </Stack>
  );
}

/* ── CONTACT ────────────────────────────────── */

export function GatePanel() {
  const [copied, setCopied] = useState(false);
  const channels = [
    { id: "email", label: "Send a message", value: player.links.email, href: `mailto:${player.links.email}`, icon: Mail, tone: "text-arcane-hot" },
    { id: "phone", label: "Call", value: player.links.phone, href: `tel:${player.links.phone.replace(/[^+\d]/g, "")}`, icon: Phone, tone: "text-rank-s" },
    { id: "linkedin", label: "LinkedIn", value: player.links.linkedin.replace(/^https?:\/\/(www\.)?/, ""), href: player.links.linkedin, icon: LinkedinMark, tone: "text-system" },
    { id: "github", label: "GitHub", value: player.links.github.replace(/^https?:\/\//, ""), href: player.links.github, icon: GithubMark, tone: "text-foreground" },
  ];
  return (
    <Stack>
      <motion.p variants={rise} className="text-[15px] leading-relaxed text-foreground/85">
        Any channel below reaches <span className="font-semibold text-white">{player.name}</span>: agentic systems, multi-agent architectures, or just a good conversation about AI.
      </motion.p>
      <motion.div variants={rise} className="grid gap-2.5">
        {channels.map((c) => (
          <a
            key={c.id}
            href={c.href}
            target={c.id === "email" || c.id === "phone" ? undefined : "_blank"}
            rel="noreferrer"
            onPointerEnter={() => play("hover")}
            onClick={() => play("portal")}
            className="glass-edge notch group relative flex items-center gap-4 bg-white/[0.03] px-4 py-4 transition-colors hover:bg-arcane/15 [--n:10px]"
          >
            <span className="grid size-11 shrink-0 place-items-center border border-arcane/40 bg-arcane/10 transition-transform group-hover:scale-110">
              <c.icon className={cn("size-5", c.tone)} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[9px] tracking-[0.3em] text-muted-foreground">{c.label.toUpperCase()}</span>
              <span className="block truncate text-base font-semibold text-white">{c.value}</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </a>
        ))}
      </motion.div>
      <motion.div variants={rise} className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(player.links.email).then(() => {
              setCopied(true);
              play("confirm");
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
          className="hud-chip px-4 py-2 text-sm"
        >
          <Copy className="size-4" /> {copied ? "Copied!" : "Copy email"}
        </button>
        <a href="/cv.pdf" download="bouarour-ayoub-cv.pdf" className="hud-chip px-4 py-2 text-sm">
          <Download className="size-4" /> Download CV
        </a>
      </motion.div>
      <motion.div variants={rise} className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4 text-arcane-hot" /> {player.location} · {player.languages.map((l) => `${l.name} (${l.grade})`).join(" · ")}
      </motion.div>
      <motion.div variants={rise}>
        <MapCard />
      </motion.div>
      <motion.p variants={rise} className="border-t border-arcane/15 pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
        {world.credits}
      </motion.p>
    </Stack>
  );
}
