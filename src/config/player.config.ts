import type { Player } from "./types";

/**
 * ── THE OWNER'S PROFILE ───────────────────────────────────────
 * Who the record is about: shown in the Profile window, the brief and Contact.
 * Strength values are 0–100, his own estimate.
 */
export const player: Player = {
  name: "BOUAROUR AYOUB",
  firstName: "Ayoub",
  handle: "codeonym",
  title: "AI Agent Engineer",
  job: "Software Engineer",
  location: "Oujda, Morocco",
  base: { city: "Oujda", country: "Morocco", lat: 34.68, lon: -1.91, timeZone: "Africa/Casablanca", countryCentre: { lon: -8.6, lat: 29.2 } },
  guild: "OpenSNZ-Technology",
  titles: [
    {
      id: "agent-summoner",
      name: "Agents that improve",
      description:
        "Builds AI agents as systems that gain skills and get better with each iteration, never as static software.",
    },
    {
      id: "citadel-architect",
      name: "Multi-agent architect",
      description:
        "Designed the modular multi-agent architecture behind the pharmaceutical catalog system.",
    },
    {
      id: "gate-opener",
      name: "Agents on enterprise data",
      description:
        "Connects agents to enterprise and legacy systems through MCP.",
    },
    {
      id: "guild-master",
      name: "Founder of two organisations",
      description:
        "Founded and runs codeonym-oss, open-source tooling for agentic systems, and codeonym-org, his own products.",
    },
    {
      id: "voice-of-three-tongues",
      name: "Three languages",
      description:
        "Speaks Arabic, English and French.",
    },
  ],
  profile: [
    "AI Agent Engineer focused on designing and shipping production-grade multi-agent systems — from LLM-driven workflows to autonomous agents grounded in enterprise data via MCP, and delivered to end users through CopilotKit/AG-UI.",
    "Drawn to agent engineering because it is still frontier work: there is no well-trodden path, so every experiment — and every failure — moves the discipline forward. Traditional software optimizes for known paths; agent engineering asks you to build the paradigm, not just implement it.",
    "Builds agents as systems meant to evolve — gaining capability, sharpening reasoning and getting measurably better with every iteration. That mindset shapes his context engineering, evaluation and observability work.",
  ],
  creed:
    "I don't build AI agents as traditional software. I build them as systems meant to evolve — gaining capability, sharpening reasoning, and getting measurably better with every iteration.",
  stats: [
    { code: "AI", label: "Agentic AI & Multi-Agent Systems", value: 94 },
    { code: "CTX", label: "Prompt & Context Engineering", value: 92 },
    { code: "BE", label: "Backend Engineering", value: 86 },
    { code: "FE", label: "Frontend Engineering", value: 84 },
    { code: "OPS", label: "DevOps & Infrastructure", value: 78 },
    { code: "OBS", label: "Observability (LangSmith / OTel)", value: 80 },
  ],
  links: {
    github: "https://github.com/codeonym",
    linkedin: "https://www.linkedin.com/in/codeonym/",
    email: "bouarourayoub0@gmail.com",
    phone: "+212 627 049 264",
  },
  languages: [
    { name: "Arabic", grade: "Native" },
    { name: "English", grade: "Proficient" },
    { name: "French", grade: "Technical" },
  ],
};
