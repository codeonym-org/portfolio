import { z } from "zod";
import { player } from "@/config/player.config";
import { findItem, inventoryItems } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import type { SectorId, Tone } from "@/config/types";
import { sectorById, sectorIds } from "@/config/world.config";
import { chime, play } from "@/lib/audio";
import { setImmersion } from "@/lib/immersion";
import { caseSchema, encodeCase, resolveCase } from "@/record/case-file";
import { hasNode } from "@/record/nodes";
import { ARISE_MS, levelFor, live, pulse, syncPercent, useWorldStore, type Quality } from "@/store/world-store";
import { CHANNELS, channelTarget, snapshotFileName } from "./automation";

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
    "Sector of the record: status = STATUS window (profile, stats, titles), experience = jobs & education, projects = the shadows (quests), skills = the arsenal, inventory = the vault & CV, contact = the Gate.",
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

/** a rise that has not finished by now has stalled */
const RISE_STALL_MS = ARISE_MS * 3;

/** the lens split, the shake and the shockwave, for big moments */
export function castEffect(effect: "tremor" | "surge" | "awaken") {
  if (effect !== "surge") live.shake = Math.min(1.2, live.shake + (effect === "awaken" ? 0.9 : 0.6));
  if (effect !== "tremor") live.aberration = Math.min(2, live.aberration + (effect === "awaken" ? 1.6 : 1));
  if (effect === "awaken") live.shock = 1;
}

/** raise every fallen shadow, one after another; resolves with how many rose */
function ariseAll(): Promise<number> {
  const fallen = () => quests.filter((q) => !store().risen.includes(q.id));
  const before = store().risen.length;
  return new Promise((resolve) => {
    let timer = 0;
    let stall = 0;
    const finish = () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearTimeout(stall);
      resolve(store().risen.length - before);
    };
    const step = () => {
      window.clearTimeout(stall);
      stall = window.setTimeout(finish, RISE_STALL_MS);
      if (store().rising) return;
      const next = fallen()[0];
      if (!next) return finish();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => store().arise(next.id), 150);
    };
    const unsubscribe = useWorldStore.subscribe((s, prev) => {
      if (prev.rising && !s.rising) step();
    });
    step();
  });
}

