import {
  Backpack,
  DoorOpen,
  Gauge,
  Landmark,
  Skull,
  Swords,
} from "lucide-react";
import type { SectorDef, SectorId, VisitorQuest } from "./types";

/**
 * ── THE RECORD ────────────────────────────────────────────────
 * There are no pages. THE SYSTEM's body, the Monolith, floats in the
 * void and the whole record orbits it as shards. Each sector below is
 * one ring of shards and one window. A visitor reaches them by asking
 * the System, by the index, by the palette, or by touching a shard.
 *
 * The order here is the order of the index (keys 1–6).
 */
export const sectors: SectorDef[] = [
  {
    id: "status",
    name: "The Player",
    section: "Status & Profile",
    epithet: "the one the System chose",
    icon: Gauge,
    tone: "gold",
    description:
      "Player identity: name, job, rank, level, titles, core stats, profile, creed and languages.",
  },
  {
    id: "experience",
    name: "Chronicle",
    section: "Experience & Education",
    epithet: "every contract the Player has signed",
    icon: Landmark,
    tone: "system",
    description:
      "Work experience timeline (OpenSNZ-Technology engagements) and education.",
  },
  {
    id: "projects",
    name: "Shadows",
    section: "Projects",
    epithet: "fallen quests, waiting for a command",
    icon: Skull,
    tone: "arcane",
    description:
      "Projects, framed as fallen shadows. Each dormant blade is one quest (project); commanding ARISE wakes it, unseals its details and binds it to the Monolith.",
  },
  {
    id: "skills",
    name: "Arsenal",
    section: "Skills",
    epithet: "the kit of a job-class awakened",
    icon: Swords,
    tone: "ember",
    description:
      "The skill tree: job skills (AI, agent stack, languages, web, databases, ops) and secondary skills (languages spoken, soft skills, pursuits), each with a mastery grade.",
  },
  {
    id: "inventory",
    name: "Vault",
    section: "Inventory & CV",
    epithet: "relics, credentials, and the Hunter's License",
    icon: Backpack,
    tone: "gold",
    description:
      "Possessions: artifacts (the Hunter's License holds the full CV), credentials (degrees) and curios.",
  },
  {
    id: "contact",
    name: "The Gate",
    section: "Contact",
    epithet: "step through to reach the Player",
    icon: DoorOpen,
    tone: "arcane",
    description:
      "Contact channels — GitHub, LinkedIn and email. How to reach the Player and form a party.",
  },
];

export const sectorById = Object.fromEntries(sectors.map((s) => [s.id, s])) as Record<
  SectorId,
  SectorDef
>;

export const sectorIds = sectors.map((s) => s.id);

export function isSectorId(value: string): value is SectorId {
  return value in sectorById;
}

/** visitor objectives, tracked as SYNC and persisted per browser */
export const visitorQuests: VisitorQuest[] = [
  {
    id: "awaken",
    name: "Awakening",
    objective: "Address the System",
    xp: 100,
  },
  {
    id: "brief",
    name: "Read the Brief",
    objective: "Open the one-minute brief",
    xp: 100,
  },
  {
    id: "explore",
    name: "Cartographer",
    objective: "Open every sector of the record",
    xp: 300,
  },
  {
    id: "arise",
    name: "Shadow Extraction",
    objective: "Command every fallen quest to ARISE",
    xp: 400,
  },
  {
    id: "license",
    name: "Credentials Check",
    objective: "Inspect the Hunter's License",
    xp: 150,
  },
  {
    id: "party",
    name: "Form a Party",
    objective: "Reach the Gate",
    xp: 150,
  },
];

/** XP needed to go from level n to n+1 */
export const xpPerLevel = 250;

