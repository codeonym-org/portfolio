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
    indexLabel: "The record's sections",
    index: "Index",
    traceLabel: "RUN TRACE",
    traceIdle: "idle — nothing running",
    paletteHint: "Search the record or run a command…",
    plain: "Plain record",
    card: "Card",
    cardLabel: "My business card: every way to reach me",
    interview: "Interview me",
    interviewSub: "Talk to my avatar, live",
    interviewLabel: "The interview: talk to my avatar, face to face",
  },

  /** the window in which the agent offers a next step, when it judges one helps (`propose_action`) */
  prompts: {
    accept: "Yes, please",
    refuse: "Not now",
    keys: "Y to accept · N or Esc to close",
    offerKeys: "Y to accept · N to refuse · Esc to ignore",
    offerHeading: "A SUGGESTION",
  },

  toasts: {
    sectorOpened: "SECTION OPENED",
  },

  /** the agent: the owner himself, answering in the first person */
  agent: {
    /** how he addresses whoever is visiting */
    visitor: "Stranger",
    /** his strongest project, first among what is left to see (a project id) */
    flagship: "pharma-mas",
    greeting: "I'm Ayoub, an AI agent engineer. Ask me what you would ask me in an interview, or tell me what to show you.",
    placeholder: "Ask me anything…",
    thinking: "Thinking…",
    brief: "One-minute brief",
    suggestions: [
      "Tell me about yourself",
      "What have you built with agents?",
      "Why should I hire you?",
      "Show me your projects",
      "Walk me through your experience",
      "How do I reach you?",
    ],
    offline: "I can't answer right now. The local index answers instead: it opens anything in the record, but it does not speak for me.",
    /** the permanent label: always visible under the console */
    footer: "Answers are generated from my record and can be wrong · anything binding, I confirm in person.",
    /** hold-to-talk: his voice (a second agent that delegates to this one) */
    voice: {
      key: "V",
      hold: "Hold to speak",
      listening: "LISTENING",
      decoding: "DECODING VOICE",
      thinking: "THINKING",
      speaking: "SPEAKING",
      nothingHeard: "I heard only silence. Hold the key while you speak.",
      micBlocked: "I can't hear you: allow the microphone for this site.",
      unsupported: "This browser cannot record your voice.",
      muted: "Sound is off: I answer in captions.",
      textOnly: "My replies are set to text only: I answer in captions.",
      soundBlocked: "No sound allowed yet: tap anywhere and I speak.",
      tasks: "DELEGATED TASKS",
    },
  },

  /** the interview (`/interview`): the avatar alone, and every part of a reply in its own window */
  interview: {
    title: "The interview",
    loading: "Coming into the room",
    exit: "Exit",
    exitLabel: "Leave the interview, back to the record",
    modes: { text: "TEXT", audio: "AUDIO" },
    switchLabel: "Ask by text or by voice",
    /** how he answers: aloud (and in text), or in text only */
    replies: {
      voice: "Voice",
      text: "Text only",
      label: "My replies: spoken aloud, or text only",
      blocked: "This tab may not play sound yet: my replies are in text until you click or press a key",
    },
    transcript: "Transcript",
    /** the transcript and the history: a book of diaries, one for each conversation (`interview/diary-book.tsx`) */
    diary: {
      label: "Your diaries: every conversation of the last seven days",
      history: "Diaries",
      cover: "Diaries",
      coverSub: "of the conversations with",
      coverName: "Ayoub Bouarour",
      contents: "Contents",
      contentsMore: "Contents, continued",
      none: "No diary yet. Ask me something: each conversation is written here, and kept seven days in this browser.",
      no: "Diary No.",
      begun: "Begun",
      last: "Last written",
      at: "at",
      here: "You are here",
      questions: (n: number) => `${n} ${n === 1 ? "question" : "questions"}`,
      fades: (left: string, on: string) => `Kept 7 days. Fades in ${left}, on ${on}.`,
      open: "Continue this diary",
      read: "Read it",
      tear: "Tear it out",
      tearSure: "Tear it out? It cannot be undone",
      you: "You asked",
      heard: "You said",
      aloud: "Said aloud",
      writing: "he is writing…",
      shown: "He showed you",
      shownWhat: { skills: "his skills", map: "where he is based" } as Record<string, string>,
      cont: "continued",
      fresh: "A fresh page",
      freshNote: "Every new conversation starts a diary of its own.",
      begin: "Begin a new diary",
      endpaper: "This book belongs to the stranger who asks.",
      prev: "Turn back a page",
      next: "Turn the page",
      toContents: "Contents",
      hint: "Drag a page corner, use the arrows, or the keys ← →",
      close: "Close the book",
      resumed: (when: string) => `Your conversation of ${when} is resumed. Open your diaries to read it, or another one.`,
    },
    /** the conversation, on his left (`interview/conversation.tsx`) */
    talk: {
      label: "The conversation",
      name: "Ayoub",
      initials: "AB",
      badge: "AI Agent Engineer",
      status: {
        waiting: "Waiting for your first question",
        ready: "Ready for your next question",
        listening: "Listening…",
        hearing: "Hearing you…",
        thinking: "Thinking…",
        answering: "Answering…",
        speaking: "Speaking",
      },
      you: "You",
      heard: "You said",
      empty: "Ask what you would ask me in an interview, or tell me what to show you.",
      try: "Try asking",
      next: "Ask next",
      earlier: (n: number) => `${n} earlier ${n === 1 ? "question is" : "questions are"} in your diary`,
      latest: "Latest",
      steps: (n: number, took: string) => `${n} ${n === 1 ? "step" : "steps"}${took ? ` · ${took}` : ""}`,
      diary: "Read this conversation in your diary",
      fold: "Fold the conversation",
      unfold: "Unfold the conversation",
      shown: "What I show",
    },
    /** what he shows, on his right (`interview/table.tsx`) */
    table: {
      label: "On the table",
      close: "Put it away",
      back: "Back to the conversation",
      kinds: { skills: "Skills", map: "Map", sector: "Section", case: "Case file", brief: "Brief", project: "Project", document: "Document", skill: "Skill" },
      now: "Now",
      earlier: "Earlier",
      before: "Before your first question",
      from: (n: number) => `for question ${n}`,
      prev: "The one before",
      next: "The next one",
    },
    card: { open: "Card", label: "My business card", hint: "Press the card to turn it", flip: "Turn", save: "Save contact", copy: "Copy email", copied: "Copied", close: "Close" },
    input: "Your question",
    send: "Enter to send",
    placeholder: "Ask me anything…",
    hold: "Hold to talk",
    phases: { idle: "hold to talk", listening: "listening", decoding: "hearing you", thinking: "thinking", speaking: "speaking" },
    noVoice: "This browser cannot record your voice. Switch to TEXT at the top.",
  },

  /** the holographic map (`interface/holo-map.tsx`) */
  map: {
    title: "Where I am based",
    open: "Open the hologram",
    level: "Level",
    time: "My local time",
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
