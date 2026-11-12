import {
  Coffee,
  Flag,
  Gamepad2,
  Gem,
  GraduationCap,
  IdCard,
  KeyRound,
  Medal,
  Scroll,
  Shield,
  Waypoints,
} from "lucide-react";
import type { InventoryCategory, InventoryItem } from "./types";

/**
 * ── INVENTORY ─────────────────────────────────────────────────
 * The Player's possessions — actual items, not skills (those live
 * in skills.config). rarity drives the tile glow: legendary (gold)
 * > epic (arcane purple) > rare (system blue) > common. Clicking
 * an item opens its lore in the INSPECT card; items with `unlocks`
 * or `link` can be USE-d from there.
 */
export const inventoryCategories: InventoryCategory[] = [
  { id: "artifacts", name: "ARTIFACTS", icon: KeyRound },
  { id: "credentials", name: "CREDENTIALS", icon: Medal },
  { id: "curios", name: "CURIOS", icon: Gem },
];

export const inventoryItems: InventoryItem[] = [
  // ── ARTIFACTS ───────────────────────────────────────────────
  {
    id: "hunter-license",
    name: "Hunter's License",
    icon: IdCard,
    category: "artifacts",
    rarity: "legendary",
    meta: "ISSUED BY THE SYSTEM · ALWAYS CARRIED",
    lore: "Official proof of the Player's rank, raids and titles. USE it to project the full record — the complete CV, ready to extract.",
    tags: ["cv", "resume", "official-record"],
    unlocks: "cv",
  },
  {
    id: "guild-crest",
    name: "Guild Crest — OpenSNZ",
    icon: Shield,
    category: "artifacts",
    rarity: "epic",
    meta: "OPENSNZ-TECHNOLOGY · 2025/09 – PRESENT",
    lore: "Emblem of the guild the Player fights for. Grants access to the guild's raids: agentic AI systems from prototype to production.",
    tags: ["guild", "employment"],
  },
  {
    id: "summoning-stone",
    name: "Summoning Stone",
    icon: Waypoints,
    category: "artifacts",
    rarity: "rare",
    meta: "SINGLE-TARGET · INFINITE CHARGES",
    lore: "Carries a voice across any distance. USE it to open the Gate and call the Player to your party.",
    tags: ["contact", "party"],
    unlocks: "contact",
  },
  {
    id: "gate-key",
    name: "Gate Key",
    icon: KeyRound,
    category: "artifacts",
    rarity: "rare",
    meta: "FITS ONE LOCK · THIS ONE",
    lore: "Opens the very Gate you are standing in. USE it to inspect the source of this System on GitHub.",
    tags: ["source", "github"],
    link: "https://github.com/codeonym-org/portfolio",
  },

  // ── CREDENTIALS ─────────────────────────────────────────────
  {
    id: "master-sigil",
    name: "Master's Sigil",
    icon: GraduationCap,
    category: "credentials",
    rarity: "epic",
    meta: "FACULTY OF SCIENCES (FSO), OUJDA · 2023 – 2025",
    lore: "Specialized Master in Computer Science Engineering. Forged over two years of advanced study — the seal that marks a hunter as classed.",
    tags: ["degree", "computer-science"],
  },
  {
    id: "bachelor-crest",
    name: "Bachelor's Crest",
    icon: Medal,
    category: "credentials",
    rarity: "rare",
    meta: "FACULTY OF SCIENCES (FSO), OUJDA · 2019 – 2023",
    lore: "Bachelor's Degree in Mathematics and Computer Sciences. The foundation arc — where the Player's stats were first rolled.",
    tags: ["degree", "mathematics"],
  },
  {
    id: "bac-scroll",
    name: "Baccalaureate Scroll",
    icon: Scroll,
    category: "credentials",
    rarity: "common",
    meta: "ESSAADIYINE HIGH SCHOOL · 2019",
    lore: "Scientific Baccalaureate in Physical Sciences. The tutorial-clear certificate — every long questline starts somewhere.",
    tags: ["diploma"],
  },

  // ── CURIOS ──────────────────────────────────────────────────
  {
    id: "ctf-flag",
    name: "Captured Flag",
    icon: Flag,
    category: "curios",
    rarity: "rare",
    meta: "TROPHY · TRAINING DUNGEONS",
    lore: "Taken from a CTF training dungeon. Slightly scorched. The Player keeps it as proof that locks are just puzzles with attitude.",
    tags: ["ctf", "security"],
  },
  {
    id: "legacy-controller",
    name: "Legacy Controller",
    icon: Gamepad2,
    category: "curios",
    rarity: "epic",
    meta: "ORIGIN ITEM · SOULBOUND",
    lore: "The relic that started everything. Countless hours of leveling game characters — until the Player decided to level real ones instead.",
    tags: ["gaming", "origin"],
  },
  {
    id: "mana-crystal",
    name: "Mana Crystal",
    icon: Coffee,
    category: "curios",
    rarity: "common",
    meta: "CONSUMABLE · RESTOCKS DAILY",
    lore: "Crystallized focus, served hot. Restores concentration; mildly addictive; the System does not judge.",
    tags: ["coffee", "fuel"],
  },
];

export function findItem(id: string): InventoryItem | undefined {
  return inventoryItems.find((item) => item.id === id);
}
