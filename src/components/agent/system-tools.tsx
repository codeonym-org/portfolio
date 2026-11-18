"use client";

import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useAgentContext, useFrontendTool } from "@copilotkit/react-core/v2";
import { usePathname } from "next/navigation";
import { mayOffer, unseen } from "@/agent/guide";
import { inviteToInterview, systemCommands, type SystemCommand } from "@/agent/system-commands";
import { findSkill, skills } from "@/config/skills.config";
import { useSession } from "@/store/session-store";
import { focusLabel, useWorldStore } from "@/store/world-store";

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

const skillsSchema = z.object({
  ids: z.array(z.string()).min(1).max(12).describe("Skill ids from the dossier, strongest first."),
  title: z.string().optional().describe("Short caption, e.g. 'AGENT STACK'"),
});

function PresentationTools() {
  useFrontendTool({
    name: "show_map",
    description:
      "Draw a world map under your reply with his base marked, his current local time and the time difference with the visitor (computed in the visitor's browser). Use when the visitor asks where he is based, his location, his time zone, what time it is for him, or whether working hours overlap.",
    parameters: z.object({}),
    handler: async () => "Map shown: his base, his local time and the difference with the visitor's clock. You do not know the visitor's time zone — do not state the difference yourself; reply with one short line.",
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
  const briefRead = useWorldStore((s) => s.briefRead);
  const cvRead = useWorldStore((s) => s.cvRead);
  const muted = useWorldStore((s) => s.muted);
  const quality = useWorldStore((s) => s.quality);
  const touch = useWorldStore((s) => s.touch);
  const inspected = useWorldStore((s) => s.inspected);
  const offers = useWorldStore((s) => s.offers);
  const home = !usePathname().startsWith("/interview");
  const asked = useSession((s) => s.turns.filter((t) => t.role === "visitor").length);

  const value = useMemo(() => {
    const left = unseen({ visited, briefRead, cvRead, inspected });
    const allowed = mayOffer({ offers });
    return {
      // the home page's conversation lasts the visit; the interview room keeps each one as a diary
      room: home ? "home page: this conversation is not kept. open_interview can be proposed (see THE INTERVIEW ROOM)" : "the interview room: this conversation is kept",
      broughtForward: focusLabel({ sector, caseFile }),
      cvViewerOpen: cvOpen,
      inspecting: inspect ? { kind: inspect.kind, id: inspect.id } : null,
      visitor: { sectionsOpened: visited, briefRead, cvRead },
      // for the System's own decision to propose an action or not (see the prompt, THE VISITOR)
      guide: {
        mayPropose: allowed
          ? true
          : `no: the visitor refused ${offers.declinedInARow} proposals in a row. No proposal and no invitation until they ask what to see next.`,
        notSeenYet: left.length
          ? left.map((n) => `${n.id}: ${n.command.name}${Object.entries(n.command.args).map(([k, v]) => ` ${k}=${v}`).join("")}`)
          : "nothing: the visitor has seen the whole record. Propose nothing unless a specific entry answers their question.",
        proposedThisVisit: offers.log.length ? offers.log.map((p) => `${p.key} → ${p.outcome}`) : "nothing yet",
        // the home page invites an interested stranger into the interview room, once (see the prompt, THE INTERVIEW ROOM)
        interviewRoom: !home
          ? "you are in it"
          : offers.log.some((p) => p.key.startsWith("open_interview"))
            ? "already proposed this visit: never again"
            : asked >= 2
              ? "due: if their questions are about your work, a role or hiring you, this reply's proposal is open_interview and nothing else, even right after another proposal was refused or ignored"
              : "not yet: wait for their second question",
      },
      settings: { soundMuted: muted, graphics: quality, device: touch ? "touch/mobile" : "desktop" },
    };
  }, [home, asked, sector, caseFile, cvOpen, inspect, visited, briefRead, cvRead, muted, quality, touch, inspected, offers]);

  useAgentContext({ description: "Live state of the record (what is brought forward, what is open, what the visitor has seen)", value });
  return null;
}

/** on the home page: once an answer is done, an interested stranger is invited into the interview room */
function InterviewInvitation() {
  const home = !usePathname().startsWith("/interview");
  useEffect(() => {
    if (!home) return;
    return useSession.subscribe((s, prev) => {
      if (s.running || !prev.running) return;
      inviteToInterview(s.turns.filter((t) => t.role === "visitor").map((t) => t.text));
    });
  }, [home]);
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
      <InterviewInvitation />
    </>
  );
}
