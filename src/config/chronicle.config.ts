import type { Achievement, ChronicleEntry } from "./types";

/**
 * ── EXPERIENCE ─────────────────────────────────────────────────
 * `chronicle` = professional experience (newest first).
 * `achievements` = education, rendered as gold tiles.
 */
export const chronicle: ChronicleEntry[] = [
  {
    id: "opensnz-engineer",
    role: "Software Engineer",
    organization: "OpenSNZ-Technology · Oujda, Morocco",
    period: "2025/09 – Present",
    summary:
      "Leads AiCA, the multi-agent pharmaceutical catalog platform he started as an intern, now in production. More broadly, designs, builds and maintains production agentic AI systems end-to-end — from rapid prototyping to deployment — covering complex multi-agent architectures, LLM-driven workflows and agent-to-enterprise integrations. Mentors and supervises interns on the agent engineering stack.",
    highlights: [
      "Multi-agent architectures in production",
      "DDD · CQRS · Event-Driven Architecture",
      "RabbitMQ + Celery async backbone",
      "Docker · Traefik · Authentik",
      "Document AI: LandingAI + Amazon Textract",
      "CopilotKit / AG-UI human-in-the-loop",
      "LangChain/LangGraph + LangSmith evals",
      "Context & prompt engineering",
      "Mentoring interns (LangGraph/MCP, evals)",
    ],
  },
  {
    id: "opensnz-pfe",
    role: "AI Agent Developer — PFE Internship",
    organization: "OpenSNZ-Technology · Oujda, Morocco",
    period: "2025/02 – 2025/08",
    summary:
      "Started AiCA, a multi-agent system for intelligent pharmaceutical catalog analysis — automating extraction of structured data from unstructured raw files at scale, and coordinating specialized agents for querying, cost aggregation, reporting and decision support, backed by a knowledge graph.",
    highlights: [
      "Multi-Agent Systems",
      "LLM-driven workflows",
      "Knowledge Graph + RAG",
      "MCP & CopilotKit (AG-UI)",
      "Modular agent-based architecture",
    ],
  },
];

export const achievements: Achievement[] = [
  {
    id: "master-cs",
    title: "Specialized Master in Computer Science Engineering",
    issuer: "Faculty of Sciences (FSO), Oujda",
    period: "2023 – 2025",
  },
  {
    id: "bachelor-math-cs",
    title: "Bachelor's Degree in Mathematics and Computer Sciences",
    issuer: "Faculty of Sciences (FSO), Oujda",
    period: "2019 – 2023",
  },
  {
    id: "bac",
    title: "Scientific Baccalaureate (Physical Sciences)",
    issuer: "Essaadiyine Qualifying High School, El Aioun Sidi Mellouk",
    period: "2019",
  },
];
