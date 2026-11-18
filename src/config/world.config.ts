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
    label: "Loading the record",
    name: "CODEONYM",
    role: "Software Engineer · AI Agent Engineer",
    lines: ["Raising the Monolith…", "Hanging the record in orbit…", "Linking the six sections…", "Waking the agent…"],
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
    /** the way into the room (`system/loader.tsx`) */
    arrival: {
      name: "AYOUB",
      sub: "is coming into the room",
      lines: ["Setting up the office…", "Bringing my avatar in…", "Taking my seat…", "Warming up my voice…"],
    },
    exit: "Exit",
    exitLabel: "Leave the interview, back to the record",
    modes: { text: "TEXT", audio: "AUDIO" },
    /** the same two, as the switch shows them */
    modeNames: { text: "Type", audio: "Speak" },
    switchLabel: "Ask by text or by voice",
    /** how he answers: aloud (and in text), or in text only */
    replies: {
      voice: "Voice",
      text: "Text only",
      label: "My replies: spoken aloud, or text only",
      blocked: "This tab may not play sound yet: my replies are in text until you click or press a key",
    },
    transcript: "Transcript",
    /** the transcript as a PDF to keep (`interview/transcript-pdf.tsx`): from the top bar, or asked of the agent */
    pdf: {
      open: "PDF",
      label: "Download the transcript of this interview as a PDF",
      making: "Preparing the PDF…",
      done: "Transcript downloaded",
      failed: "The PDF could not be made",
      empty: "Ask a question first: the transcript is still empty",
      keep: "Take this interview with you",
      keepSub: (n: number) => `PDF · ${n === 1 ? "1 question" : `${n} questions`}, timed · with my card`,
      action: "Download PDF",
    },
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
      kinds: { skills: "Skills", map: "Map", sector: "Section", case: "Case file", brief: "Brief", github: "GitHub", project: "Project", document: "Document", skill: "Skill" },
      now: "Now",
      earlier: "Earlier",
      before: "Before your first question",
      from: (n: number) => `for question ${n}`,
      prev: "The one before",
      next: "The next one",
      /** the way back along what was opened from a thing on the table */
      backTo: (title: string) => `Back to ${title}`,
      /** the record as the table shows it (`interview/exhibits.tsx`) */
      ex: {
        kinds: { skill: "Skill", project: "Project", document: "Document" },
        grade: "Grade",
        mastery: "Mastery",
        sets: "Which skills",
        setNames: { job: "Technical", secondary: "Beyond the job" } as Record<string, string>,
        legend: "Grades by mastery: S 90+ · A 85+ · B 78+ · C below",
        facts: { org: "Organisations", based: "Based in", languages: "Languages" },
        about: "About me",
        strengths: "Strengths",
        knownFor: "Known for",
        experience: "Experience",
        education: "Education",
        atWork: (org: string) => `At ${org}`,
        details: "Details",
        cv: "Curriculum vitae",
        viewCv: "View the CV",
        downloadCv: "Download the CV",
        contactLead: "Any of these reaches me directly: agentic systems, multi-agent architectures, or a good conversation about AI.",
        channels: { email: "Email", phone: "Phone", linkedin: "LinkedIn", github: "GitHub" },
        myCard: "My business card",
        copyEmail: "Copy my email",
        copied: "Copied",
        usedIn: "In my projects",
        alsoIn: (category: string) => `Also in ${category}`,
        workProject: "Work project",
        ownProject: "Personal project",
        whatIDid: "What I did",
        stack: "Stack",
        source: "Source",
        docs: "Documentation",
        openSection: (name: string) => `Open ${name}`,
        openLink: "Open",
      },
    },
    card: { open: "Card", label: "My business card", hint: "Press the card to turn it", flip: "Turn", save: "Save contact", copy: "Copy email", copied: "Copied", close: "Close" },
    send: "Enter to send",
    sendShort: "to send",
    placeholder: "Ask me anything…",
    hold: "Hold to talk",
    holdSub: "Release when you are done",
    phaseTitles: { listening: "Listening…", decoding: "Hearing you…", thinking: "Thinking…", speaking: "Speaking" },
    phaseSubs: { listening: "Release to send", decoding: "Turning your words into text", thinking: "Working on my answer", speaking: "Hold to interrupt me" },
    noVoiceShort: "No microphone here",
    noVoice: "This browser cannot record your voice. Switch to Type at the top.",
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
  /** my GitHub activity (`interface/github-activity.tsx`), live from GitHub */
  github: {
    title: "My GitHub",
    /** the button in both top bars */
    short: "GitHub",
    label: "My GitHub, live: contributions, streaks, languages",
    kicker: "Live from GitHub",
    /** over the home window's title, where the view's own kicker already says live */
    eyebrow: "My work in the open",
    open: "My GitHub",
    lead: "What I have shipped in the open, as GitHub counts it, read live.",
    lastYear: "contributions in the last year",
    since: (year: string) => `since ${year}`,
    calendar: "The last twelve months",
    less: "Less",
    more: "More",
    on: (n: number) => (n === 1 ? "1 contribution" : `${n} contributions`),
    none: "No contributions",
    stats: { commits: "Commits", pullRequests: "Pull requests", issues: "Issues", merged: "PRs merged, all time" },
    streak: "Current streak",
    longest: "Longest streak",
    active: "Active days",
    days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    ofYear: (n: number) => `of ${n}`,
    best: "Busiest day",
    rhythm: "My week",
    years: "Year by year",
    languages: "Languages",
    languagesNote: "By size of code, across the public repositories I worked on",
    repositories: "Most commits this year",
    commits: (n: number) => (n === 1 ? "1 commit" : `${n} commits`),
    private: (n: number) => `${n} of them in private repositories, counted but not shown.`,
    read: (when: string) => `Read ${when}`,
    profile: "See my profile on GitHub",
    loading: "Reading GitHub…",
    failed: "GitHub did not answer just now. My profile is one click away.",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  credits:
    "The Monolith and every shard: generated in Blender for this site (scripts/assets/monolith.py) · Studio light: Studio Kontrast 04, Poly Haven (CC0) · Sounds: Kenney (CC0) · Maps: Natural Earth (public domain), roads © OpenStreetMap contributors",
};
