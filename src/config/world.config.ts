import {
  Backpack,
  DoorOpen,
  Gauge,
  Landmark,
  Skull,
  Swords,
} from "lucide-react";
import type { SectorDef, SectorId } from "./types";

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
    name: "Profile",
    section: "Profile",
    epithet: "who he is and what he is known for",
    icon: Gauge,
    tone: "gold",
    description:
      "Who he is: name, role, what he is known for, strengths, profile, how he works and languages.",
  },
  {
    id: "experience",
    name: "Experience",
    section: "Experience & Education",
    epithet: "where he has worked and studied",
    icon: Landmark,
    tone: "system",
    description:
      "Work experience timeline (OpenSNZ-Technology engagements) and education.",
  },
  {
    id: "projects",
    name: "Projects",
    section: "Projects",
    epithet: "what he has built, at work and on his own",
    icon: Skull,
    tone: "arcane",
    description:
      "His projects: engagements at OpenSNZ, open source (codeonym-oss) and own products (codeonym-org), each with its details and stack.",
  },
  {
    id: "skills",
    name: "Skills",
    section: "Skills",
    epithet: "what he works with",
    icon: Swords,
    tone: "ember",
    description:
      "His skills: technical (AI, agent stack, languages, web, databases, ops) and beyond the job (languages spoken, soft skills, interests), each with a grade.",
  },
  {
    id: "inventory",
    name: "Documents",
    section: "Documents & CV",
    epithet: "the CV, degrees and links",
    icon: Backpack,
    tone: "gold",
    description:
      "Documents: the full CV, links, degrees and interests.",
  },
  {
    id: "contact",
    name: "Contact",
    section: "Contact",
    epithet: "how to reach him",
    icon: DoorOpen,
    tone: "arcane",
    description:
      "Contact channels: email, phone, LinkedIn and GitHub.",
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

export const world = {
  boot: {
    eyebrow: "THE LIVING RECORD",
    name: "CODEONYM",
    role: "Software Engineer · AI Agent Engineer",
    lines: [
      "Locating the Monolith…",
      "Hanging the record in orbit…",
      "Linking the sections…",
      "Starting the System…",
    ],
  },

  hud: {
    indexLabel: "INDEX",
    traceLabel: "RUN TRACE",
    traceIdle: "idle — nothing running",
    paletteHint: "Search the record or run a command…",
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
      body: "This is the record of Ayoub Bouarour. The System can brief you on him in one minute. Accept the briefing?",
    },
  },

  toasts: {
    sectorOpened: "SECTION OPENED",
  },

  /** THE SYSTEM — the agent that lives in the Monolith */
  agent: {
    name: "THE SYSTEM",
    /** how the System addresses whoever is visiting */
    visitor: "Stranger",
    /** the project the System leads a new visitor to first (a project id) */
    flagship: "pharma-mas",
    epithet: "the agent that holds his record",
    greeting:
      "I hold the whole record of Ayoub. Ask me anything, or tell me what to show you. I answer by rearranging this place.",
    placeholder: "Ask the System…",
    thinking: "The System is processing…",
    brief: "One-minute brief",
    suggestions: [
      "Who is Ayoub?",
      "What has he built with agents?",
      "Build the case for hiring him",
      "Show me his projects",
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
    title: "The System · where he is based",
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
