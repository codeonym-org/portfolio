import { achievements, chronicle } from "@/config/chronicle.config";
import { inventoryCategories, inventoryItems } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skills } from "@/config/skills.config";

/**
 * ── THE PLAIN RECORD ──────────────────────────────────────────
 * The same record the Monolith holds, with nothing in the way: no
 * WebGL, no agent, no game. One structure feeds the `/record` page
 * (for people who want to read, print or cannot run the scene) and
 * `/llms.txt` (for agents that came to read rather than to look).
 */

export interface PlainEntry {
  id: string;
  title: string;
  meta?: string;
  body?: string;
  points?: string[];
  tags?: string[];
  link?: string;
}

export interface PlainSection {
  id: string;
  title: string;
  note?: string;
  entries: PlainEntry[];
}

const grade = (m: number) => (m >= 90 ? "S" : m >= 85 ? "A" : m >= 78 ? "B" : "C");

export const plainHeader = {
  name: player.name,
  handle: player.handle,
  title: player.title,
  line: `${player.job} at ${player.guild} · ${player.location}`,
  profile: player.profile,
  links: [
    { label: "GitHub", href: player.links.github },
    { label: "LinkedIn", href: player.links.linkedin },
    { label: "Email", href: `mailto:${player.links.email}` },
    { label: "CV (PDF)", href: "/cv.pdf" },
  ],
  languages: player.languages.map((l) => `${l.name} (${l.grade})`).join(" · "),
};

export const plainSections: PlainSection[] = [
  {
    id: "experience",
    title: "Experience",
    entries: chronicle.map((c) => ({ id: c.id, title: `${c.role} — ${c.organization}`, meta: c.period, body: c.summary, points: c.highlights })),
  },
  {
    id: "projects",
    title: "Projects",
    entries: quests.map((q) => ({
      id: q.id,
      title: q.name,
      meta: [q.period, q.status === "ongoing" ? "ongoing" : "shipped", q.type === "main" ? "main work" : "side project"].filter(Boolean).join(" · "),
      body: q.summary,
      points: q.details,
      tags: q.rewards,
      link: q.link,
    })),
  },
  {
    id: "skills",
    title: "Skills",
    note: "Graded by the owner, S (signature) to C (working knowledge).",
    entries: skillCategories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      tags: skills
        .filter((s) => s.category === cat.id)
        .sort((a, b) => b.mastery - a.mastery)
        .map((s) => `${s.name} · ${grade(s.mastery)}`),
    })),
  },
  {
    id: "education",
    title: "Education & certifications",
    entries: achievements.map((a) => ({ id: a.id, title: a.title, meta: `${a.issuer} · ${a.period}` })),
  },
  {
    id: "inventory",
    title: "Tools & artefacts",
    entries: inventoryCategories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      tags: inventoryItems.filter((i) => i.category === cat.id).map((i) => i.name),
    })),
  },
];

/** the record as Markdown, in the llms.txt shape: a title, a summary, then sections */
export function plainMarkdown(site: string): string {
  const h = plainHeader;
  const out: string[] = [
    `# ${h.name} (${h.handle}) — ${h.title}`,
    "",
    `> ${h.profile[0]}`,
    "",
    h.line,
    `Languages: ${h.languages}`,
    "",
    ...h.profile.slice(1).flatMap((p) => [p, ""]),
    "## Links",
    "",
    ...h.links.map((l) => `- [${l.label}](${l.href.startsWith("/") ? site + l.href : l.href})`),
    `- [The living record (interactive, agent-driven)](${site}/)`,
    `- [The plain record (HTML)](${site}/record)`,
    "",
  ];
  for (const section of plainSections) {
    out.push(`## ${section.title}`, "");
    if (section.note) out.push(section.note, "");
    for (const e of section.entries) {
      out.push(`### ${e.title}`);
      if (e.meta) out.push(`_${e.meta}_`);
      out.push("");
      if (e.body) out.push(e.body, "");
      if (e.points?.length) out.push(...e.points.map((p) => `- ${p}`), "");
      if (e.tags?.length) out.push(e.tags.join(", "), "");
      if (e.link) out.push(`Link: ${e.link}`, "");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
