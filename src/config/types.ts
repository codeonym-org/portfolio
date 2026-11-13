import type { LucideIcon } from "lucide-react";

export type QuestRank = "S" | "A" | "B";
export type QuestStatus = "cleared" | "ongoing";
export type Tone = "system" | "arcane" | "gold" | "ember";
export type Rarity = "legendary" | "epic" | "rare" | "common";

export interface Stat {
  /** short code beside the bar (AI, BE, ...) */
  code: string;
  /** What the stat actually measures */
  label: string;
  /** 0–100 */
  value: number;
}

export interface PlayerLinks {
  github: string;
  linkedin: string;
  email: string;
  /** international format, as printed on the CV */
  phone: string;
}

/** honorific earned through deeds — shown as gold cards at the Awakening Circle */
export interface PlayerTitle {
  id: string;
  name: string;
  /** the deed behind the title, one line */
  description: string;
}

export interface Player {
  name: string;
  /** what the System calls him: it is his companion, so it uses his first name */
  firstName: string;
  handle: string;
  title: string;
  job: string;
  location: string;
  /** where Ayoub lives, for the map card: coordinates of the city, IANA time zone */
  base: { city: string; country: string; lat: number; lon: number; timeZone: string; countryCentre: { lon: number; lat: number } };
  guild: string;
  titles: PlayerTitle[];
  profile: string[];
  creed: string;
  stats: Stat[];
  links: PlayerLinks;
  languages: { name: string; grade: string }[];
}

export type GateRank = "S" | "A" | "B" | "C";

/** one way into the record: a named, ranked page */
export interface Gate {
  /** also the route: /gates/<id> */
  id: string;
  name: string;
  rank: GateRank;
  /** sealed = shown in the Gate Realm, not built yet */
  state: "open" | "sealed";
  tagline: string;
  description: string;
  /** what the visitor finds inside, three short lines */
  holds: string[];
  audience: string;
  /** how much the device has to work: Light or Heavy */
  cost: string;
}

/** what a planet of the Gate Realm is made of: each kind has its own shader branch */
export type PlanetKind = "ocean" | "cracked" | "gas" | "ice" | "lava" | "crystal" | "barren";

/** one world of the Gate Realm; a planet that holds a gate is charted */
export interface Planet {
  id: string;
  /** the gate this planet holds; none = uncharted */
  gate?: string;
  kind: PlanetKind;
  /** distance from the star, in scene units */
  orbit: number;
  /** radius, in scene units */
  size: number;
  /** where on its orbit it starts, in turns (0–1) */
  phase: number;
  /** low ground, high ground, glow */
  palette: [string, string, string];
  ring?: "full" | "broken";
  moons?: number;
  /** axial tilt, radians */
  tilt: number;
}

/** an organization Ayoub works in */
export interface Guild {
  id: string;
  name: string;
  /** Ayoub's role there: employed, or founder and maintainer */
  role: "Engineer" | "Founder";
  /** what kind of place it is, in two words */
  kind: string;
  summary: string;
  link?: string;
}

export interface Quest {
  id: string;
  name: string;
  rank: QuestRank;
  type: "main" | "side";
  /** must match a Guild id (guilds.config) */
  guild: string;
  /** personal projects only: released, or still being built */
  stage?: "released" | "in development";
  status: QuestStatus;
  period?: string;
  summary: string;
  details: string[];
  /** tech stack, framed as quest rewards */
  rewards: string[];
  link?: string;
  /** documentation site, when the project has one */
  docs?: string;
}

/** job = Ayoub's craft; secondary = everything the job isn't */
export type SkillSet = "job" | "secondary";

export interface SkillSetDef {
  id: SkillSet;
  name: string;
  /** one-line intro rendered under the set heading */
  blurb: string;
}

export interface SkillCategoryDef {
  id: string;
  name: string;
  icon: LucideIcon;
  set: SkillSet;
  tone: Tone;
}

export interface SkillDetail {
  id: string;
  name: string;
  icon: LucideIcon;
  /** must match a SkillCategoryDef id */
  category: string;
  rarity: Rarity;
  /** 0–100 mastery, drives the gauge and grade */
  mastery: number;
  /** flavor description shown on the inspect card */
  lore: string;
  tags?: string[];
}

/** what the inspect card is currently showing */
export interface InspectTarget {
  kind: "skill" | "item" | "quest";
  id: string;
}

export interface ChronicleEntry {
  id: string;
  role: string;
  organization: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface Achievement {
  id: string;
  title: string;
  issuer: string;
  period: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: LucideIcon;
  /** must match an InventoryCategory id */
  category: string;
  rarity: Rarity;
  /** provenance line (issuer · period) shown under the item name */
  meta?: string;
  /** flavor description shown on the inspect card */
  lore: string;
  tags?: string[];
  /** USE-ing this item opens a destination: a zone panel or the CV */
  unlocks?: Destination;
  /** USE-ing this item opens an external destination */
  link?: string;
}

export interface Vital {
  code: string;
  label: string;
  reading: string;
  /** 0–100 */
  percent: number;
  tone: "ember" | "system";
  icon: LucideIcon;
}

export interface AmbientEvent {
  heading: string;
  body: string;
  tone: Tone;
}

export interface SystemConfig {
  /** release number, surfaced to agents in the snapshot */
  version: string;
  /** HP/SP-style gauges shown at the Awakening Circle */
  vitals: Vital[];
  /** ambient System notifications — one surfaces every eventIntervalMs ± jitter */
  ambientEvents: AmbientEvent[];
  /** average ms between ambient notifications */
  eventIntervalMs: number;
  runtimeError: SystemScreenCopy & { retry: string };
  notFound: SystemScreenCopy & { cta: string };
}

/** Copy for a full-viewport System interrupt screen (device gate, crash, 404). */
export interface SystemScreenCopy {
  error: string;
  heading: string;
  title: string;
  body: string;
  footer: string;
}

/* ─────────────────────────── THE RECORD ─────────────────────────── */

/** the six sectors of the record — each one is a ring of shards around the Monolith */
export type SectorId =
  | "status"
  | "experience"
  | "projects"
  | "skills"
  | "inventory"
  | "contact";

/** where a USE / link / agent command can send the visitor */
export type Destination = SectorId | "cv";

export interface SectorDef {
  id: SectorId;
  /** in-world name shown on beacons, the index and the window */
  name: string;
  /** what the window holds, in plain words (e.g. "Status & Profile") */
  section: string;
  /** one-line flavor under the name */
  epithet: string;
  icon: LucideIcon;
  tone: Tone;
  /** agent-facing routing hint (exposed through src/agent) */
  description: string;
}

/** visitor-side objectives — completing them levels the visitor up */
export interface VisitorQuest {
  id: string;
  name: string;
  /** objective line under the name */
  objective: string;
  xp: number;
}
