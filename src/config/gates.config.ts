import type { Gate } from "./types";

/**
 * ── GATES ─────────────────────────────────────────────────────
 * A gate is one way into the same record: a name, a rank and its own
 * page at `/gates/<id>`. Every gate shares the record (this folder)
 * and the agent; a gate brings its presentation and its actions.
 * Rank is an attribute — several gates may share one.
 * `sealed` gates are listed in the catalog but cannot be entered yet.
 * The order here is the order of the catalog.
 */
export const gates: Gate[] = [
  {
    id: "the-surface",
    name: "The Surface",
    rank: "C",
    state: "open",
    tagline: "The tip of the iceberg: the whole record in a minute.",
    description:
      "A single crystal holds the record. Read the one-minute brief, ask the System a question, or open any sector. Light enough for a phone, quick enough for a hiring team.",
    holds: ["One-minute brief", "The System — an agent that answers from the record", "Experience, projects by guild, skills, CV, contact"],
    audience: "Hiring teams and anyone in a hurry",
    cost: "Light",
  },
  {
    id: "the-deep",
    name: "The Deep",
    rank: "S",
    state: "sealed",
    tagline: "Below the waterline: the record as a world to play.",
    description:
      "The same record, nine tenths under water: full gameplay, an extended 3D world and rewards that build on what you earned at the surface. Not open yet.",
    holds: ["Full gameplay", "Extended 3D world", "Rewards built on your progress"],
    audience: "Visitors with time to explore",
    cost: "Heavy",
  },
];

/** the gate `/` opens */
export const defaultGate = gates[0];

export const findGate = (id: string) => gates.find((g) => g.id === id);
