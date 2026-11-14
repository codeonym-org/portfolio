import { z } from "zod";
import { player } from "@/config/player.config";
import { findItem, inventoryItems } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import type { SectorId, Tone } from "@/config/types";
import { sectorById, sectorIds, world } from "@/config/world.config";
import { chime, play } from "@/lib/audio";
import { setImmersion } from "@/lib/immersion";
import { caseSchema, encodeCase, resolveCase } from "@/record/case-file";
import { hasNode } from "@/record/nodes";
import { live, pulse, useWorldStore, type Quality } from "@/store/world-store";
import { CHANNELS, channelTarget, snapshotFileName } from "./automation";
import { useSession } from "@/store/session-store";
import { MAX_DECLINED, OFFER_GAP_MS, proposalKey } from "./next-step";

/**
 * ── AGENT BRIDGE · WRITE SIDE ─────────────────────────────────
 * Every way an AI agent may drive the record, as a flat registry:
 * name, model-facing description, a zod schema and a handler that
 * returns a human-readable tool result.
 *
 * The same entries become CopilotKit v2 frontend tools
 * (`useFrontendTool`, see `components/agent/system-tools.tsx`), the
 * local index's actions (`agent/local-brain.ts`), the command palette
 * and the `window.system.run(...)` console bridge. New sectors need
 * zero work — schemas read sector ids from world.config.
 */

export interface SystemCommand<S extends z.ZodObject = z.ZodObject> {
  name: string;
  description: string;
  parameters: S;
  handler: (args: z.infer<S>) => string | Promise<string>;
}

const define = <S extends z.ZodObject>(cmd: SystemCommand<S>) => cmd as unknown as SystemCommand;

const SECTOR = z
  .enum(sectorIds as [SectorId, ...SectorId[]])
  .describe(
    "Section of the record: status = Profile (who he is, what he is known for, strengths), experience = jobs & education, projects = his projects, skills = his skills, inventory = Documents (CV, degrees, links), contact = Contact.",
  );

const store = () => useWorldStore.getState();

const CV_URL = "/cv.pdf";
const CV_FILE = "bouarour-ayoub-cv.pdf";

/** a same-origin download — allowed without a user gesture */
function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** the lens split, the shake and the shockwave, for big moments */
export function castEffect(effect: "tremor" | "surge" | "shockwave") {
  if (effect !== "surge") live.shake = Math.min(1.2, live.shake + (effect === "shockwave" ? 0.9 : 0.6));
  if (effect !== "tremor") live.aberration = Math.min(2, live.aberration + (effect === "shockwave" ? 1.6 : 1));
  if (effect === "shockwave") live.shock = 1;
}

