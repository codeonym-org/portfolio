import "server-only";
import { achievements, timeline } from "@/config/timeline.config";
import { documentCategories, documents } from "@/config/documents.config";
import { interview } from "@/config/interview.config";
import { owner } from "@/config/owner.config";
import { organizations, findOrganization } from "@/config/organizations.config";
import { projects } from "@/config/projects.config";
import { skillCategories, skills } from "@/config/skills.config";
import { sectors } from "@/config/world.config";
import { interviewGrounding } from "../interview-grounding";

/**
 * ── THE PLAYER DOSSIER ────────────────────────────────────────
 * Grounding for the agent, rendered from the same typed configs the
 * world displays — edit `src/config/*` and the agent knows it on
 * the next request. Two granularities:
 *
 *  · `dossierDigest` — compact, always in the system prompt
 *  · `archive(section)` — full records, fetched by the
 *    `consult_archive` tool when a visitor digs deeper
 */

const grade = (m: number) => (m >= 90 ? "S" : m >= 85 ? "A" : m >= 78 ? "B" : "C");

function identity() {
  return [
    `Name: ${owner.firstName} (said "${owner.pronounced}"; handle "${owner.handle}"; full name ${owner.name}, given only when asked)`,
    `Role: ${owner.job} — ${owner.title}`,
    `Location: ${owner.location}`,
    `Organisations: ${organizations.map((g) => `${g.name} [${g.id}] — ${g.role} (${g.kind}). ${g.summary}${g.link ? ` ${g.link}` : ""}`).join(" | ")}`,
    `Languages: ${owner.languages.map((l) => `${l.name} (${l.grade})`).join(", ")}`,
    `Links: GitHub ${owner.links.github} · LinkedIn ${owner.links.linkedin} · Email ${owner.links.email} · Phone ${owner.links.phone}`,
  ].join("\n");
}

function profile() {
  return [
    ...owner.profile,
    `Creed: "${owner.motto}"`,
    `Known for: ${owner.titles.map((t) => `${t.name} — ${t.description}`).join(" | ")}`,
    `Strengths (self-rated, 0-100): ${owner.stats.map((s) => `${s.code} ${s.value} (${s.label})`).join(", ")}`,
  ].join("\n");
}

function experience() {
  return timeline
    .map((c) => `- [${c.id}] ${c.period} · ${c.role} @ ${c.organization}\n  ${c.summary}\n  Highlights: ${c.highlights.join("; ")}`)
    .join("\n");
}

function education() {
  return achievements.map((a) => `- [${a.id}] ${a.period} · ${a.title} — ${a.issuer}`).join("\n");
}

function projectLines(full: boolean) {
  return projects
    .map((q) => {
      const head = `- [${q.id}] ${q.name} · ${q.type === "work" ? "work at OpenSNZ" : "personal project"} · organisation ${findOrganization(q.organization)?.name ?? q.organization} · ${q.stage ?? q.status}${q.period ? ` · ${q.period}` : ""}`;
      const body = full
        ? `\n  ${q.summary}\n  ${q.details.map((d) => `• ${d}`).join("\n  ")}\n  Stack: ${q.stack.join(", ")}${q.link ? `\n  Link: ${q.link}` : ""}${q.docs ? `\n  Docs: ${q.docs}` : ""}`
        : `\n  ${q.summary} Stack: ${q.stack.join(", ")}`;
      return head + body;
    })
    .join("\n");
}

function skillTree(full: boolean) {
  return skillCategories
    .map((c) => {
      const list = skills.filter((s) => s.category === c.id);
      const items = full
        ? list.map((s) => `  - [${s.id}] ${s.name} · grade ${grade(s.mastery)} (${s.mastery}) · ${s.emphasis} — ${s.about}`).join("\n")
        : `  ${list.map((s) => `${s.name} [${s.id}] ${grade(s.mastery)}`).join(", ")}`;
      return `${c.name} (${c.set === "job" ? "job skill" : "secondary"}):\n${items}`;
    })
    .join("\n");
}

function documentLines(full: boolean) {
  return documentCategories
    .map((c) => {
      const list = documents.filter((i) => i.category === c.id);
      const items = list
        .map((i) => (full ? `  - [${i.id}] ${i.name} · ${i.emphasis}${i.meta ? ` · ${i.meta}` : ""} — ${i.about}` : `${i.name} [${i.id}]`))
        .join(full ? "\n" : ", ");
      return `${c.name}: ${full ? `\n${items}` : items}`;
    })
    .join("\n");
}

function world() {
  const sectorLines = sectors.map((z) => `- ${z.id}: ${z.name} → ${z.section}. ${z.description}`).join("\n");
  return `Sections of the record (each is a ring of shards around the Monolith and opens one window):\n${sectorLines}`;
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
  "## PROJECTS (section: projects; ids in brackets, evidence kind \"project\")",
  projectLines(false),
  "## SKILLS (sector: skills; ids in brackets, grade S≥90 A≥85 B≥78, evidence kind \"skill\")",
  skillTree(false),
  "## DOCUMENTS (section: documents; ids in brackets, evidence kind \"document\")",
  documentLines(false),
  "## INTERVIEW (ids in brackets; not shown in any window)",
  interviewGrounding(interview),
  "## THE WORLD",
  world(),
].join("\n");

export const ARCHIVE_SECTIONS = ["identity", "experience", "education", "projects", "skills", "documents", "interview", "world"] as const;
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
      return projectLines(true);
    case "skills":
      return skillTree(true);
    case "documents":
      return documentLines(true);
    case "interview":
      return interviewGrounding(interview);
    case "world":
      return world();
  }
}
