import "server-only";
import { tool } from "langchain";
import { z } from "zod";
import { describe } from "@/github/format";
import { liveRepos, repoLive } from "@/github/live";
import { ARCHIVE_SECTIONS, archive } from "./dossier";

/**
 * ── BACKEND TOOLS ─────────────────────────────────────────────
 * Run on the server inside the agent graph. Frontend tools (the
 * world commands) are registered by the browser through CopilotKit
 * and routed by the CopilotKit middleware — they never execute here.
 */

export const consultArchive = tool(
  async ({ section }) => archive(section),
  {
    name: "consult_archive",
    description:
      "Read his full archived record for one section — full project details, every skill with its description and grade, the complete experience timeline, the documents. Use it before answering detailed questions the digest does not cover.",
    schema: z.object({
      section: z.enum(ARCHIVE_SECTIONS).describe("Which archive to open."),
    }),
  },
);

const LIVE_IDS = Object.keys(liveRepos) as [string, ...string[]];

export const githubLive = tool(
  async ({ project }) => {
    const live = await repoLive(project);
    return live ? describe(live, new Date()) : "GitHub did not answer. Say so in a few words and answer from the dossier instead.";
  },
  {
    name: "github_live",
    description:
      "Read what GitHub says RIGHT NOW about one of his personal projects: latest release and its date, last push, the three latest commits, open issues, licence. Use when the visitor asks what is new, whether a project is active or maintained, its current version, or what he is working on. Read-only; only projects in the dossier.",
    schema: z.object({
      project: z.enum(LIVE_IDS).describe("The project's id from the dossier."),
    }),
  },
);

export const backendTools = [consultArchive, githubLive];
