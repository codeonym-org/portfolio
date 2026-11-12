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
    tagline: "Where every Hunter awakens: the whole record in a minute.",
    description:
      "A small bright world, the first one the star reaches. A single crystal holds the record: read the one-minute brief, ask the System a question, or open any sector. Light enough for a phone, quick enough for a hiring team.",
    holds: ["One-minute brief", "The System — an agent that answers from the record", "Experience, projects by guild, skills, CV, contact"],
    audience: "Hiring teams and anyone in a hurry",
    cost: "Light",
  },
  {
    id: "erebus",
    name: "Erebus",
    rank: "S",
    state: "sealed",
    tagline: "The last world before the dark: the record as a world to play.",
    description:
      "A black world at the edge of the system, its crust split by something still burning underneath. The same record as full gameplay: an extended 3D world and rewards that build on what you earned on First Light. Sealed until it is ready.",
    holds: ["Full gameplay", "Extended 3D world", "Rewards built on your progress"],
    audience: "Visitors with time to explore",
    cost: "Heavy",
  },
];

/** the gate `/` opens */
export const defaultGate = gates[0];

export const findGate = (id: string) => gates.find((g) => g.id === id);
