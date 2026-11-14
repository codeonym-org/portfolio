import type { InterviewEntry } from "./types";

/**
 * ── THE INTERVIEW FILE ────────────────────────────────────────
 * His answers to what an HR interview asks, in the first person. The agent
 * answers from this file and from the rest of the record, and from nothing else.
 *
 * How it is filled: a grilling session with the owner, one question at a time.
 * His answer is written here in his words and the entry becomes `confirmed`.
 *
 *  · `from-record` entries were drafted from the record (profile, experience,
 *    organisations). They state nothing new; they wait for his word.
 *  · `open` entries have no answer. The agent says the real Ayoub has to answer.
 *  · `binding` entries are never settled by the agent, even with an answer on file.
 *
 * This repository is public: write nothing here he would not publish.
 */
export const interview: InterviewEntry[] = [
  {
    id: "why-agent-engineering",
    topic: "motivation",
    question: "Why agent engineering?",
    status: "from-record",
    answer:
      "It draws me because it is still frontier work. There is no well-trodden path, so every experiment, and every failure, moves the discipline forward. Traditional software optimises for known paths; agent engineering asks you to build the paradigm, not just implement it.",
  },
  {
    id: "how-you-build",
    topic: "motivation",
    question: "How do you approach building an agent?",
    status: "from-record",
    answer:
      "I don't build AI agents as traditional software. I build them as systems meant to evolve: gaining capability, sharpening reasoning, and getting measurably better with every iteration. That shapes my context engineering, evaluation and observability work.",
  },
  {
    id: "current-role",
    topic: "work",
    question: "What do you do today?",
    status: "from-record",
    answer:
      "I am a Software Engineer at OpenSNZ-Technology in Oujda, since September 2025. I design, build and maintain production agentic AI systems end to end, from prototype to deployment: multi-agent architectures, LLM-driven workflows and integrations between agents and enterprise systems.",
  },
  {
    id: "mentoring",
    topic: "work",
    question: "Have you led or mentored people?",
    status: "from-record",
    answer: "Yes. At OpenSNZ-Technology I mentor and supervise interns on the agent engineering stack: LangGraph, MCP and evaluations.",
  },
  {
    id: "outside-work",
    topic: "work",
    question: "What do you build outside your job?",
    status: "from-record",
    answer:
      "I founded and run two organisations: codeonym-oss, open-source tooling for agentic systems, and codeonym-org, where I build my own products.",
  },
  {
    id: "strengths",
    topic: "strengths",
    question: "What are your strengths?",
    status: "from-record",
    answer:
      "Agentic AI and multi-agent systems first, then prompt and context engineering. Behind them, backend and frontend engineering, so I can ship an agent from its reasoning to the screen the user sees.",
  },
  {
    id: "languages",
    topic: "practical",
    question: "Which languages do you speak?",
    status: "from-record",
    answer: "Arabic is my native language. I am proficient in English, and I use French for technical work.",
  },
  {
    id: "location",
    topic: "practical",
    question: "Where are you based?",
    status: "from-record",
    answer: "In Oujda, Morocco.",
  },
  { id: "weakness", topic: "strengths", question: "What is a weakness you are working on?", status: "open" },
  { id: "hardest-problem", topic: "work", question: "What is the hardest problem you solved, and what did it teach you?", status: "open" },
  { id: "failure", topic: "work", question: "Tell me about something that failed, and what you changed after it.", status: "open" },
  { id: "team-style", topic: "work", question: "How do you like to work in a team?", status: "open" },
  { id: "looking-for", topic: "motivation", question: "What are you looking for in your next role?", status: "open" },
  { id: "next-years", topic: "motivation", question: "Where do you want to be in a few years?", status: "open" },
  { id: "open-to-offers", topic: "practical", question: "Are you open to new opportunities right now?", status: "open" },
  { id: "remote-relocation", topic: "practical", question: "Would you work remotely, or relocate?", status: "open" },
  { id: "contract", topic: "terms", question: "Which kinds of contract do you take: employment, freelance, part time?", status: "open", binding: true },
  { id: "start-date", topic: "terms", question: "When could you start?", status: "open", binding: true },
  { id: "salary", topic: "terms", question: "What salary do you expect?", status: "open", binding: true },
];