export const systemCommands: SystemCommand[] = [
  define({
    name: "open_sector",
    description:
      "Bring a sector of the record forward — e.g. 'show me the status window' → status. Its shards leave their orbit and form a halo around the Monolith, and its window opens beside it.",
    parameters: z.object({ sector: SECTOR }),
    handler: ({ sector }) => {
      store().openSector(sector);
      return `Opened ${sectorById[sector].name} (${sectorById[sector].section}). The visitor can read it — do not recite its contents; one or two lines on what matters.`;
    },
  }),
  define({
    name: "open_brief",
    description:
      "Open the one-minute brief: one window with who the Player is, his current role, his guilds, his work by rank, his signature skills and every contact channel. Use when the visitor wants the short version, a summary, an overview, or says they are in a hurry.",
    parameters: z.object({}),
    handler: () => {
      store().openBrief();
      return "The brief is open: identity, current role, guilds, work by rank, signature skills, contact and CV. The visitor can read it — do not recite it; one line on what to look at first.";
    },
  }),
  define({
    name: "close_windows",
    description: "Send everything back to orbit: closes the sector window, the case file, the inspect card, the palette and the CV viewer.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      s.closeFocus();
      s.setPaletteOpen(false);
      s.setCvOpen(false);
      return "All windows closed. The record is back in orbit.";
    },
  }),
  define({
    name: "inspect_entity",
    description: "Open the detail card for one skill, inventory item or quest (project) by its id from the dossier. The Monolith fires a beam at its shard.",
    parameters: z.object({
      kind: z.enum(["skill", "item", "quest"]),
      id: z.string().describe("Entity id, e.g. a skill id like 'langgraph', an item id like 'hunter-license', a quest id like 'pharma-mas'."),
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
    name: "arise",
    description:
      "Command a fallen quest (project) to ARISE: its dormant shard ignites, its sealed details open and it binds to the Monolith on a tight orbit. Omit id to raise the next fallen one. One at a time — each extraction takes a few seconds.",
    parameters: z.object({ id: z.enum(quests.map((q) => q.id) as [string, ...string[]]).optional() }),
    handler: ({ id }) => {
      const s = store();
      if (s.rising) return `Another shadow is mid-extraction (${s.rising}); try again in a few seconds.`;
      const target = id ?? quests.find((q) => !s.risen.includes(q.id))?.id;
      if (!target) return "Every quest has already risen.";
      if (s.risen.includes(target)) return `"${target}" has already risen.`;
      s.arise(target);
      return `ARISE — "${target}" is being extracted.`;
    },
  }),
  define({
    name: "arise_all",
    description: "Raise EVERY fallen quest (project), one extraction after another, until all of them are bound to the Monolith. Takes a few seconds per shadow.",
    parameters: z.object({}),
    handler: async () => {
      const s = store();
      if (quests.every((q) => s.risen.includes(q.id))) return "Every quest has already risen.";
      const count = await ariseAll();
      const risen = store().risen.length;
      const tally = `${count} shadow${count === 1 ? "" : "s"} extracted`;
      return risen === quests.length
        ? `ARISE — ${tally}; the legion is complete (${risen}/${quests.length}).`
        : `ARISE — ${tally}, then the extraction stalled (${risen}/${quests.length} risen). Offer to try again.`;
    },
  }),
  define({
    name: "open_cv",
    description: "Project the Hunter's License: open the full CV (PDF) viewer with a download option.",
    parameters: z.object({}),
    handler: () => {
      store().setCvOpen(true);
      pulse("item:hunter-license");
      return "CV viewer open.";
    },
  }),
  define({
    name: "open_gates",
    description:
      "Leave this gate for the Gate Realm (the page /gates): a star system where every gate into the record is a world — this one is First Light (rank C); Erebus (rank S) is sealed; five more are uncharted. Use only when the visitor asks for the gates, the realm, other worlds or tiers, or Erebus.",
    parameters: z.object({}),
    handler: () => {
      window.setTimeout(() => window.location.assign("/gates"), 600);
      return "Taking the visitor to the Gate Realm. Say one short line of farewell; this page is about to close.";
    },
  }),
  define({
    name: "download_cv",
    description:
      "Download the Hunter's License — the Player's CV as a PDF file — straight to the visitor's device. Use when they want to download, save or get the CV / resume / hunter card.",
    parameters: z.object({}),
    handler: () => {
      download(CV_URL, CV_FILE);
      store().completeQuest("license");
      return `Download of ${CV_FILE} started on the visitor's device.`;
    },
  }),
  define({
    name: "copy_contact",
    description: "Copy one of the Player's channels (email address, phone number, GitHub, LinkedIn) or this portfolio's link to the visitor's clipboard.",
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
      "Open one of the Player's channels for the visitor: GitHub or LinkedIn in a new tab, email in their mail app (a new message to the Player), the phone number in their dialer, or this portfolio's link.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: ({ channel }) => {
      const { label, href } = channelTarget(channel, player.links, window.location.origin);
      if (channel === "email" || channel === "phone") {
        window.location.href = href;
        return channel === "email" ? "Opened a new email to the Player in the visitor's mail app." : "Handed the Player's phone number to the visitor's dialer.";
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
    name: "reset_progress",
    description:
      "Wipe the visitor's progress (level, XP, opened sectors, completed quests, risen shadows) and start over. ONLY when the visitor explicitly asks to reset / start over.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      if (s.rising) return "A shadow is mid-extraction; try again in a few seconds.";
      s.closeFocus();
      s.resetProgress();
      return "Progress reset: the visitor is back to level 1 and every shadow has fallen again.";
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
      "Push a System notification (with the System chime) onto the visitor's screen — for quest hints, warnings, flavor announcements. Keep heading ≤ 4 words, body ≤ 140 chars.",
    parameters: z.object({
      heading: z.string().describe("Short uppercase heading, e.g. 'HIDDEN QUEST'"),
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
      "Play a cinematic effect for dramatic moments: tremor (camera shake), surge (the lens splits + a deep hum), awaken (both, with a shockwave across the void and the ARISE roar).",
    parameters: z.object({ effect: z.enum(["tremor", "surge", "awaken"]) }),
    handler: ({ effect }) => {
      castEffect(effect);
      play(effect === "awaken" ? "arise" : effect === "surge" ? "portal" : "blade");
      return `Effect "${effect}" cast.`;
    },
  }),
  define({
    name: "visitor_progress",
    description: "Report the visitor's level, XP, SYNC, opened sectors, completed System quests and risen shadows.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      return `Visitor LV.${levelFor(s.xp)} (${s.xp} XP), SYNC ${syncPercent(s)}%. Sectors opened: ${s.visited.join(", ") || "none"}. Quests done: ${s.completed.join(", ") || "none"}. Shadows risen: ${s.risen.length}/${quests.length}.`;
    },
  }),
];

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
