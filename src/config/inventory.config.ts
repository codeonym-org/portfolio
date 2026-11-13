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
 * ── DOCUMENTS ─────────────────────────────────────────────────
 * The CV, links, degrees and interests. `rarity` only drives the
 * tile's colour. Clicking an item opens its description; items with
 * `unlocks` or `link` can be opened from there.
 * (Ids are kept from before: shared case links point at them.)
 */
export const inventoryCategories: InventoryCategory[] = [
  { id: "artifacts", name: "DOCUMENTS & LINKS", icon: KeyRound },
  { id: "credentials", name: "DEGREES", icon: Medal },
  { id: "curios", name: "INTERESTS", icon: Gem },
];

export const inventoryItems: InventoryItem[] = [
  // ── DOCUMENTS & LINKS ───────────────────────────────────────────────
  {
    id: "hunter-license",
    name: "Curriculum vitae",
    icon: IdCard,
    category: "artifacts",
    rarity: "legendary",
    meta: "PDF · KEPT UP TO DATE",
    lore: "The full CV: experience, projects, skills and education. Open it to read or download the PDF.",
    tags: ["cv", "resume", "official-record"],
    unlocks: "cv",
  },
  {
    id: "guild-crest",
    name: "Employer: OpenSNZ-Technology",
    icon: Shield,
    category: "artifacts",
    rarity: "epic",
    meta: "OPENSNZ-TECHNOLOGY · 2025/09 – PRESENT",
    lore: "Where he works as a software engineer: agentic AI systems, from prototype to production.",
    tags: ["employer", "employment"],
  },
  {
    id: "guild-crest-codeonym",
    name: "codeonym on GitHub",
    icon: Shield,
    category: "artifacts",
    rarity: "epic",
    meta: "CODEONYM-OSS · CODEONYM-ORG · FOUNDER",
    lore: "The two organisations he founded: codeonym-oss, open-source tooling for agentic systems, and codeonym-org, his own products.",
    tags: ["organisations", "open-source", "founder"],
    link: "https://github.com/codeonym-oss",
  },
  {
    id: "summoning-stone",
    name: "Get in touch",
    icon: Waypoints,
    category: "artifacts",
    rarity: "rare",
    meta: "EMAIL · PHONE · LINKEDIN · GITHUB",
    lore: "Opens the contact window, with every way to reach him.",
    tags: ["contact"],
    unlocks: "contact",
  },
  {
    id: "gate-key",
    name: "Source of this site",
    icon: KeyRound,
    category: "artifacts",
    rarity: "rare",
    meta: "GITHUB · PUBLIC REPOSITORY",
    lore: "The code of this portfolio and of its agent, on GitHub.",
    tags: ["source", "github"],
    link: "https://github.com/codeonym-org/portfolio",
  },

  // ── DEGREES ─────────────────────────────────────────────
  {
    id: "master-sigil",
    name: "Master's degree",
    icon: GraduationCap,
    category: "credentials",
    rarity: "epic",
    meta: "FACULTY OF SCIENCES (FSO), OUJDA · 2023 – 2025",
    lore: "Specialized Master in Computer Science Engineering: two years of advanced study.",
    tags: ["degree", "computer-science"],
  },
  {
    id: "bachelor-crest",
    name: "Bachelor's degree",
    icon: Medal,
    category: "credentials",
    rarity: "rare",
    meta: "FACULTY OF SCIENCES (FSO), OUJDA · 2019 – 2023",
    lore: "Bachelor's Degree in Mathematics and Computer Sciences.",
    tags: ["degree", "mathematics"],
  },
  {
    id: "bac-scroll",
    name: "Baccalaureate",
    icon: Scroll,
    category: "credentials",
    rarity: "common",
    meta: "ESSAADIYINE HIGH SCHOOL · 2019",
    lore: "Scientific Baccalaureate in Physical Sciences.",
    tags: ["diploma"],
  },

  // ── INTERESTS ──────────────────────────────────────────────────
  {
    id: "ctf-flag",
    name: "Capture the flag",
    icon: Flag,
    category: "curios",
    rarity: "rare",
    meta: "SECURITY · HOBBY",
    lore: "He plays CTF challenges to keep his security instincts sharp.",
    tags: ["ctf", "security"],
  },
  {
    id: "legacy-controller",
    name: "Video games",
    icon: Gamepad2,
    category: "curios",
    rarity: "epic",
    meta: "WHERE IT STARTED",
    lore: "Years of video games came before the code, and the idea that things grow through practice stayed with him.",
    tags: ["gaming", "origin"],
  },
  {
    id: "mana-crystal",
    name: "Coffee",
    icon: Coffee,
    category: "curios",
    rarity: "common",
    meta: "DAILY",
    lore: "Served hot, every day.",
    tags: ["coffee", "fuel"],
  },
];

export function findItem(id: string): InventoryItem | undefined {
  return inventoryItems.find((item) => item.id === id);
}
