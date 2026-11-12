import type { Player } from "./types";

/**
 * ── PLAYER RECORD ─────────────────────────────────────────────
 * Identity shown at the Awakening Circle, the title screen and the Gate.
 * Stat values are 0–100; stat icons/colors map by `code` in stat-bar.tsx.
 */
export const player: Player = {
  name: "BOUAROUR AYOUB",
  handle: "codeonym",
  title: "AI Agent Engineer",
  job: "Software Engineer",
  location: "Oujda, Morocco",
  guild: "OpenSNZ-Technology",
  // months of XP since the journey began (2019)
  level: 82,
  rank: "A",
  rankNote: "S-RANK ASSESSMENT PENDING",
  titles: [
    {
      id: "agent-summoner",
      name: "Agent Summoner",
      description:
        "Raises AI agents as digital entities that level up, acquire skills and grow — never as static software.",
    },
    {
      id: "citadel-architect",
      name: "Architect of the Citadel",
      description:
        "Designed the modular multi-agent architecture that cleared the S-rank pharmaceutical catalog raid.",
    },
    {
      id: "gate-opener",
      name: "Gate Opener",
      description:
        "Grounds agents in enterprise systems through MCP — opening gates between AI and legacy realms.",
    },
    {
      id: "guild-master",
      name: "Guild Master",
      description:
        "Founded and runs two guilds: codeonym-oss, open-source tooling for agentic systems, and codeonym-org, his own products.",
    },
    {
      id: "voice-of-three-tongues",
      name: "Voice of Three Tongues",
      description:
        "Speaks Arabic, English and French — no party goes unheard.",
    },
  ],
  profile: [
    "AI Agent Engineer focused on designing and shipping production-grade multi-agent systems — from LLM-driven workflows to autonomous agents grounded in enterprise data via MCP, and delivered to end users through CopilotKit/AG-UI.",
    "Drawn to agent engineering because it is still frontier work: there is no well-trodden path, so every experiment — and every failure — moves the discipline forward. Traditional software optimizes for known paths; agent engineering asks you to build the paradigm, not just implement it.",
    "Builds agents as systems meant to evolve — gaining capability, sharpening reasoning and getting measurably better with every iteration. That mindset shapes his context engineering, evaluation and observability work.",
  ],
  creed:
    "I don't build AI agents as traditional software. I build them as systems meant to evolve — gaining capability, sharpening reasoning, and getting measurably better with every iteration. Closer to leveling up a character than shipping a fixed feature.",
  stats: [
    { code: "INT", label: "Agentic AI & Multi-Agent Systems", value: 94 },
    { code: "MP", label: "Prompt & Context Engineering", value: 92 },
    { code: "STR", label: "Backend Engineering", value: 86 },
    { code: "AGI", label: "Frontend Engineering", value: 84 },
    { code: "VIT", label: "DevOps & Infrastructure", value: 78 },
    { code: "PER", label: "Observability (LangSmith / OTel)", value: 80 },
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