export const systemCommands: SystemCommand[] = [
  define({
    name: "open_sector",
    description:
      "Bring a section of the record forward — e.g. 'show me his profile' → status. Its shards leave their orbit and form a halo around the Monolith, and its window opens beside it.",
    parameters: z.object({ sector: SECTOR }),
    handler: ({ sector }) => {
      store().openSector(sector);
      return `Opened ${sectorById[sector].name} (${sectorById[sector].section}). The visitor can read it — do not recite its contents; one or two lines on what matters.`;
    },
  }),
  define({
    name: "open_brief",
    description:
      "Open the one-minute brief: one window with who he is, his current role, his organisations, his projects, his signature skills and every contact channel. Use when the visitor wants the short version, a summary, an overview, or says they are in a hurry.",
    parameters: z.object({}),
    handler: () => {
      store().openBrief();
      return "The brief is open: identity, current role, organisations, projects, signature skills, contact and CV. The visitor can read it — do not recite it; one line on what to look at first.";
    },
  }),
  define({
    name: "open_map",
    description:
      "Open the holographic map over the whole screen: a globe the visitor can turn and zoom, which flies from the planet down to his city (Oujda, Morocco) and shows his local time. Use when the visitor asks to SEE or explore the map or the globe, or wants a closer look at where he lives. For a plain 'where is he based?' prefer show_map (the small card).",
    parameters: z.object({}),
    handler: () => {
      store().setMapOpen(true);
      return "The holographic map is open, flying from the globe down to Oujda. The visitor is looking at it. Reply with one short line; do not describe the map.";
    },
  }),
  define({
    name: "close_windows",
    description: "Send everything back to orbit: closes the section window, the case file, the inspect card, the palette, the map and the CV viewer.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      s.closeFocus();
      s.setPaletteOpen(false);
      s.setCvOpen(false);
      s.setMapOpen(false);
      return "All windows closed. The record is back in orbit.";
    },
  }),
  define({
    name: "inspect_entity",
    description: "Open the detail card for one skill, document (kind item) or project (kind quest) by its id from the dossier. The Monolith fires a beam at its shard.",
    parameters: z.object({
      kind: z.enum(["skill", "item", "quest"]),
      id: z.string().describe("Entity id, e.g. a skill id like 'langgraph', an item id like 'hunter-license' (the CV), a project id like 'pharma-mas'."),
    }),
    handler: ({ kind, id }) => {
      const exists = kind === "skill" ? !!findSkill(id) : kind === "item" ? !!findItem(id) : quests.some((q) => q.id === id);
      if (!exists) {
        const pool = kind === "skill" ? skills : kind === "item" ? inventoryItems : quests;
        return `No ${kind} "${id}". Valid ids: ${pool.map((e) => e.id).join(", ")}.`;
      }
      store().setInspect({ kind, id });
      return `Inspecting ${kind} "${id}".`;
    },
  }),
  define({
    name: "assemble_case",
    description:
      "Your strongest answer to a judgement question (\"is he a fit for…\", \"why hire him\", \"can he do X\", \"compare him to this job description\"): instead of a paragraph, build a CASE FILE. You pick 2–7 pieces of evidence from the record by id and write one honest sentence each; the shards fly into a halo tethered to the Monolith and a case window lists them with the real record beside your reasoning. The visitor can share the case as a link.",
    parameters: caseSchema,
    handler: (file) => {
      const { file: kept, unknown } = resolveCase(file, hasNode);
      if (!kept.evidence.length) {
        return `No evidence matched the record (unknown: ${unknown.join(", ")}). Use exact ids from the dossier with kind quest / skill / experience / education / item.`;
      }
      store().setCase(kept);
      window.history.replaceState(null, "", `#${encodeCase(kept)}`);
      const dropped = unknown.length ? ` Dropped unknown evidence: ${unknown.join(", ")}.` : "";
      return `Case file "${kept.title}" assembled with ${kept.evidence.length} pieces of evidence and shown to the visitor.${dropped} Do not repeat the evidence in text — reply with one or two lines.`;
    },
  }),
  define({
    name: "open_cv",
    description: "Open the full CV (PDF) viewer, with a download option.",
    parameters: z.object({}),
    handler: () => {
      store().setCvOpen(true);
      pulse("item:hunter-license");
      return "CV viewer open.";
    },
  }),
  define({
    name: "open_interview",
    description:
      "Take the visitor to the interview (the page /interview): my avatar, alone in an empty space, answering by text or voice. Use only when the visitor asks for the interview, the avatar, my face, or to talk face to face.",
    parameters: z.object({}),
    handler: () => {
      if (window.location.pathname === "/interview") return "The visitor is already in the interview.";
      window.setTimeout(() => window.location.assign("/interview"), 600);
      return "Taking the visitor to the interview. Say one short line; this page is about to close.";
    },
  }),
  define({
    name: "download_cv",
    description:
      "Download his CV as a PDF file straight to the visitor's device. Use when they want to download, save or get the CV or resume.",
    parameters: z.object({}),
    handler: () => {
      download(CV_URL, CV_FILE);
      useWorldStore.setState({ cvRead: true });
      return `Download of ${CV_FILE} started on the visitor's device.`;
    },
  }),
  define({
    name: "copy_contact",
    description: "Copy one of his channels (email address, phone number, GitHub, LinkedIn) or this portfolio's link to the visitor's clipboard.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: async ({ channel }) => {
      const { label, text } = channelTarget(channel, player.links, window.location.origin);
      try {
        await navigator.clipboard.writeText(text);
        store().pushToast({ heading: "COPIED", body: `${label} → clipboard`, tone: "system" });
        return `Copied the ${label} to the visitor's clipboard.`;
      } catch {
        store().pushToast({ heading: label.toUpperCase(), body: text, tone: "system" });
        return `The browser blocked the clipboard, so the ${label} is shown in a notification instead.`;
      }
    },
  }),
  define({
    name: "open_link",
    description:
      "Open one of his channels for the visitor: GitHub or LinkedIn in a new tab, email in their mail app (a new message to him), the phone number in their dialer, or this portfolio's link.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: ({ channel }) => {
      const { label, href } = channelTarget(channel, player.links, window.location.origin);
      if (channel === "email" || channel === "phone") {
        window.location.href = href;
        return channel === "email" ? "Opened a new email to him in the visitor's mail app." : "Handed his phone number to the visitor's dialer.";
      }
      const tab = window.open(href, "_blank");
      if (!tab) {
        return `The browser blocked the new tab. Call show_contact_card so the visitor can open the ${label} with a click.`;
      }
      tab.opener = null;
      return `Opened the ${label} in a new tab.`;
    },
  }),
  define({
    name: "capture_snapshot",
    description: "Take a picture of the Monolith and the record as the visitor sees them right now (without the interface) and download it as a PNG.",
    parameters: z.object({}),
    handler: async () => {
      const blob = await live.capture?.();
      if (!blob) return "The view could not be captured (no 3D view on screen).";
      const url = URL.createObjectURL(blob);
      const name = snapshotFileName(new Date());
      download(url, name);
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      play("click");
      return `Snapshot saved as ${name}.`;
    },
  }),
  define({
    name: "set_fullscreen",
    description: "Enter or leave immersive (fullscreen) mode.",
    parameters: z.object({ on: z.boolean() }),
    handler: async ({ on }) => {
      const ok = await setImmersion(on);
      if (ok) return `Immersive mode ${on ? "on" : "off"}.`;
      store().pushToast({ heading: "IMMERSION", body: "Press F (or the fullscreen control) to enter immersive mode.", tone: "system" });
      return "The browser only allows fullscreen from the visitor's own click or key press — a notification now tells them to press F.";
    },
  }),
  define({
    name: "set_sound",
    description: "Mute or unmute all audio.",
    parameters: z.object({ muted: z.boolean() }),
    handler: ({ muted }) => {
      if (store().muted !== muted) store().toggleMuted();
      return `Sound ${muted ? "muted" : "on"}.`;
    },
  }),
  define({
    name: "set_quality",
    description: "Change graphics quality: high (bloom + lens effects), medium (bloom), low (no post-processing — use when the visitor says it is slow).",
    parameters: z.object({ quality: z.enum(["high", "medium", "low"]) }),
    handler: ({ quality }) => {
      store().setQuality(quality as Quality);
      return `Graphics quality set to ${quality}.`;
    },
  }),
  define({
    name: "system_notification",
    description:
      "Push a System notification (with the System chime) onto the visitor's screen — for hints and warnings. Keep heading ≤ 4 words, body ≤ 140 chars.",
    parameters: z.object({
      heading: z.string().describe("Short uppercase heading, e.g. 'NEW RELEASE'"),
      body: z.string(),
      tone: z.enum(["system", "arcane", "gold", "ember"]).optional().describe("system=blue info, arcane=purple mystic, gold=reward, ember=warning"),
    }),
    handler: ({ heading, body, tone }) => {
      store().pushToast({ heading: heading.toUpperCase().slice(0, 40), body: body.slice(0, 200), tone: (tone ?? "system") as Tone });
      chime();
      return "Notification delivered.";
    },
  }),
  define({
    name: "cast_effect",
    description:
      "Play a cinematic effect for dramatic moments: tremor (camera shake), surge (the lens splits + a deep hum), shockwave (both, with a shockwave across the void).",
    parameters: z.object({ effect: z.enum(["tremor", "surge", "shockwave"]) }),
    handler: ({ effect }) => {
      castEffect(effect);
      play(effect === "shockwave" ? "shockwave" : effect === "surge" ? "portal" : "blade");
      return `Effect "${effect}" cast.`;
    },
  }),
  define({
    name: "propose_action",
    description:
      "Propose ONE action to the visitor in a System window they can accept, refuse or ignore. Accepting runs the action for them. OPTIONAL: call it only when a specific action clearly follows from what the visitor just asked and would show them something they have not seen (see THE VISITOR in your instructions); most replies need none. It returns at once — the visitor answers in their own time, and the App Context (guide.proposedThisVisit) shows how they answered. At most one per reply, after your other tools. Never propose what is already open, already seen, or already proposed during this visit.",
    parameters: z.object({
      message: z.string().min(8).max(170).describe("What you propose, in the first person, one or two short sentences ending with a question, in the stranger's language. Only facts from the record."),
      action: z.enum(["open_brief", "open_sector", "inspect_entity", "open_cv", "download_cv", "open_map"]).describe("What accepting does."),
      sector: SECTOR.optional().describe("For open_sector."),
      kind: z.enum(["quest", "skill", "item"]).optional().describe("For inspect_entity."),
      id: z.string().optional().describe("For inspect_entity: the exact id from the dossier."),
    }),
    handler: ({ message, action, sector, kind, id }) => {
      const s = store();
      if (s.offers.declinedInARow >= MAX_DECLINED)
        return `Skipped: the visitor refused ${s.offers.declinedInARow} proposals in a row, so no more proposals until they ask what to see next. That is fine. Now answer the visitor normally in one to three sentences, with no invitation.`;
      const args: Record<string, unknown> = action === "open_sector" ? { sector } : action === "inspect_entity" ? { kind, id } : {};
      const target = systemCommands.find((c) => c.name === action);
      const parsed = target?.parameters.safeParse(args);
      if (!target || !parsed?.success) return `Not shown: invalid arguments for ${action}${parsed && !parsed.success ? ` (${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")})` : ""}.`;
      if (action === "inspect_entity" && !hasNode(`${kind}:${id}`)) return `Not shown: there is no ${kind} "${id}" in the record.`;
      const key = proposalKey(action, args);
      const before = s.offers.log.find((p) => p.key === key);
      if (before) return `Not shown: you already proposed this during this visit (the visitor ${before.outcome === "waiting" ? "has not answered yet" : before.outcome + " it"}). Do not propose it again. Now answer the visitor normally, with no invitation.`;
      if (Date.now() - s.offers.lastAt < OFFER_GAP_MS) return "Skipped: you proposed something a moment ago. That is fine. Now answer the visitor normally in one to three sentences, with no invitation.";
      const open =
        (action === "open_sector" && s.sector === sector) ||
        (action === "inspect_entity" && s.inspect?.kind === kind && s.inspect?.id === id) ||
        (action === "open_brief" && s.brief) ||
        (action === "open_cv" && s.cvOpen) ||
        (action === "open_map" && s.mapOpen);
      if (open) return "Not shown: that is already open in front of the visitor. Now answer the visitor normally, with no invitation.";
      // a proposal still waiting is replaced: the visitor ignored it
      dropPendingProposal();
      if (s.prompt) s.ignore();
      s.raiseOffer(key);
      // the model calls this before it writes its answer: the window waits until the answer is on screen
      afterTheReply(() =>
        store().ask({
          id: "offer",
          heading: world.prompts.offerHeading,
          body: message,
          accept: world.prompts.accept,
          decline: world.prompts.refuse,
          tone: "system",
          command: { name: action, args },
          onAnswer: (accepted) => store().settleOffer(accepted ? "accepted" : "refused"),
          onIgnore: () => store().settleOffer("ignored"),
        }),
      );
      return "Proposal shown in a System window. The visitor will answer in their own time. Finish your reply now: it must NOT contain another invitation, question or next step — the window is the proposal.";
    },
  }),
];

/** how long the System must have been silent before a proposal appears: the reply is complete and has been revealed */
const QUIET_MS = 2200;
let waiting: number | null = null;

/** runs `show` once no reply has been running for QUIET_MS (a reply is several runs: tools, then text) */
function afterTheReply(show: () => void) {
  let quietSince = 0;
  waiting = window.setInterval(() => {
    const now = Date.now();
    if (useSession.getState().running) quietSince = 0;
    else if (!quietSince) quietSince = now;
    else if (now - quietSince >= QUIET_MS) {
      window.clearInterval(waiting!);
      waiting = null;
      show();
    }
  }, 200);
}

/** the visitor moved on before the proposal appeared: it was never seen, so it counts as ignored */
export function dropPendingProposal() {
  if (waiting === null) return;
  window.clearInterval(waiting);
  waiting = null;
  store().settleOffer("ignored");
}

export function executeSystemCommand(name: string, args: Record<string, unknown> = {}): string | Promise<string> {
  const cmd = systemCommands.find((c) => c.name === name);
  if (!cmd) return `Unknown command "${name}". Available: ${systemCommands.map((c) => c.name).join(", ")}.`;
  const parsed = cmd.parameters.safeParse(args ?? {});
  if (!parsed.success) {
    return `Invalid arguments for "${name}": ${parsed.error.issues.map((i) => `${i.path.join(".") || "args"} ${i.message}`).join("; ")}`;
  }
  const failed = (err: unknown) => `Command "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  try {
    const result = cmd.handler(parsed.data);
    return typeof result === "string" ? result : result.catch(failed);
  } catch (err) {
    return failed(err);
  }
}
