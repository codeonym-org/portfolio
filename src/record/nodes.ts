import { achievements, timeline } from "@/config/timeline.config";
import { documents } from "@/config/documents.config";
import { owner } from "@/config/owner.config";
import { projects } from "@/config/projects.config";
import { skillCategories, skills } from "@/config/skills.config";
import type { InspectTarget, Emphasis, SectorId } from "@/config/types";
import { seeded, type Orbit } from "./layout";

/**
 * ── THE RECORD, AS SHARDS ─────────────────────────────────────
 * Every entity in `src/config` becomes one shard in orbit. This is
 * the single index the scene, the palette and the case file share:
 * a node's `key` is `<kind>:<id>` everywhere.
 */

export type NodeKind = "owner" | "title" | "experience" | "education" | "project" | "skill" | "document" | "channel";

/** what a shard glows with */
export type NodeHue = "gold" | "violet" | "system" | "ember" | "bone";

export interface RecordNode {
  key: string;
  kind: NodeKind;
  id: string;
  sector: SectorId;
  label: string;
  /** second line on the label */
  sub?: string;
  /** which crystal in shards.glb */
  shape: SectorId;
  size: number;
  hue: NodeHue;
  orbit: Orbit;
  /** searchable text for the palette */
  search: string;
}

const emphasisHue: Record<Emphasis, NodeHue> = { highlight: "gold", strong: "violet", standard: "system", quiet: "bone" };
const TAU = Math.PI * 2;

function ring(count: number, base: Omit<Orbit, "phase">, spread = TAU) {
  return (i: number): Orbit => ({ ...base, phase: (i / count) * spread });
}

function build(): RecordNode[] {
  const nodes: RecordNode[] = [];
  const add = (n: Omit<RecordNode, "key" | "search"> & { search?: string }) =>
    nodes.push({ ...n, key: `${n.kind}:${n.id}`, search: `${n.label} ${n.sub ?? ""} ${n.search ?? ""}`.toLowerCase() });

  // ── Ayoub: a crown above the Monolith, his titles around it ──
  add({
    kind: "owner",
    id: "owner",
    sector: "profile",
    label: owner.name,
    sub: owner.title,
    shape: "profile",
    size: 0.62,
    hue: "gold",
    orbit: { radius: 0, y: 3.35, incline: 0, roll: 0, speed: 0, phase: 0 },
    search: `${owner.handle} ${owner.job} profile status who`,
  });
  const titleOrbit = ring(owner.titles.length, { radius: 1.25, y: 3.35, incline: 0.32, roll: 0.1, speed: 0.22 });
  owner.titles.forEach((t, i) =>
    add({ kind: "title", id: t.id, sector: "profile", label: t.name, sub: "TITLE", shape: "profile", size: 0.2, hue: "gold", orbit: titleOrbit(i), search: t.description }),
  );

  // ── the timeline ──
  const chapters = timeline.length + achievements.length;
  const chapterOrbit = ring(chapters, { radius: 3.3, y: 0.3, incline: 0.52, roll: 0.22, speed: 0.085 });
  timeline.forEach((c, i) =>
    add({ kind: "experience", id: c.id, sector: "experience", label: c.role, sub: c.period, shape: "experience", size: 0.5, hue: "system", orbit: chapterOrbit(i), search: `${c.organization} ${c.highlights.join(" ")}` }),
  );
  achievements.forEach((a, i) =>
    add({ kind: "education", id: a.id, sector: "experience", label: a.title, sub: a.period, shape: "experience", size: 0.36, hue: "bone", orbit: chapterOrbit(timeline.length + i), search: a.issuer }),
  );

  // ── the projects: the widest blades in the sky ──
  const projectOrbit = ring(projects.length, { radius: 4.85, y: 0, incline: 0.17, roll: -0.13, speed: 0.06 });
  projects.forEach((q, i) =>
    add({
      kind: "project",
      id: q.id,
      sector: "projects",
      label: q.name,
      sub: `${q.tier === "flagship" ? "FLAGSHIP · " : ""}${(q.stage ?? q.status).toUpperCase()}`,
      shape: "projects",
      size: q.tier === "flagship" ? 0.78 : q.tier === "major" ? 0.62 : 0.52,
      hue: q.tier === "flagship" ? "gold" : "violet",
      orbit: projectOrbit(i),
      search: `${q.summary} ${q.stack.join(" ")} project`,
    }),
  );

  // ── documents ──
  const itemOrbit = ring(documents.length, { radius: 6.15, y: -0.25, incline: -0.36, roll: 0.08, speed: 0.045 });
  documents.forEach((item, i) =>
    add({ kind: "document", id: item.id, sector: "documents", label: item.name, sub: item.meta, shape: "documents", size: 0.34, hue: emphasisHue[item.emphasis], orbit: itemOrbit(i), search: `${item.about} ${(item.tags ?? []).join(" ")}` }),
  );

  // ── skills: a belt of slivers, one cluster per category ──
  const gap = 0.16;
  const arc = (TAU - gap * skillCategories.length) / skills.length;
  let cursor = 0;
  let n = 0;
  for (const cat of skillCategories) {
    for (const s of skills.filter((sk) => sk.category === cat.id)) {
      add({
        kind: "skill",
        id: s.id,
        sector: "skills",
        label: s.name,
        sub: cat.name,
        shape: "skills",
        size: 0.2 + (s.mastery - 70) * 0.004,
        hue: emphasisHue[s.emphasis],
        orbit: { radius: 7.6 + seeded(n, 1) * 1.1, y: (seeded(n, 2) - 0.5) * 1.1, incline: 0.07, roll: -0.04, speed: 0.032, phase: cursor },
        search: `${s.about} ${(s.tags ?? []).join(" ")} ${cat.name}`,
      });
      cursor += arc;
      n++;
    }
    cursor += gap;
  }

  // ── the gate ──
  const channels = [
    { id: "email", label: "Email", sub: owner.links.email },
    { id: "phone", label: "Phone", sub: owner.links.phone },
    { id: "linkedin", label: "LinkedIn", sub: owner.links.linkedin.replace(/^https?:\/\/(www\.)?/, "") },
    { id: "github", label: "GitHub", sub: owner.links.github.replace(/^https?:\/\//, "") },
  ];
  const gateOrbit = ring(channels.length, { radius: 3.85, y: -2.55, incline: 0, roll: 0, speed: -0.08 });
  channels.forEach((c, i) =>
    add({ kind: "channel", id: c.id, sector: "contact", label: c.label, sub: c.sub, shape: "contact", size: 0.5, hue: "violet", orbit: gateOrbit(i), search: "contact reach hire" }),
  );

  return nodes;
}

export const recordNodes = build();
export const nodeByKey = new Map(recordNodes.map((n) => [n.key, n]));
export const nodeIndex = new Map(recordNodes.map((n, i) => [n.key, i]));
export const hasNode = (key: string) => nodeByKey.has(key);

export function nodesOfSector(sector: SectorId) {
  return recordNodes.filter((n) => n.sector === sector);
}

/** the detail card a shard opens, if it has one — the rest open their sector */
export function inspectTargetOf(node: RecordNode): InspectTarget | null {
  return node.kind === "project" || node.kind === "skill" || node.kind === "document" ? { kind: node.kind, id: node.id } : null;
}

/** projects leave the outer ring and bind to the Monolith on a tight, steep orbit */
export function boundOrbit(index: number): Orbit {
  return { radius: 2.05 + (index % 2) * 0.22, y: 0, incline: 0.85 + index * 0.5, roll: index * 0.7, speed: 0.34 - (index % 3) * 0.05, phase: index * 1.9 };
}
