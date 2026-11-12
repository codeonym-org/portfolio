import type { Guild } from "./types";

/**
 * ── GUILDS ────────────────────────────────────────────────────
 * The organizations the Player works in, and the role held in each.
 * Every quest names its guild (`Quest.guild` = a guild id), so a gate
 * and the agent can group projects by guild.
 * "Engineer" = employed there; "Guild Master" = founded and runs it.
 */
export const guilds: Guild[] = [
  {
    id: "opensnz",
    name: "OpenSNZ-Technology",
    role: "Engineer",
    kind: "employer",
    summary: "The company the Player works for: production agentic AI systems, from prototype to deployment.",
  },
  {
    id: "codeonym-oss",
    name: "codeonym-oss",
    role: "Guild Master",
    kind: "open source",
    summary: "Open-source tooling for agentic systems — built in the open, shared with the community.",
    link: "https://github.com/codeonym-oss",
  },
  {
    id: "codeonym-org",
    name: "codeonym-org",
    role: "Guild Master",
    kind: "own products",
    summary: "Production-grade software and AI agent systems — from personal ventures to professional engagements.",
    link: "https://github.com/codeonym-org",
  },
];

export const findGuild = (id: string) => guilds.find((g) => g.id === id);
