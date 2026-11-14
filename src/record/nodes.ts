import { achievements, chronicle } from "@/config/chronicle.config";
import { inventoryItems } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skills } from "@/config/skills.config";
import type { InspectTarget, Rarity, SectorId } from "@/config/types";
import { seeded, type Orbit } from "./layout";

/**
 * ── THE RECORD, AS SHARDS ─────────────────────────────────────
 * Every entity in `src/config` becomes one shard in orbit. This is
 * the single index the scene, the palette and the case file share:
 * a node's `key` is `<kind>:<id>` everywhere.
 */

export type NodeKind = "player" | "title" | "experience" | "education" | "quest" | "skill" | "item" | "channel";

/** what a shard glows with */
export type NodeHue = "gold" | "arcane" | "system" | "ember" | "bone";

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

const rarityHue: Record<Rarity, NodeHue> = { legendary: "gold", epic: "arcane", rare: "system", common: "bone" };
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
    kind: "player",
    id: "player",
    sector: "status",
    label: player.name,
    sub: player.title,
    shape: "status",
    size: 0.62,
    hue: "gold",
    orbit: { radius: 0, y: 3.35, incline: 0, roll: 0, speed: 0, phase: 0 },
    search: `${player.handle} ${player.job} profile status who`,
  });
  const titleOrbit = ring(player.titles.length, { radius: 1.25, y: 3.35, incline: 0.32, roll: 0.1, speed: 0.22 });
  player.titles.forEach((t, i) =>
    add({ kind: "title", id: t.id, sector: "status", label: t.name, sub: "TITLE", shape: "status", size: 0.2, hue: "gold", orbit: titleOrbit(i), search: t.description }),
  );

  // ── the chronicle ──
  const chapters = chronicle.length + achievements.length;
  const chapterOrbit = ring(chapters, { radius: 3.3, y: 0.3, incline: 0.52, roll: 0.22, speed: 0.085 });
  chronicle.forEach((c, i) =>
    add({ kind: "experience", id: c.id, sector: "experience", label: c.role, sub: c.period, shape: "experience", size: 0.5, hue: "system", orbit: chapterOrbit(i), search: `${c.organization} ${c.highlights.join(" ")}` }),
  );
  achievements.forEach((a, i) =>
    add({ kind: "education", id: a.id, sector: "experience", label: a.title, sub: a.period, shape: "experience", size: 0.36, hue: "bone", orbit: chapterOrbit(chronicle.length + i), search: a.issuer }),
  );

  // ── the projects: the widest blades in the sky ──
  const questOrbit = ring(quests.length, { radius: 4.85, y: 0, incline: 0.17, roll: -0.13, speed: 0.06 });
  quests.forEach((q, i) =>
    add({
      kind: "quest",
      id: q.id,
      sector: "projects",
      label: q.name,
      sub: `RANK ${q.rank} · ${q.status.toUpperCase()}`,
      shape: "projects",
      size: q.rank === "S" ? 0.78 : q.rank === "A" ? 0.62 : 0.52,
      hue: q.rank === "S" ? "gold" : "arcane",
      orbit: questOrbit(i),
      search: `${q.summary} ${q.rewards.join(" ")} project`,
    }),
  );

  // ── the vault ──
  const itemOrbit = ring(inventoryItems.length, { radius: 6.15, y: -0.25, incline: -0.36, roll: 0.08, speed: 0.045 });
  inventoryItems.forEach((item, i) =>
    add({ kind: "item", id: item.id, sector: "inventory", label: item.name, sub: item.meta, shape: "inventory", size: 0.34, hue: rarityHue[item.rarity], orbit: itemOrbit(i), search: `${item.lore} ${(item.tags ?? []).join(" ")}` }),
  );

  // ── the arsenal: a belt of slivers, one cluster per category ──
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
        hue: rarityHue[s.rarity],
        orbit: { radius: 7.6 + seeded(n, 1) * 1.1, y: (seeded(n, 2) - 0.5) * 1.1, incline: 0.07, roll: -0.04, speed: 0.032, phase: cursor },
        search: `${s.lore} ${(s.tags ?? []).join(" ")} ${cat.name}`,
      });
      cursor += arc;
      n++;
    }
    cursor += gap;
  }

  // ── the gate ──
  const channels = [
    { id: "email", label: "Email", sub: player.links.email },
    { id: "phone", label: "Phone", sub: player.links.phone },
    { id: "linkedin", label: "LinkedIn", sub: player.links.linkedin.replace(/^https?:\/\/(www\.)?/, "") },
    { id: "github", label: "GitHub", sub: player.links.github.replace(/^https?:\/\//, "") },
  ];
  const gateOrbit = ring(channels.length, { radius: 3.85, y: -2.55, incline: 0, roll: 0, speed: -0.08 });
  channels.forEach((c, i) =>
    add({ kind: "channel", id: c.id, sector: "contact", label: c.label, sub: c.sub, shape: "contact", size: 0.5, hue: "arcane", orbit: gateOrbit(i), search: "contact reach hire" }),
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
  return node.kind === "quest" || node.kind === "skill" || node.kind === "item" ? { kind: node.kind, id: node.id } : null;
}

/** projects leave the outer ring and bind to the Monolith on a tight, steep orbit */
export function boundOrbit(index: number): Orbit {
  return { radius: 2.05 + (index % 2) * 0.22, y: 0, incline: 0.85 + index * 0.5, roll: index * 0.7, speed: 0.34 - (index % 3) * 0.05, phase: index * 1.9 };
}
