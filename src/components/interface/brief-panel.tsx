"use client";

import { Download, FileText, Mail, Phone } from "lucide-react";
import { ProjectGlyph, TIER_ORDER, tierLabel } from "./project-glyph";
import { useOpenEntry } from "./open-entry";
import { GithubMark, LinkedinMark } from "@/components/system/brand-marks";
import { achievements, timeline } from "@/config/timeline.config";
import { organizations } from "@/config/organizations.config";
import { owner } from "@/config/owner.config";
import { projects } from "@/config/projects.config";
import { skillCategories, skills } from "@/config/skills.config";
import type { Project, ProjectTier } from "@/config/types";
import { play } from "@/lib/audio";
import { masteryLevel } from "@/lib/emphasis";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";

/**
 * ── THE BRIEF ─────────────────────────────────────────────────
 * The record in one minute, for someone who has one minute: who he
 * is, where he works, what he built, what he is best at and how to
 * reach him. No agent involved; every line opens its full entry.
 */

const tierTone: Record<ProjectTier, string> = {
  flagship: "border-gold/70 text-gold",
  major: "border-violet-hot/70 text-violet-hot",
  minor: "border-system/60 text-system",
};

const jobCategories = new Set(skillCategories.filter((c) => c.set === "job").map((c) => c.id));
const signature = skills
  .filter((s) => jobCategories.has(s.category))
  .sort((a, b) => b.mastery - a.mastery)
  .slice(0, 10);

const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="sys-heading mb-3">{children}</h3>;
}

function ProjectRow({ project }: { project: Project }) {
  const setInspect = useOpenEntry();
  const setHovered = useWorldStore((s) => s.setHovered);
  return (
    <button
      type="button"
      onClick={() => setInspect({ kind: "project", id: project.id })}
      onPointerEnter={() => setHovered(`project:${project.id}`)}
      onPointerLeave={() => setHovered(null)}
      className="group flex w-full items-start gap-3 border-b border-white/[0.06] py-2.5 text-left last:border-0"
    >
      <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center border", tierTone[project.tier])} title={tierLabel[project.tier]}>
        <ProjectGlyph project={project} className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-white group-hover:text-violet-hot">{project.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{[project.period, project.stage].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-foreground/70">{firstSentence(project.summary)}</span>
      </span>
    </button>
  );
}

export function BriefPanel() {
  const openSector = useWorldStore((s) => s.openSector);
  const setInspect = useOpenEntry();
  const setCvOpen = useWorldStore((s) => s.setCvOpen);
  const job = timeline[0];
  const degree = achievements[0];
  const tel = `tel:${owner.links.phone.replace(/[^+\d]/g, "")}`;
  const channels = [
    { id: "email", label: owner.links.email, href: `mailto:${owner.links.email}`, icon: Mail },
    { id: "phone", label: owner.links.phone, href: tel, icon: Phone },
    { id: "linkedin", label: "LinkedIn", href: owner.links.linkedin, icon: LinkedinMark },
    { id: "github", label: "GitHub", href: owner.links.github, icon: GithubMark },
  ];
  return (
    <div className="space-y-7">
      <section>
        <p className="text-[15px] leading-relaxed text-foreground/85">{owner.profile[0]}</p>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {[
            { k: "NOW", v: `${job.role} — ${job.organization}`, sub: job.period },
            { k: "BASED IN", v: owner.location, sub: owner.languages.map((l) => `${l.name} (${l.grade})`).join(" · ") },
            { k: "DEGREE", v: degree.title, sub: `${degree.issuer} · ${degree.period}` },
            { k: "FOCUS", v: owner.title, sub: owner.stats[0].label },
          ].map((f) => (
            <div key={f.k} className="border-l-2 border-violet/50 bg-violet/5 px-3 py-2">
              <dt className="font-display text-[8px] tracking-[0.3em] text-muted-foreground">{f.k}</dt>
              <dd className="font-semibold leading-snug text-white">{f.v}</dd>
              <dd className="font-mono text-[10px] leading-snug text-muted-foreground">{f.sub}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <Heading>Reach him</Heading>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <a key={c.id} href={c.href} target={c.id === "email" || c.id === "phone" ? undefined : "_blank"} rel="noreferrer noopener" onClick={() => play("click")} className="hud-chip px-3 py-2 text-[13px]">
              <c.icon className="size-4 text-system" />
              {c.label}
            </a>
          ))}
          <a href="/cv.pdf" download="bouarour-ayoub-cv.pdf" data-active="true" className="hud-chip px-3 py-2 text-[13px]">
            <Download className="size-4" /> Download CV
          </a>
          <button type="button" onClick={() => setCvOpen(true)} className="hud-chip px-3 py-2 text-[13px]">
            <FileText className="size-4" /> Read CV
          </button>
        </div>
      </section>

      <section>
        <Heading>Organisations</Heading>
        <ul className="grid gap-2">
          {organizations.map((g) => {
            const count = projects.filter((q) => q.organization === g.id).length;
            return (
              <li key={g.id}>
                <button type="button" onClick={() => openSector("projects")} className="glass-edge group flex w-full items-start gap-3 bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:bg-violet/10">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{g.name}</span>
                      <span className={cn("border px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase", g.role === "Founder" ? "border-gold/50 text-gold" : "border-system/50 text-system")}>{g.role}</span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-foreground/70">{g.summary}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-[10px] leading-tight text-muted-foreground">
                    <span className="block font-display text-lg text-white">{count}</span>
                    {count === 1 ? "project" : "projects"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <Heading>Work, flagship first</Heading>
        <div>
          {TIER_ORDER.flatMap((tier) => projects.filter((q) => q.tier === tier)).map((q) => (
            <ProjectRow key={q.id} project={q} />
          ))}
        </div>
      </section>

      <section>
        <Heading>Signature skills</Heading>
        <div className="flex flex-wrap gap-1.5">
          {signature.map((s) => (
            <button key={s.id} type="button" onClick={() => setInspect({ kind: "skill", id: s.id })} className="hud-chip px-2.5 py-1.5 text-xs">
              {s.name}
              <span className="font-display text-[9px] text-gold">{masteryLevel(s.mastery)}</span>
            </button>
          ))}
          <button type="button" onClick={() => openSector("skills")} className="hud-chip px-2.5 py-1.5 text-xs text-muted-foreground">
            all {skills.length} →
          </button>
        </div>
      </section>

      <p className="border-t border-violet/15 pt-4 text-sm text-muted-foreground">
        Want this argued for a specific role? Ask the agent below — it assembles a case from the record and cites every piece.
      </p>
    </div>
  );
}
