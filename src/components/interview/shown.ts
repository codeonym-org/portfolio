import { findItem } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill } from "@/config/skills.config";
import { sectorById, world } from "@/config/world.config";
import type { Card } from "@/store/session-store";
import type { Laid } from "./table-store";

/**
 * ── WHAT I SHOWED, BY NAME ────────────────────────────────────
 * The names of what an answer put on the table, for the table's own
 * tabs and for the transcript ("Section · Projects").
 */

const copy = world.interview;
const kinds = copy.table.kinds;

/** the name of what is inspected */
export function inspected(kind: "skill" | "item" | "quest", id: string): string {
  if (kind === "skill") return findSkill(id)?.name ?? id;
  if (kind === "item") return findItem(id)?.name ?? id;
  return quests.find((q) => q.id === id)?.name ?? id;
}

/** a card drawn under an answer, by kind and name */
export function cardShown(card: Card): string {
  if (card.type === "skills") {
    const names = card.ids.map((id) => findSkill(id)?.name ?? id);
    return `${kinds.skills} · ${card.title ?? names.slice(0, 4).join(", ") + (names.length > 4 ? ` +${names.length - 4}` : "")}`;
  }
  if (card.type === "map") return `${kinds.map} · ${world.map.title}`;
  return `${kinds.case} · ${card.file.title}`;
}

/** what was laid on the table, by kind and name */
export function laidShown(l: Laid): string {
  if (l.kind === "sector") return `${kinds.sector} · ${sectorById[l.sector].name}`;
  if (l.kind === "case") return `${kinds.case} · ${l.file.title}`;
  if (l.kind === "brief") return world.agent.brief;
  if (l.kind === "github") return `${kinds.github} · ${world.github.title}`;
  const k = l.target.kind === "quest" ? kinds.project : l.target.kind === "item" ? kinds.document : kinds.skill;
  return `${k} · ${inspected(l.target.kind, l.target.id)}`;
}
