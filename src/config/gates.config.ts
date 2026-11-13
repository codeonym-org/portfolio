import type { Gate } from "./types";

/**
 * ── GATES ─────────────────────────────────────────────────────
 * A gate is one way into the same record: a name, a rank and its own
 * page at `/gates/<id>`. Every gate shares the record (this folder)
 * and the agent; a gate brings its presentation and its actions.
 * Rank is an attribute — several gates may share one.
 * `sealed` gates are shown in the Gate Realm but cannot be entered yet.
 * Each gate is held by one planet of the Gate Realm (`realm.config.ts`).
 */
export const gates: Gate[] = [
  {
    id: "first-light",
    name: "First Light",
    rank: "C",
    state: "open",
    tagline: "Where every stranger begins: the whole record in a minute.",
    description:
      "A small bright world, the first one the star reaches. A single crystal holds the record: read the one-minute brief, ask the System a question, or open any sector. Light enough for a phone, quick enough for a hiring team.",
    holds: ["One-minute brief", "The System — an agent that answers from the record", "Experience, projects by guild, skills, CV, contact"],
    audience: "Hiring teams and anyone in a hurry",
    cost: "Light",
  },
  {
    id: "erebus",
    name: "Erebus",
    rank: "B",
    state: "open",
    tagline: "The last world before the dark: the record as a world to fight through.",
    description:
      "A black world at the edge of the system, hidden under fog that never lifts. Under the fog is a cavern, and in the cavern a ruin: his projects stand there as sealed obelisks, each held by a Warden. Name your hunter, bring a Warden down and say ARISE: the project follows you, and you read what it is. The System runs this world, and it does not follow a script.",
    holds: ["A hunter you name and level", "Ten Wardens, ten projects to raise", "A System that changes the rules as you play", "Progress from First Light comes with you"],
    audience: "Visitors with time to play",
    cost: "Heavy",
  },
];

/** the gate `/` opens */
export const defaultGate = gates[0];

export const findGate = (id: string) => gates.find((g) => g.id === id);
