"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, BookOpenText, ChevronRight, Copy, Download, ExternalLink, FileText, FolderGit2, IdCard, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { GithubMark, LinkedinMark } from "@/components/system/brand-marks";
import { LiveRepo } from "@/components/interface/live-repo";
import { MapCard } from "@/components/interface/map-card";
import { useOpenEntry } from "@/components/interface/open-entry";
import { achievements, chronicle } from "@/config/chronicle.config";
import { findGuild, guilds } from "@/config/guilds.config";
import { findItem, inventoryCategories, inventoryItems } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { findSkill, skillCategories, skillSets, skills } from "@/config/skills.config";
import type { InspectTarget, Quest, Rarity, SectorId, SkillDetail, SkillSet } from "@/config/types";
import { sectorById, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { masteryGrade } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { skillNamed, usedIn } from "./exhibit-links";
import { familyName } from "./vcard";

/**
 * ── THE RECORD, LAID ON THE TABLE ─────────────────────────────
 * The interview's own way of showing the record: the six sections and
 * the three kinds of entry (a skill, a project, a document), in the
 * room's glass rather than the home page's game panels. Lists are
 * read at a glance and every entry in them opens in place; an entry
 * leads on to what it touches (a skill to the projects that used it,
 * a project's stack to its skills), with the table's back button to
 * return (`table.tsx`).
 */

const copy = world.interview.table.ex;
const FULL_NAME = `${player.firstName} ${familyName(player.name, player.firstName)}`;

/** one colour per standing, the room's own */
const TONE: Record<Rarity, string> = {
  legendary: "oklch(0.85 0.13 85)",
  epic: "oklch(0.76 0.16 295)",
  rare: "oklch(0.8 0.12 228)",
  common: "oklch(0.74 0.02 260)",
};
const RANK_TONE: Record<Quest["rank"], string> = { S: TONE.legendary, A: TONE.epic, B: TONE.rare };
const tone = (color: string) => ({ ["--tone" as string]: color }) as CSSProperties;

const rise = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } };

// ── the kit ──

function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div className="ex" variants={stagger} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

function Block({ title, count, children, className }: { title: string; count?: number; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={rise} className={cn("ex-block", className)}>
      <header className="ex-block__head">
        <h3>{title}</h3>
        {count !== undefined && <span>{count}</span>}
      </header>
      {children}
    </motion.section>
  );
}

function Hero({ icon, color, kicker, title, sub, aside }: { icon: ReactNode; color: string; kicker: string; title: string; sub?: string; aside?: ReactNode }) {
  return (
    <motion.header variants={rise} className="ex-hero" style={tone(color)}>
      <span className="ex-hero__icon" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="ex-kicker">{kicker}</p>
        <h3 className="ex-hero__title">{title}</h3>
        {sub && <p className="ex-hero__sub">{sub}</p>}
      </div>
      {aside}
    </motion.header>
  );
}

function Grade({ mastery, color }: { mastery: number; color: string }) {
  return (
    <span className="ex-grade" style={tone(color)} title={`${copy.grade} ${masteryGrade(mastery)} · ${mastery}/100`}>
      {masteryGrade(mastery)}
    </span>
  );
}

function Meter({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  return (
    <span className="ex-meter" style={tone(color)} aria-hidden>
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: value / 100 }} transition={{ duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }} />
    </span>
  );
}

/** mastery as a ring, with its grade */
function Gauge({ value, color }: { value: number; color: string }) {
  const r = 25;
  const c = 2 * Math.PI * r;
  return (
    <div className="ex-gauge" style={tone(color)} aria-label={`${copy.mastery} ${value}/100, ${copy.grade} ${masteryGrade(value)}`}>
      <svg viewBox="0 0 60 60" aria-hidden>
        <circle cx="30" cy="30" r={r} className="ex-gauge__track" />
        <motion.circle
          cx="30"
          cy="30"
          r={r}
          className="ex-gauge__arc"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
        />
      </svg>
      <span className="ex-gauge__n">{value}</span>
      <span className="ex-gauge__g">
        {copy.grade} {masteryGrade(value)}
      </span>
    </div>
  );
}