export const world = {
  boot: {
    eyebrow: "THE LIVING RECORD",
    name: "CODEONYM",
    role: "Software Engineer · AI Agent Engineer",
    lines: [
      "Locating the Monolith…",
      "Sealing the fractures…",
      "Hanging the record in orbit…",
      "Waking the System…",
    ],
  },

  hud: {
    syncLabel: "SYNC",
    questsLabel: "SYSTEM QUESTS",
    indexLabel: "INDEX",
    traceLabel: "RUN TRACE",
    traceIdle: "idle — nothing running",
    paletteHint: "Search the record or run a command…",
    arise: "ARISE",
    ariseAll: "ARISE — ALL",
    plain: "plain record",
    gates: "gates",
  },

  /** what the System asks in its dialog */
  prompts: {
    heading: "SYSTEM",
    accept: "Accept",
    decline: "Later",
    refuse: "Not now",
    keys: "Y to accept · N or Esc for later",
    offerKeys: "Y to accept · N to refuse · Esc to ignore",
    offerHeading: "THE SYSTEM PROPOSES",
    greeting: {
      heading: "A STRANGER HAS ENTERED",
      body: "You stand before the record of the Player. The System can brief you on him in one minute. Accept the briefing?",
    },
  },

  toasts: {
    sectorOpened: "SECTOR OPENED",
    questComplete: "QUEST COMPLETE",
    levelUp: "LEVEL UP",
    arise: "ARISE",
    ariseBody: "has risen. It is bound to the Monolith.",
    allComplete:
      "Every record unlocked. The Player would be glad to hear from you — the Gate is open.",
  },

  /** THE SYSTEM — the agent that lives in the Monolith */
  agent: {
    name: "THE SYSTEM",
    /** how the System addresses whoever is visiting (it keeps its distance: it serves the Player, not them) */
    visitor: "Stranger",
    /** the project the System leads a new visitor to first (a quest id) */
    flagship: "pharma-mas",
    epithet: "the entity that chose the Player",
    greeting:
      "You have been noticed. I hold the whole record of the Player — ask me anything, or tell me what to show you. I answer by rearranging this place.",
    placeholder: "Ask the System…",
    thinking: "The System is processing…",
    brief: "One-minute brief",
    suggestions: [
      "Who is the Player?",
      "What has he built with agents?",
      "Build the case for hiring him",
      "Raise a shadow for me",
      "How do I reach him?",
    ],
    offline: "The link to the System is down. I am answering from the local index — it can open anything, but it cannot reason.",
    footer: "AI · LangChain agent over AG-UI — answers can be wrong; the CV is the source of truth.",
    /** hold-to-talk: the System's voice (a second agent that delegates to this one) */
    voice: {
      key: "V",
      hold: "Hold to speak",
      listening: "LISTENING",
      decoding: "DECODING VOICE",
      thinking: "THE SYSTEM CONSIDERS",
      speaking: "THE SYSTEM SPEAKS",
      nothingHeard: "The System heard only silence. Hold the key while you speak.",
      micBlocked: "The System cannot hear you — allow the microphone for this site.",
      unsupported: "This browser cannot record your voice.",
      muted: "Sound is off — the System answers in captions.",
      tasks: "DELEGATED TASKS",
    },
  },

  /** the holographic map (`interface/holo-map.tsx`) */
  map: {
    title: "The System · where the Player is",
    open: "Open the hologram",
    level: "Level",
    time: "His local time",
    hint: "Drag to turn · wheel or pinch to zoom · ← → to change level · Esc to close",
    rings: "Rings at 2, 5 and 10 km. Main roads of the city.",
    noRoads: "Rings at 2, 5 and 10 km.",
    loading: "Projecting…",
    failed: "The map data could not be loaded. The position is still shown.",
    credits: "Land and borders: Natural Earth (public domain) · Roads: © OpenStreetMap contributors",
  },
  credits:
    "The Monolith and every shard: generated in Blender for this site (scripts/assets/monolith.py) · Studio light: Studio Kontrast 04, Poly Haven (CC0) · Sounds: Kenney (CC0) · Maps: Natural Earth (public domain), roads © OpenStreetMap contributors",
};
