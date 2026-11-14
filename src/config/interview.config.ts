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
    status: "confirmed",
    answer:
      "It draws me because it is still frontier work. There is no well-trodden path, so every experiment, and every failure, moves the discipline forward. Traditional software optimises for known paths; agent engineering asks you to build the paradigm, not just implement it.",
  },
  {
    id: "how-you-build",
    topic: "motivation",
    question: "How do you approach building an agent?",
    status: "confirmed",
    answer:
      "I don't build AI agents as traditional software. I build them as systems meant to evolve: gaining capability, sharpening reasoning, and getting measurably better with every iteration. That shapes my context engineering, evaluation and observability work.",
  },
  {
    id: "current-role",
    topic: "work",
    question: "What do you do today?",
    status: "confirmed",
    answer:
      "I am a Software Engineer at OpenSNZ-Technology in Oujda, since September 2025. I design, build and maintain production agentic AI systems end to end, from prototype to deployment: multi-agent architectures, LLM-driven workflows and integrations between agents and enterprise systems. Most of all, I lead AiCA, the multi-agent catalog platform I started as an intern, now in production.",
  },
  {
    id: "mentoring",
    topic: "work",
    question: "Have you led or mentored people?",
    status: "confirmed",
    answer: "Yes. At OpenSNZ-Technology I mentor and supervise interns and new recruits on the agent engineering stack: LangGraph, MCP and evaluations.",
  },
  {
    id: "outside-work",
    topic: "work",
    question: "What do you build outside your job?",
    status: "confirmed",
    answer:
      "I founded and run two organisations: codeonym-oss, open-source tooling for agentic systems, and codeonym-org, where I build my own products.",
  },
  {
    id: "strengths",
    topic: "strengths",
    question: "What are your strengths?",
    status: "confirmed",
    answer:
      "Agentic AI and multi-agent systems first, then prompt and context engineering. Behind them, backend and frontend engineering, so I can ship an agent from its reasoning to the screen the user sees.",
  },
  {
    id: "languages",
    topic: "practical",
    question: "Which languages do you speak?",
    status: "confirmed",
    answer: "Arabic is my native language. I am proficient in English, and I use French for technical work.",
  },
  {
    id: "location",
    topic: "practical",
    question: "Where are you based?",
    status: "confirmed",
    answer: "In Oujda, Morocco.",
  },
  {
    id: "weakness",
    topic: "strengths",
    question: "What is a weakness you are working on?",
    status: "confirmed",
    answer: "I'm meticulous. Once I take on a problem, I don't let go until every detail is right. Sometimes that works great: it catches the problems others miss.",
  },
  {
    id: "hardest-problem",
    topic: "work",
    question: "What is the hardest problem you solved, and what did it teach you?",
    status: "confirmed",
    answer:
      "The hardest was AiCA, the project I started on as an intern at OpenSNZ-Technology in early 2025 and still work on today. Back then AI agents were mostly theory: few proven patterns, little tooling, and to most people they were still something foreign. While others hesitated, I was already building. It began as a catalogue analyser and grew into a multi-agent system that answers questions about supplier catalogues, draws charts and writes reports, now running in production with its own evaluations and observability. It taught me that on frontier work there is no map: you build, measure, and let every failure move you forward.",
  },
  {
    id: "failure",
    topic: "work",
    question: "Tell me about something that failed, and what you changed after it.",
    status: "confirmed",
    answer:
      "Early on in AiCA, version 0.5, we built the multi-agent system on the known patterns: swarms, a supervisor, and so on. It hit a performance ceiling we could never get past, whatever we tried. So I took a gamble: I reworked the whole architecture from scratch on new standards, throwing away months of work. There was real hesitation. What if the new path turned out worse, or a waste of time? And time is money. I went ahead anyway, and it paid off: the system became much more reliable, flexible and ready for what comes next. It taught me to be bold, to act in a crisis, and to trust myself. Since then, I don't let hesitation stop me.",
  },
  {
    id: "team-style",
    topic: "work",
    question: "How do you like to work in a team?",
    status: "confirmed",
    answer:
      "I start by aligning the team on the objectives, so nobody drifts. Then we work in rounds: each of us poses a problem, we discuss it together, and we record the decision. We keep iterating like that until we're done, and in our individual work we refer back to those decisions, so everyone stays in step. I'm comfortable either way: owning a task end to end while keeping everyone in the loop, or working on it together. When I disagree, I say so openly, explain why, and suggest an alternative when I have one. I try to look at a problem from every angle up front, so we spot risks and blockers early. I also supervise and mentor the interns and new recruits on agentic AI. When someone is blocked, I'm proactive: I explain the approach and guide them, but I let them build it themselves, so they really learn it.",
  },
  {
    id: "looking-for",
    topic: "motivation",
    question: "What are you looking for in your next role?",
    status: "confirmed",
    answer:
      "I want brand-new challenges. I want to grow alongside strong people and learn from them. I want to go deeper into the intelligence layer of companies, the agents connected to their data and systems, and help them build it. And I want to be more versatile: working on different things, with different people.",
  },
  {
    id: "next-years",
    topic: "motivation",
    question: "Where do you want to be in a few years?",
    status: "confirmed",
    answer:
      "In a few years, I want to be the architect a company trusts with its agent systems, leading a team of agent engineers while staying hands-on, and known for open-source tooling others rely on.",
  },
  {
    id: "why-new-role",
    topic: "motivation",
    question: "Why are you looking for a new role, or why would you leave your current one?",
    status: "confirmed",
    answer:
      "In nearly two years at OpenSNZ-Technology I've learned a lot. My progress was exponential. Lately it has become more linear, and that's my signal to move. I want new things to discover and new problems to solve, to stretch myself, and to work at a bigger scale, with a bigger team.",
  },
  {
    id: "open-to-offers",
    topic: "practical",
    question: "Are you open to new opportunities right now?",
    status: "confirmed",
    answer: "Yes, I'm open to the right opportunity.",
  },
  {
    id: "remote-relocation",
    topic: "practical",
    question: "Would you work remotely, or relocate?",
    status: "confirmed",
    answer: "Yes to both. I'm happy working fully remote, hybrid or on-site, and I'm open to relocating on the right terms.",
  },
  {
    id: "contract",
    topic: "terms",
    question: "Which kinds of contract do you take: employment, freelance, part time?",
    status: "confirmed",
    binding: true,
    answer: "Full-time employment first. I'm open to freelance or contract work for the right project.",
  },
  {
    id: "start-date",
    topic: "terms",
    question: "When could you start?",
    status: "confirmed",
    binding: true,
    answer: "After my notice period, about one month (four weeks).",
  },
  { id: "salary", topic: "terms", question: "What salary do you expect?", status: "open", binding: true },
];
