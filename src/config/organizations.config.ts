import type { Organization } from "./types";

/**
 * ── ORGANISATIONS ─────────────────────────────────────────────
 * The organisations the owner works in, and the role held in each.
 * Every project names its organisation (`Project.organization` = an id here), so a
 * gate and the agent can group projects by organisation.
 * "Engineer" = employed there; "Founder" = founded and runs it.
 * (The identifiers still say organization and project; what is shown does not.)
 */
export const organizations: Organization[] = [
  {
    id: "opensnz",
    name: "OpenSNZ-Technology",
    role: "Engineer",
    kind: "employer",
    summary: "The company he works for: production agentic AI systems, from prototype to deployment.",
  },
  {
    id: "codeonym-oss",
    name: "codeonym-oss",
    role: "Founder",
    kind: "open source",
    summary: "Open-source tooling for agentic systems — built in the open, shared with the community.",
    link: "https://github.com/codeonym-oss",
  },
  {
    id: "codeonym-org",
    name: "codeonym-org",
    role: "Founder",
    kind: "own products",
    summary: "Production-grade software and AI agent systems — from personal ventures to professional engagements.",
    link: "https://github.com/codeonym-org",
  },
];

export const findOrganization = (id: string) => organizations.find((g) => g.id === id);
