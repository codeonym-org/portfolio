import "server-only";
import { achievements, chronicle } from "@/config/chronicle.config";
import { inventoryCategories, inventoryItems } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { guilds, findGuild } from "@/config/guilds.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skills } from "@/config/skills.config";
import { sectors, visitorQuests } from "@/config/world.config";

/**
 * ── THE PLAYER DOSSIER ────────────────────────────────────────
 * Grounding for the agent, rendered from the same typed configs the
 * world displays — edit `src/config/*` and the System knows it on
 * the next request. Two granularities:
 *
 *  · `dossierDigest` — compact, always in the system prompt
 *  · `archive(section)` — full records, fetched by the
 *    `consult_archive` tool when a visitor digs deeper
 */

const grade = (m: number) => (m >= 90 ? "S" : m >= 85 ? "A" : m >= 78 ? "B" : "C");

function identity() {
  return [
    `Name: ${player.firstName} (handle "${player.handle}"; full name ${player.name}, given only when asked)`,
    `Role: ${player.job} — ${player.title}`,
    `Location: ${player.location}`,
    `Organisations: ${guilds.map((g) => `${g.name} [${g.id}] — ${g.role} (${g.kind}). ${g.summary}${g.link ? ` ${g.link}` : ""}`).join(" | ")}`,
    `Languages: ${player.languages.map((l) => `${l.name} (${l.grade})`).join(", ")}`,
    `Links: GitHub ${player.links.github} · LinkedIn ${player.links.linkedin} · Email ${player.links.email} · Phone ${player.links.phone}`,
  ].join("\n");
}

function profile() {
  return [
    ...player.profile,
    `Creed: "${player.creed}"`,
    `Known for: ${player.titles.map((t) => `${t.name} — ${t.description}`).join(" | ")}`,
    `Strengths (self-rated, 0-100): ${player.stats.map((s) => `${s.code} ${s.value} (${s.label})`).join(", ")}`,
  ].join("\n");
}

function experience() {
  return chronicle
    .map((c) => `- [${c.id}] ${c.period} · ${c.role} @ ${c.organization}\n  ${c.summary}\n  Highlights: ${c.highlights.join("; ")}`)
    .join("\n");
}

function education() {
  return achievements.map((a) => `- [${a.id}] ${a.period} · ${a.title} — ${a.issuer}`).join("\n");
}

function projects(full: boolean) {
  return quests
    .map((q) => {
      const head = `- [${q.id}] ${q.name} · ${q.type === "main" ? "work at OpenSNZ" : "personal project"} · organisation ${findGuild(q.guild)?.name ?? q.guild} · ${q.stage ?? q.status}${q.period ? ` · ${q.period}` : ""}`;
      const body = full
        ? `\n  ${q.summary}\n  ${q.details.map((d) => `• ${d}`).join("\n  ")}\n  Stack: ${q.rewards.join(", ")}${q.link ? `\n  Link: ${q.link}` : ""}${q.docs ? `\n  Docs: ${q.docs}` : ""}`
        : `\n  ${q.summary} Stack: ${q.rewards.join(", ")}`;
      return head + body;
    })
    .join("\n");
}

function skillTree(full: boolean) {
  return skillCategories
    .map((c) => {
      const list = skills.filter((s) => s.category === c.id);
      const items = full
        ? list.map((s) => `  - [${s.id}] ${s.name} · grade ${grade(s.mastery)} (${s.mastery}) · ${s.rarity} — ${s.lore}`).join("\n")
        : `  ${list.map((s) => `${s.name} [${s.id}] ${grade(s.mastery)}`).join(", ")}`;
      return `${c.name} (${c.set === "job" ? "job skill" : "secondary"}):\n${items}`;
    })
    .join("\n");
}

function inventory(full: boolean) {
  return inventoryCategories
    .map((c) => {
      const list = inventoryItems.filter((i) => i.category === c.id);
      const items = list
        .map((i) => (full ? `  - [${i.id}] ${i.name} · ${i.rarity}${i.meta ? ` · ${i.meta}` : ""} — ${i.lore}` : `${i.name} [${i.id}]`))
        .join(full ? "\n" : ", ");
      return `${c.name}: ${full ? `\n${items}` : items}`;
    })
    .join("\n");
}

function world() {
  const sectorLines = sectors.map((z) => `- ${z.id}: ${z.name} → ${z.section}. ${z.description}`).join("\n");
  const questLines = visitorQuests.map((q) => `- ${q.id}: "${q.name}" — ${q.objective} (+${q.xp} XP)`).join("\n");
  return `Sections of the record (each is a ring of shards around the Monolith and opens one window):\n${sectorLines}\nVisitor quests (the visitor earns XP by exploring):\n${questLines}`;
}

export const dossierDigest = [
  "## IDENTITY",
  identity(),
  "## PROFILE",
  profile(),
  "## EXPERIENCE (sector: experience; ids in brackets, evidence kind \"experience\")",
  experience(),
  "## EDUCATION (sector: experience; ids in brackets, evidence kind \"education\")",
  education(),
  "## PROJECTS (section: projects; ids in brackets, evidence kind \"quest\")",
  projects(false),
  "## SKILLS (sector: skills; ids in brackets, grade S≥90 A≥85 B≥78, evidence kind \"skill\")",
  skillTree(false),
  "## INVENTORY (sector: inventory; ids in brackets, evidence kind \"item\")",
  inventory(false),
  "## THE WORLD",
  world(),
].join("\n");

export const ARCHIVE_SECTIONS = ["identity", "experience", "education", "projects", "skills", "inventory", "world"] as const;
export type ArchiveSection = (typeof ARCHIVE_SECTIONS)[number];

export function archive(section: ArchiveSection): string {
  switch (section) {
    case "identity":
      return `${identity()}\n${profile()}`;
    case "experience":
      return experience();
    case "education":
      return education();
    case "projects":
      return projects(true);
    case "skills":
      return skillTree(true);
    case "inventory":
      return inventory(true);
    case "world":
      return world();
  }
}
