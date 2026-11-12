"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useAgentContext, useFrontendTool } from "@copilotkit/react-core/v2";
import { systemCommands, type SystemCommand } from "@/agent/system-commands";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import { focusLabel, levelFor, syncPercent, useWorldStore } from "@/store/world-store";

/**
 * ── THE SYSTEM'S HANDS ────────────────────────────────────────
 * Registers every record command as a CopilotKit v2 frontend tool
 * (executed here, in the browser, when the agent calls it), plus two
 * presentation tools whose cards the console draws under the reply
 * (see `agent-bridge.tsx` → `interface/cards.tsx`), and feeds the
 * live state of the record to the agent as context.
 */

/** one `useFrontendTool` per registry entry — the registry is static, so hook order is too */
function CommandTool({ command }: { command: SystemCommand }) {
  useFrontendTool({
    name: command.name,
    description: command.description,
    parameters: command.parameters,
    handler: async (args) => {
      const parsed = command.parameters.safeParse(args ?? {});
      if (!parsed.success) return `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`;
      return command.handler(parsed.data);
    },
  });
  return null;
}

const linksSchema = z.object({
  links: z
    .array(z.enum(["email", "phone", "linkedin", "github", "cv"]))
    .optional()
    .describe("Which channels to show; omit for all."),
});

const skillsSchema = z.object({
  ids: z.array(z.string()).min(1).max(12).describe("Skill ids from the dossier, strongest first."),
  title: z.string().optional().describe("Short caption, e.g. 'AGENT STACK'"),
});

function PresentationTools() {
  useFrontendTool({
    name: "show_contact_card",
    description:
      "Draw a contact card under your reply with clickable email / phone / LinkedIn / GitHub / CV buttons. Use when the visitor wants to reach, hire or follow the Player.",
    parameters: linksSchema,
    handler: async ({ links }) =>
      `Contact card shown (${links?.join(", ") || "all channels"}). The visitor sees the buttons — do not list the links or address in text; reply with one short line.`,
  });
  useFrontendTool({
    name: "present_skills",
    description:
      "Draw a row of skill badges (with mastery grades) under your reply; each badge opens its inspect card, and the Monolith lights their shards. Use when answering about skills or tech stack.",
    parameters: skillsSchema,
    handler: async ({ ids }) => {
      const unknown = ids.filter((id) => !findSkill(id));
      return unknown.length
        ? `Shown, but unknown skill ids were skipped: ${unknown.join(", ")}. Valid ids: ${skills.map((s) => s.id).join(", ")}.`
        : `Presented ${ids.length} skill badges with grades. The visitor sees them — do not list the skills again; add at most two lines of insight.`;
    },
  });
  return null;
}

/** what the visitor is looking at right now — kept small, the dossier lives server-side */
function RecordContext() {
  const sector = useWorldStore((s) => s.sector);
  const caseFile = useWorldStore((s) => s.caseFile);
  const cvOpen = useWorldStore((s) => s.cvOpen);
  const inspect = useWorldStore((s) => s.inspect);
  const visited = useWorldStore((s) => s.visited);
  const completed = useWorldStore((s) => s.completed);
  const risen = useWorldStore((s) => s.risen);
  const xp = useWorldStore((s) => s.xp);
  const muted = useWorldStore((s) => s.muted);
  const quality = useWorldStore((s) => s.quality);
  const touch = useWorldStore((s) => s.touch);

  const value = useMemo(
    () => ({
      broughtForward: focusLabel({ sector, caseFile }),
      cvViewerOpen: cvOpen,
      inspecting: inspect ? { kind: inspect.kind, id: inspect.id } : null,
      visitor: {
        level: levelFor(xp),
        xp,
        sync: `${syncPercent({ visited, risen, completed })}%`,
        sectorsOpened: visited,
        systemQuestsCompleted: completed,
        shadowsRisen: risen,
        shadowsStillFallen: quests.filter((q) => !risen.includes(q.id)).map((q) => q.id),
      },
      settings: { soundMuted: muted, graphics: quality, device: touch ? "touch/mobile" : "desktop" },
    }),
    [sector, caseFile, cvOpen, inspect, visited, completed, risen, xp, muted, quality, touch],
  );

  useAgentContext({ description: "Live state of the record (what is brought forward, what is open, visitor progress)", value });
  return null;
}

export function SystemTools() {
  return (
    <>
      {systemCommands.map((c) => (
        <CommandTool key={c.name} command={c} />
      ))}
      <PresentationTools />
      <RecordContext />
    </>
  );
}
