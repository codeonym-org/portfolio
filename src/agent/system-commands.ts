import { z } from "zod";
import { owner } from "@/config/owner.config";
import { findItem, documents } from "@/config/documents.config";
import { projects } from "@/config/projects.config";
import { findSkill, skills } from "@/config/skills.config";
import type { SectorId } from "@/config/types";
import { sectorById, sectorIds, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { setImmersion } from "@/lib/immersion";
import { caseSchema, encodeCase, resolveCase } from "@/record/case-file";
import { hasNode } from "@/record/nodes";
import { live, pulse, useWorldStore, type Quality } from "@/store/world-store";
import { CHANNELS, channelTarget, snapshotFileName } from "./automation";
import { useSession } from "@/store/session-store";
import { MAX_DECLINED, OFFER_GAP_MS, proposalKey } from "./next-step";
import { describeActivity } from "@/github/activity";
import { loadActivity } from "@/github/load-activity";

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
    "Section of the record: profile = Profile (who I am, what I am known for, strengths), experience = jobs & education, projects = my projects, skills = my skills, documents = Documents (CV, degrees, links), contact = Contact.",
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


export const systemCommands: SystemCommand[] = [
  define({
    name: "open_sector",
    description:
      "Bring a section of my record forward, e.g. 'tell me about yourself' → status. Its window opens (on the home page its shards gather round the Monolith; in the interview room it lands on the table beside me).",
    parameters: z.object({ sector: SECTOR }),
    handler: ({ sector }) => {
      store().openSector(sector);
      return `Opened ${sectorById[sector].name} (${sectorById[sector].section}). The stranger can read it — do not recite its contents; one or two lines on what matters.`;
    },
  }),
  define({
    name: "open_brief",
    description:
      "Open my one-minute brief: one window with who I am, my current role, my organisations, my projects, my signature skills and every contact channel. Use when the stranger wants the short version, a summary, an overview, or says they are in a hurry.",
    parameters: z.object({}),
    handler: () => {
      store().openBrief();
      return "The brief is open: identity, current role, organisations, projects, signature skills, contact and CV. The stranger can read it — do not recite it; one line on what to look at first.";
    },
  }),
  define({
    name: "open_github",
    description:
      "Open my GitHub activity, live: the contribution calendar of the last twelve months, commits, pull requests, issues, streaks, my busiest days, my contributions year by year, the languages I write and the public repositories I committed most to. Use when the stranger asks about my GitHub, my contributions, how active I am, how much I code, my streaks or open-source work. Returns the numbers, so you can name one or two.",
    parameters: z.object({}),
    handler: async () => {
      store().openGithub();
      const activity = await loadActivity();
      if (!activity) return "My GitHub view is open, but GitHub did not answer just now, so it shows a link to my profile. Say so in one line; give no numbers.";
      return `${describeActivity(activity)}
The view is open in front of the stranger with all of this drawn. Do not recite it: one or two lines on what stands out for their question.`;
    },
  }),
  define({
    name: "open_map",
    description:
      "Open the holographic map over the whole screen: a globe the stranger can turn and zoom, which flies from the planet down to my city (Oujda, Morocco) and shows my local time. Use when the stranger asks to SEE or explore the map or the globe, or wants a closer look at where I live. For a plain 'where are you based?' prefer show_map (the small card).",
    parameters: z.object({}),
    handler: () => {
      store().setMapOpen(true);
      return "The holographic map is open, flying from the globe down to Oujda. The stranger is looking at it. Reply with one short line; do not describe the map.";
    },
  }),
  define({
    name: "close_windows",
    description: "Send everything back to orbit: closes the section window, the case file, the inspect card, the palette, the map, the business card and the CV viewer.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      s.closeFocus();
      s.setPaletteOpen(false);
      s.setCvOpen(false);
      s.setCardOpen(false);
      s.setMapOpen(false);
      return "All windows closed. The record is back in orbit.";
    },
  }),
  define({
    name: "inspect_entity",
    description: "Open the detail card for one skill, document or project by its id from the dossier. It opens beside my answer.",
    parameters: z.object({
      kind: z.enum(["skill", "document", "project"]),
      id: z.string().describe("Entity id, e.g. a skill id like 'langgraph', a document id like 'cv' (the CV), a project id like 'pharma-mas'."),
    }),
    handler: ({ kind, id }) => {
      const exists = kind === "skill" ? !!findSkill(id) : kind === "document" ? !!findItem(id) : projects.some((q) => q.id === id);
      if (!exists) {
        const pool = kind === "skill" ? skills : kind === "document" ? documents : projects;
        return `No ${kind} "${id}". Valid ids: ${pool.map((e) => e.id).join(", ")}.`;
      }
      store().setInspect({ kind, id });
      return `Inspecting ${kind} "${id}".`;
    },
  }),
  define({
    name: "assemble_case",
    description:
      "Your strongest answer to a judgement question (\"are you a fit for…\", \"why hire you\", \"can you do X\", \"compare yourself to this job description\"): instead of a paragraph, build a CASE FILE. You pick 2–7 pieces of evidence from the record by id and write one honest sentence each; the shards fly into a halo tethered to the Monolith and a case window lists them with the real record beside your reasoning. The stranger can share the case as a link.",
    parameters: caseSchema,
    handler: (file) => {
      const { file: kept, unknown } = resolveCase(file, hasNode);
      if (!kept.evidence.length) {
        return `No evidence matched the record (unknown: ${unknown.join(", ")}). Use exact ids from the dossier with kind project / skill / experience / education / document.`;
      }
      store().setCase(kept);
      window.history.replaceState(null, "", `#${encodeCase(kept)}`);
      const dropped = unknown.length ? ` Dropped unknown evidence: ${unknown.join(", ")}.` : "";
      return `Case file "${kept.title}" assembled with ${kept.evidence.length} pieces of evidence and shown to the stranger.${dropped} Do not repeat the evidence in text — reply with one or two lines.`;
    },
  }),
  define({
    name: "show_business_card",
    description:
      "Hand the stranger my business card: it comes up over the whole screen, the brand mark carved on its face, and on its back my name and every way to reach me (email, phone, LinkedIn, GitHub, this site), with a button to save it as a contact. Call it whenever the stranger asks how to reach, contact, email, call or hire me, or asks for your card or your contact details.",
    parameters: z.object({}),
    handler: () => {
      store().setCardOpen(true);
      return "My business card is in the stranger's hand: they can turn it over, press any channel, or save it as a contact. Reply with one short line; do not write or recite any contact detail.";
    },
  }),
  define({
    name: "open_cv",
    description: "Open the full CV (PDF) viewer, with a download option.",
    parameters: z.object({}),
    handler: () => {
      store().setCvOpen(true);
      pulse("document:cv");
      return "CV viewer open.";
    },
  }),
  define({
    name: "open_interview",
    description:
      "Take the stranger to my interview room (the page /interview): my avatar at my desk, answering by text or voice, the conversation kept as a diary. Use when they ask for the interview, the avatar, my face, or to talk face to face.",
    parameters: z.object({}),
    handler: () => {
      if (window.location.pathname === "/interview") return "The stranger is already in the interview.";
      window.setTimeout(() => window.location.assign("/interview"), 600);
      return "Taking the stranger to the interview. Say one short line; this page is about to close.";
    },
  }),
  define({
    name: "download_cv",
    description:
      "Download my CV as a PDF file straight to the stranger's device. Use when they want to download, save or get the CV or resume.",
    parameters: z.object({}),
    handler: () => {
      download(CV_URL, CV_FILE);
      useWorldStore.setState({ cvRead: true });
      return `Download of ${CV_FILE} started on the stranger's device.`;
    },
  }),
  define({
    name: "copy_contact",
    description: "Copy one of my channels (email address, phone number, GitHub, LinkedIn) or this portfolio's link to the stranger's clipboard.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: async ({ channel }) => {
      const { label, text } = channelTarget(channel, owner.links, window.location.origin);
      try {
        await navigator.clipboard.writeText(text);
        store().pushToast({ heading: "COPIED", body: `${label} → clipboard`, tone: "system" });
        return `Copied the ${label} to the stranger's clipboard.`;
      } catch {
        store().pushToast({ heading: label.toUpperCase(), body: text, tone: "system" });
        return `The browser blocked the clipboard, so the ${label} is shown in a notification instead.`;
      }
    },
  }),
  define({
    name: "open_link",
    description:
      "Open one of my channels for the stranger: GitHub or LinkedIn in a new tab, email in their mail app (a new message to me), the phone number in their dialer, or this portfolio's link.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: ({ channel }) => {
      const { label, href } = channelTarget(channel, owner.links, window.location.origin);
      if (channel === "email" || channel === "phone") {
        window.location.href = href;
        return channel === "email" ? "Opened a new email to me in the stranger's mail app." : "Handed my phone number to the stranger's dialer.";
      }
      const tab = window.open(href, "_blank");
      if (!tab) {
        return `The browser blocked the new tab. Call show_business_card so the stranger can open the ${label} from the card.`;
      }
      tab.opener = null;
      return `Opened the ${label} in a new tab.`;
    },
  }),
  define({
    name: "capture_snapshot",
    description: "Take a picture of the 3D view as the stranger sees it right now (without the interface) and download it as a PNG.",
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
      return "The browser only allows fullscreen from the stranger's own click or key press — a notification now tells them to press F.";
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
    description: "Change graphics quality: high (bloom + lens effects), medium (bloom), low (no post-processing — use when the stranger says it is slow).",
    parameters: z.object({ quality: z.enum(["high", "medium", "low"]) }),
    handler: ({ quality }) => {
      store().setQuality(quality as Quality);
      return `Graphics quality set to ${quality}.`;
    },
  }),
  define({
    name: "hand_over",
    description:
      "Call this EVERY time you do not answer a question here: no answer on file, an opinion, plan or anything personal the record does not state, anything binding (salary, start date, offer, contract), or a sincere 'am I talking to a person?'. It shows the stranger a window offering to take it up with me directly; accepting hands them my business card. Your text says in one short sentence that you would rather discuss it directly.",
    parameters: z.object({
      message: z.string().min(8).max(170).describe("The offer, in the first person, one or two short sentences ending with a question, in the stranger's language, e.g. \"That one I'd rather discuss with you directly. Shall I give you my card?\""),
    }),
    handler: ({ message }) => {
      if (store().cardOpen) return "My card is already in the stranger's hand. Say in one sentence that they can reach me directly with it.";
      // handing a question over is part of the answer, not an extra: it is never held back
      offer(message, "show_business_card", {});
      return "The offer is shown in a window; accepting hands over my card. Finish your reply in one short sentence, with no question in it.";
    },
  }),
  define({
    name: "propose_action",
    description:
      "Offer the stranger ONE next step in a window they can accept, refuse or ignore; accepting runs it for them. Your own judgement, and rare: only when the stranger asks what to see next, or to offer my interview room to a stranger who wants to go further. If showing something helps your answer, show it yourself instead. Returns at once; guide.proposedThisVisit in the App Context shows how they answered. At most one per reply, after your other tools, and never in a reply that calls hand_over.",
    parameters: z.object({
      message: z.string().min(8).max(170).describe("What you offer, in the first person, one or two short sentences ending with a question, in the stranger's language. Only facts from the record."),
      action: z
        .enum(["open_brief", "open_github", "open_sector", "inspect_entity", "open_cv", "download_cv", "open_map", "open_interview"])
        .describe("What accepting does. open_interview (home page only) takes them to my interview room."),
      sector: SECTOR.optional().describe("For open_sector."),
      kind: z.enum(["project", "skill", "document"]).optional().describe("For inspect_entity."),
      id: z.string().optional().describe("For inspect_entity: the exact id from the dossier."),
    }),
    handler: ({ message, action, sector, kind, id }) => {
      const s = store();
      const args: Record<string, unknown> = action === "open_sector" ? { sector } : action === "inspect_entity" ? { kind, id } : {};
      const target = systemCommands.find((c) => c.name === action);
      const parsed = target?.parameters.safeParse(args);
      if (!target || !parsed?.success) return `Not shown: invalid arguments for ${action}${parsed && !parsed.success ? ` (${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")})` : ""}.`;
      if (action === "inspect_entity" && !hasNode(`${kind}:${id}`)) return `Not shown: there is no ${kind} "${id}" in the record.`;
      if (action === "open_interview" && window.location.pathname.startsWith("/interview")) return "Not shown: the stranger is already in the interview room. Answer normally, with no invitation.";
      if (s.offers.declinedInARow >= MAX_DECLINED)
        return `Skipped: the stranger refused ${s.offers.declinedInARow} offers in a row. Offer nothing more until they ask what to see next. Answer normally, with no invitation.`;
      const key = proposalKey(action, args);
      const before = s.offers.log.find((p) => p.key === key);
      if (before) return `Not shown: you already offered this during this visit (the stranger ${before.outcome === "waiting" ? "has not answered yet" : before.outcome + " it"}). Answer normally, with no invitation.`;
      if (Date.now() - s.offers.lastAt < OFFER_GAP_MS) return "Skipped: you offered something a moment ago. Answer normally, with no invitation.";
      const open =
        (action === "open_sector" && s.sector === sector) ||
        (action === "inspect_entity" && s.inspect?.kind === kind && s.inspect?.id === id) ||
        (action === "open_brief" && s.brief) ||
        (action === "open_github" && s.github) ||
        (action === "open_cv" && s.cvOpen) ||
        (action === "open_map" && s.mapOpen);
      if (open) return "Not shown: that is already open in front of the stranger. Answer normally, with no invitation.";
      offer(message, action, args);
      return "Offer shown in a window; the stranger answers in their own time. Finish your reply now, and do not put another invitation or question in it: the window is the offer.";
    },
  }),
];

/** raises an offer window once the reply is on screen; one still waiting is replaced, as ignored */
function offer(message: string, action: string, args: Record<string, unknown>) {
  const s = store();
  dropPendingProposal();
  if (s.prompt) s.ignore();
  s.raiseOffer(proposalKey(action, args));
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
}

/** how long nothing must have been running before an offer appears: the reply is complete and has been revealed */
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

/** the stranger moved on before the offer appeared: it was never seen, so it counts as ignored */
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