function Tags({ tags, className }: { tags?: readonly string[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <motion.div variants={rise} className={cn("ex-tags", className)}>
      {tags.map((t) => (
        <span key={t} className="ex-tag">
          {t}
        </span>
      ))}
    </motion.div>
  );
}

/** a row that opens what it names */
function Row({ icon: Icon, color, title, sub, meta, aside, onOpen }: { icon: LucideIcon; color: string; title: string; sub?: string; meta?: boolean; aside?: ReactNode; onOpen: () => void }) {
  return (
    <motion.button variants={rise} type="button" className="ex-row" style={tone(color)} onClick={onOpen}>
      <span className="ex-row__icon" aria-hidden>
        <Icon className="size-4" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ex-row__title">{title}</span>
        {sub && <span className={cn("ex-row__sub", meta && "ex-row__sub--meta")}>{sub}</span>}
      </span>
      {aside}
      <ChevronRight className="ex-row__go size-4" aria-hidden />
    </motion.button>
  );
}

function useOpen() {
  const open = useOpenEntry();
  return (target: InspectTarget) => {
    play("click", { volume: 0.35 });
    open(target);
  };
}

const stageOf = (q: Quest) => q.stage ?? (q.status === "ongoing" ? "ongoing" : "delivered");
const where = (q: Quest) => [findGuild(q.guild)?.name, q.period].filter(Boolean).join(" · ");

// ── the sections ──

function ProfileExhibit() {
  const facts = [
    { k: copy.facts.org, v: guilds.map((g) => `${g.name} · ${g.role}`) },
    { k: copy.facts.based, v: [player.location] },
    { k: copy.facts.languages, v: player.languages.map((l) => `${l.name} · ${l.grade}`) },
  ];
  return (
    <Page>
      <motion.header variants={rise} className="ex-id">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 128px face, already sized */}
        <img src="/brand/avatar.webp" alt="" className="ex-id__face" />
        <div className="min-w-0">
          <p className="ex-kicker">{player.handle}</p>
          <h3 className="ex-id__name">{FULL_NAME}</h3>
          <p className="ex-id__role">
            {player.title} <span>· {player.job}</span>
          </p>
        </div>
      </motion.header>

      <motion.dl variants={rise} className="ex-facts">
        {facts.map((f) => (
          <div key={f.k}>
            <dt>{f.k}</dt>
            {f.v.map((v) => (
              <dd key={v}>{v}</dd>
            ))}
          </div>
        ))}
      </motion.dl>

      <Block title={copy.about}>
        <div className="ex-prose">
          {player.profile.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <blockquote className="ex-quote">{player.creed}</blockquote>
      </Block>

      <Block title={copy.strengths}>
        <ul className="ex-stats">
          {player.stats.map((s, i) => (
            <li key={s.code}>
              <span className="ex-stats__label">{s.label}</span>
              <span className="ex-stats__n">{s.value}</span>
              <Meter value={s.value} color={TONE.epic} delay={0.1 + i * 0.05} />
            </li>
          ))}
        </ul>
      </Block>

      <Block title={copy.knownFor}>
        <ul className="ex-known">
          {player.titles.map((t) => (
            <li key={t.id}>
              <p>{t.name}</p>
              <span>{t.description}</span>
            </li>
          ))}
        </ul>
      </Block>
    </Page>
  );
}

function ExperienceExhibit() {
  return (
    <Page>
      <Block title={copy.experience} count={chronicle.length}>
        <ol className="ex-timeline">
          {chronicle.map((c, i) => (
            <motion.li key={c.id} variants={rise} data-now={i === 0}>
              <div className="ex-timeline__top">
                <h4>{c.role}</h4>
                <span className="ex-pill">{c.period}</span>
              </div>
              <p className="ex-timeline__org">{c.organization}</p>
              <p className="ex-timeline__text">{c.summary}</p>
              <div className="ex-tags">
                {c.highlights.map((h) => (
                  <span key={h} className="ex-tag">
                    {h}
                  </span>
                ))}
              </div>
            </motion.li>
          ))}
        </ol>
      </Block>
      <Block title={copy.education} count={achievements.length}>
        <ul className="ex-rows">
          {achievements.map((a) => (
            <motion.li key={a.id} variants={rise} className="ex-edu">
              <span className="ex-row__icon" style={tone(TONE.legendary)} aria-hidden>
                <BookOpenText className="size-4" strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="ex-row__title">{a.title}</span>
                <span className="ex-row__sub">{a.issuer}</span>
              </span>
              <span className="ex-pill">{a.period}</span>
            </motion.li>
          ))}
        </ul>
      </Block>
    </Page>
  );
}

function ProjectCard({ quest }: { quest: Quest }) {
  const open = useOpen();
  const shown = quest.rewards.slice(0, 4);
  return (
    <motion.button variants={rise} type="button" className="ex-card" style={tone(RANK_TONE[quest.rank])} onClick={() => open({ kind: "quest", id: quest.id })}>
      <span className="ex-card__top">
        <span className="ex-card__title">{quest.name}</span>
        <span className="ex-pill ex-pill--tone">{stageOf(quest)}</span>
      </span>
      <span className="ex-card__meta">{where(quest)}</span>
      <span className="ex-card__text">{quest.summary}</span>
      <span className="ex-tags">
        {shown.map((r) => (
          <span key={r} className="ex-tag">
            {r}
          </span>
        ))}
        {quest.rewards.length > shown.length && <span className="ex-tag ex-tag--more">+{quest.rewards.length - shown.length}</span>}
      </span>
      <span className="ex-card__go">
        {copy.details} <ArrowUpRight className="size-3.5" />
      </span>
    </motion.button>
  );
}

function ProjectsExhibit() {
  const work = quests.filter((q) => q.type === "main");
  const own = guilds.filter((g) => quests.some((q) => q.type === "side" && q.guild === g.id));
  return (
    <Page>
      <Block title={copy.atWork(findGuild(work[0]?.guild ?? "")?.name ?? "work")} count={work.length}>
        <div className="ex-cards">
          {work.map((q) => (
            <ProjectCard key={q.id} quest={q} />
          ))}
        </div>
      </Block>
      {own.map((g) => {
        const list = quests.filter((q) => q.type === "side" && q.guild === g.id);
        return (
          <Block key={g.id} title={g.name} count={list.length}>
            <p className="ex-lead">{g.summary}</p>
            <div className="ex-cards">
              {list.map((q) => (
                <ProjectCard key={q.id} quest={q} />
              ))}
            </div>
          </Block>
        );
      })}
    </Page>
  );
}

function SkillRow({ skill, i }: { skill: SkillDetail; i: number }) {
  const open = useOpen();
  const color = TONE[skill.rarity];
  return (
    <motion.button variants={rise} type="button" className="ex-skill" style={tone(color)} onClick={() => open({ kind: "skill", id: skill.id })}>
      <skill.icon className="ex-skill__icon" strokeWidth={1.7} aria-hidden />
      <span className="ex-skill__name">{skill.name}</span>
      <Meter value={skill.mastery} color={color} delay={0.05 + Math.min(i, 12) * 0.03} />
      <Grade mastery={skill.mastery} color={color} />
    </motion.button>
  );
}

function SkillsExhibit() {
  const [set, setSet] = useState<SkillSet>("job");
  const about = skillSets.find((s) => s.id === set);
  const cats = skillCategories.filter((c) => c.set === set);
  return (
    <div className="ex">
      <div className="ex-tabs" role="tablist" aria-label={copy.sets}>
        {skillSets.map((s) => {
          const n = skills.filter((k) => skillCategories.find((c) => c.id === k.category)?.set === s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === set}
              data-on={s.id === set}
              onClick={() => {
                if (s.id !== set) play("click", { volume: 0.3 });
                setSet(s.id);
              }}
            >
              {s.id === set && <motion.span layoutId="ex-tab" className="ex-tabs__thumb" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative">{copy.setNames[s.id]}</span>
              <span className="ex-tabs__n">{n}</span>
            </button>
          );
        })}
      </div>
      <motion.div key={set} variants={stagger} initial="hidden" animate="show" className="ex">
        {about && <motion.p variants={rise} className="ex-lead">{about.blurb}</motion.p>}
        <motion.p variants={rise} className="ex-legend">
          {copy.legend}
        </motion.p>
        {cats.map((cat) => {
          const list = skills.filter((s) => s.category === cat.id).sort((a, b) => b.mastery - a.mastery);
          return (
            <motion.section key={cat.id} variants={rise} className="ex-block">
              <header className="ex-block__head">
                <cat.icon className="size-3.5" aria-hidden />
                <h3>{cat.name}</h3>
                <span>{list.length}</span>
              </header>
              <div className="ex-skills">
                {list.map((s, i) => (
                  <SkillRow key={s.id} skill={s} i={i} />
                ))}
              </div>
            </motion.section>
          );
        })}
      </motion.div>
    </div>
  );
}

function DocumentsExhibit() {
  const open = useOpen();
  const setCvOpen = useWorldStore((s) => s.setCvOpen);
  const cv = inventoryItems.find((i) => i.unlocks === "cv");
  return (
    <Page>
      {cv && (
        <motion.div variants={rise} className="ex-feature" style={tone(TONE.legendary)}>
          <span className="ex-feature__doc" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ex-kicker">{copy.cv}</p>
            <h4 className="ex-feature__title">{cv.name}</h4>
            <p className="ex-feature__text">{cv.lore}</p>
            <div className="ex-actions">
              <button
                type="button"
                className="talk-btn talk-btn--go ex-btn"
                onClick={() => {
                  play("confirm", { volume: 0.4 });
                  setCvOpen(true);
                }}
              >
                <FileText className="size-3.5" /> {copy.viewCv}
              </button>
              <a href="/cv.pdf" download="bouarour-ayoub-cv.pdf" className="talk-btn ex-btn">
                <Download className="size-3.5" /> {copy.downloadCv}
              </a>
            </div>
          </div>
        </motion.div>
      )}
      {inventoryCategories.map((cat) => {
        const list = inventoryItems.filter((i) => i.category === cat.id && i !== cv);
        if (!list.length) return null;
        return (
          <Block key={cat.id} title={cat.name} count={list.length}>
            <div className="ex-rows">
              {list.map((item) => (
                <Row key={item.id} icon={item.icon} color={TONE[item.rarity]} title={item.name} sub={item.meta} meta onOpen={() => open({ kind: "item", id: item.id })} />
              ))}
            </div>
          </Block>
        );
      })}
    </Page>
  );
}

function ContactExhibit() {
  const [copied, setCopied] = useState(false);
  const setCardOpen = useWorldStore((s) => s.setCardOpen);
  const { email, phone, linkedin, github } = player.links;
  const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const channels = [
    { id: "email", label: copy.channels.email, value: email, href: `mailto:${email}`, icon: Mail, color: TONE.epic },
    { id: "phone", label: copy.channels.phone, value: phone, href: `tel:${phone.replace(/[^+\d]/g, "")}`, icon: Phone, color: TONE.legendary },
    { id: "linkedin", label: copy.channels.linkedin, value: bare(linkedin), href: linkedin, icon: LinkedinMark, color: TONE.rare },
    { id: "github", label: copy.channels.github, value: bare(github), href: github, icon: GithubMark, color: TONE.common },
  ];
  return (
    <Page>
      <motion.p variants={rise} className="ex-lead ex-lead--big">
        {copy.contactLead}
      </motion.p>
      <div className="ex-rows">
        {channels.map((c) => (
          <motion.a
            key={c.id}
            variants={rise}
            href={c.href}
            target={c.id === "email" || c.id === "phone" ? undefined : "_blank"}
            rel="noreferrer"
            className="ex-row"
            style={tone(c.color)}
            onClick={() => play("click", { volume: 0.35 })}
          >
            <span className="ex-row__icon" aria-hidden>
              <c.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="ex-row__sub ex-row__sub--label">{c.label}</span>
              <span className="ex-row__title">{c.value}</span>
            </span>
            <ExternalLink className="ex-row__go size-4" aria-hidden />
          </motion.a>
        ))}
      </div>
      <motion.div variants={rise} className="ex-actions">
        <button type="button" className="talk-btn talk-btn--go ex-btn" onClick={() => setCardOpen(true)}>
          <IdCard className="size-3.5" /> {copy.myCard}
        </button>
        <button
          type="button"
          className="talk-btn ex-btn"
          onClick={() => {
            void navigator.clipboard?.writeText(email).then(() => {
              setCopied(true);
              play("confirm", { volume: 0.4 });
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
        >
          <Copy className="size-3.5" /> {copied ? copy.copied : copy.copyEmail}
        </button>
        <a href="/cv.pdf" download="bouarour-ayoub-cv.pdf" className="talk-btn ex-btn">
          <Download className="size-3.5" /> {copy.downloadCv}
        </a>
      </motion.div>
      <motion.p variants={rise} className="ex-where">
        <MapPin className="size-3.5" /> {player.location} · {player.languages.map((l) => l.name).join(", ")}
      </motion.p>
      <motion.div variants={rise}>
        <MapCard />
      </motion.div>
    </Page>
  );
}

export const SECTION_EXHIBIT: Record<SectorId, () => ReactNode> = {
  status: ProfileExhibit,
  experience: ExperienceExhibit,
  projects: ProjectsExhibit,
  skills: SkillsExhibit,
  inventory: DocumentsExhibit,
  contact: ContactExhibit,
};

// ── the entries ──

function SkillEntry({ skill }: { skill: SkillDetail }) {
  const open = useOpen();
  const cat = skillCategories.find((c) => c.id === skill.category);
  const color = TONE[skill.rarity];
  const projects = usedIn(skill.name, quests);
  const siblings = skills.filter((s) => s.category === skill.category && s.id !== skill.id).sort((a, b) => b.mastery - a.mastery);
  return (
    <Page>
      <Hero icon={<skill.icon className="size-6" strokeWidth={1.5} />} color={color} kicker={`${copy.kinds.skill} · ${cat?.name ?? ""}`} title={skill.name} aside={<Gauge value={skill.mastery} color={color} />} />
      <motion.p variants={rise} className="ex-prose ex-prose--lead">
        {skill.lore}
      </motion.p>
      <Tags tags={skill.tags} />
      {projects.length > 0 && (
        <Block title={copy.usedIn} count={projects.length}>
          <div className="ex-rows">
            {projects.map((q) => (
              <Row key={q.id} icon={FolderGit2} color={RANK_TONE[q.rank]} title={q.name} sub={where(q)} onOpen={() => open({ kind: "quest", id: q.id })} />
            ))}
          </div>
        </Block>
      )}
      {siblings.length > 0 && (
        <Block title={copy.alsoIn(cat?.name ?? "")}>
          <motion.div variants={rise} className="ex-chips">
            {siblings.map((s) => (
              <button key={s.id} type="button" className="ex-chip" style={tone(TONE[s.rarity])} onClick={() => open({ kind: "skill", id: s.id })}>
                <s.icon className="size-3.5" strokeWidth={1.7} aria-hidden />
                {s.name}
                <span className="ex-chip__g">{masteryGrade(s.mastery)}</span>
              </button>
            ))}
          </motion.div>
        </Block>
      )}
    </Page>
  );
}

function ProjectEntry({ quest }: { quest: Quest }) {
  const open = useOpen();
  const color = RANK_TONE[quest.rank];
  return (
    <Page>
      <Hero
        icon={<FolderGit2 className="size-6" strokeWidth={1.5} />}
        color={color}
        kicker={`${quest.type === "main" ? copy.workProject : copy.ownProject} · ${stageOf(quest)}`}
        title={quest.name}
        sub={where(quest)}
      />
      <motion.p variants={rise} className="ex-prose ex-prose--lead">
        {quest.summary}
      </motion.p>
      <Block title={copy.whatIDid}>
        <ul className="ex-list">
          {quest.details.map((d) => (
            <motion.li key={d} variants={rise}>
              {d}
            </motion.li>
          ))}
        </ul>
      </Block>
      <Block title={copy.stack} count={quest.rewards.length}>
        <motion.div variants={rise} className="ex-chips">
          {quest.rewards.map((r) => {
            const skill = skillNamed(r, skills);
            return skill ? (
              <button key={r} type="button" className="ex-chip" style={tone(TONE[skill.rarity])} title={`${copy.kinds.skill}: ${skill.name}`} onClick={() => open({ kind: "skill", id: skill.id })}>
                {r}
                <ChevronRight className="ex-chip__go size-3" aria-hidden />
              </button>
            ) : (
              <span key={r} className="ex-chip ex-chip--plain">
                {r}
              </span>
            );
          })}
        </motion.div>
      </Block>
      {quest.type === "side" && (
        <motion.div variants={rise}>
          <LiveRepo id={quest.id} />
        </motion.div>
      )}
      {(quest.link || quest.docs) && (
        <motion.div variants={rise} className="ex-actions">
          {quest.link && (
            <a href={quest.link} target="_blank" rel="noreferrer" className="talk-btn talk-btn--go ex-btn">
              <GithubMark className="size-3.5" /> {copy.source}
            </a>
          )}
          {quest.docs && (
            <a href={quest.docs} target="_blank" rel="noreferrer" className="talk-btn ex-btn">
              <BookOpenText className="size-3.5" /> {copy.docs}
            </a>
          )}
        </motion.div>
      )}
    </Page>
  );
}

function DocumentEntry({ id }: { id: string }) {
  const item = findItem(id);
  const setCvOpen = useWorldStore((s) => s.setCvOpen);
  const openSector = useWorldStore((s) => s.openSector);
  if (!item) return null;
  const cat = inventoryCategories.find((c) => c.id === item.category);
  const color = TONE[item.rarity];
  const use = () => {
    play("confirm", { volume: 0.4 });
    if (item.unlocks === "cv") return setCvOpen(true);
    if (item.unlocks) return openSector(item.unlocks);
    if (item.link) window.open(item.link, "_blank", "noopener");
  };
  const action = item.unlocks === "cv" ? copy.viewCv : item.unlocks ? copy.openSection(sectorById[item.unlocks].name) : item.link ? copy.openLink : null;
  return (
    <Page>
      <Hero icon={<item.icon className="size-6" strokeWidth={1.5} />} color={color} kicker={cat?.name ?? copy.kinds.document} title={item.name} sub={item.meta} />
      <motion.p variants={rise} className="ex-prose ex-prose--lead">
        {item.lore}
      </motion.p>
      <Tags tags={item.tags} />
      {action && (
        <motion.div variants={rise} className="ex-actions">
          <button type="button" className="talk-btn talk-btn--go ex-btn" onClick={use}>
            {action} {item.link && !item.unlocks ? <ExternalLink className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        </motion.div>
      )}
    </Page>
  );
}

/** a skill, a project or a document, opened */
export function EntryExhibit({ target }: { target: InspectTarget }) {
  if (target.kind === "skill") {
    const skill = findSkill(target.id);
    return skill ? <SkillEntry skill={skill} /> : null;
  }
  if (target.kind === "quest") {
    const quest = quests.find((q) => q.id === target.id);
    return quest ? <ProjectEntry quest={quest} /> : null;
  }
  return <DocumentEntry id={target.id} />;
}

/** what an entry is, for the table's head */
export const entryKind = (target: InspectTarget) => (target.kind === "skill" ? copy.kinds.skill : target.kind === "quest" ? copy.kinds.project : copy.kinds.document);
