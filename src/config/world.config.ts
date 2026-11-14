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
    interview: "interview",
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
      body: "This is the record of Ayoub Bouarour. I am his AI replica: I answer as he would. Shall I brief you on myself in one minute?",
    },
  },

  toasts: {
    sectorOpened: "SECTION OPENED",
  },

  /** The replica: an AI that answers as the owner, inside the System */
  agent: {
    name: "THE SYSTEM",
    /** how the System addresses whoever is visiting */
    visitor: "Stranger",
    /** the project the System leads a new visitor to first (a project id) */
    flagship: "pharma-mas",
    epithet: "Ayoub's AI replica",
    greeting:
      "I am Ayoub's AI replica: I answer as he would, from his record. Ask me what you would ask him in an interview, or tell me what to show you.",
    placeholder: "Ask me anything…",
    thinking: "The System is processing…",
    brief: "One-minute brief",
    suggestions: [
      "Tell me about yourself",
      "What have you built with agents?",
      "Why should I hire you?",
      "Show me your projects",
      "Walk me through your experience",
      "How do I reach you?",
    ],
    offline: "My replica is unreachable. The local index answers instead: it can open anything in the record, but it does not speak for Ayoub.",
    /** the permanent label: always visible under the console */
    footer: "AI replica of Ayoub · answers as he would, and can be wrong. The real Ayoub confirms anything binding.",
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

  /** the interview (`/interview`): the avatar alone, and every part of a reply in its own window */
  interview: {
    title: "The interview",
    loading: "Coming into the room",
    modes: { text: "TEXT", audio: "AUDIO" },
    switchLabel: "Answer by text or by voice",
    placeholder: "Ask me anything…",
    hold: "Hold to talk",
    phases: { idle: "hold to talk", listening: "listening", decoding: "hearing you", thinking: "thinking", speaking: "speaking" },
    panes: { words: "Ayoub", you: "You", heard: "You said", tool: "Working", task: "Task", card: "Shown", record: "Opened", question: "A question", notice: "Note" },
    noVoice: "This browser cannot record your voice. Switch to TEXT at the top.",
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
