import { z } from "zod";

/**
 * ── CASE FILE ─────────────────────────────────────────────────
 * The agent's generative answer: instead of a paragraph, it picks
 * evidence out of the record and argues a thesis with it. The model
 * only chooses ids and writes the reasoning — every fact shown on a
 * card comes from `src/config`, looked up by id.
 *
 * A case travels in the URL hash (`#case=…`), so a visitor can send
 * the exact view the agent built for them. Links shared before the
 * record's names were renamed (2026-11) still open: their kinds and
 * ids are translated on the way in. Dependency-free besides
 * zod (unit-tested with `node --test`).
 */

export const EVIDENCE_KINDS = ["project", "skill", "experience", "education", "document"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const evidenceSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS).describe("project, skill, experience = a job, education = a degree, document = a document, degree link or interest"),
  id: z.string().min(1).max(64).describe("The entity's exact id from the dossier."),
  why: z.string().min(1).max(220).describe("One sentence: what this piece of the record proves for the thesis. Only facts the dossier states."),
});

export const caseSchema = z.object({
  title: z.string().min(1).max(80).describe("Short title of the case, e.g. 'Fit for a LangGraph platform role'"),
  thesis: z.string().min(1).max(360).describe("The claim being argued, one or two sentences, honest."),
  evidence: z.array(evidenceSchema).min(1).max(7).describe("2–7 pieces of the record, strongest first."),
  verdict: z.string().max(280).optional().describe("Closing line, including any honest gap the record shows."),
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type CaseFile = z.infer<typeof caseSchema>;

export const nodeKeyOf = (e: Pick<Evidence, "kind" | "id">) => `${e.kind}:${e.id}`;

const HASH_KEY = "case";
/** a shared link is typed by strangers: refuse anything oversized before parsing it */
const MAX_ENCODED = 6000;

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string) {
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeCase(file: CaseFile): string {
  return `${HASH_KEY}=${toBase64Url(JSON.stringify(file))}`;
}

/** what older links call things, and what they are called now */
const OLD_KINDS: Record<string, EvidenceKind> = { quest: "project", item: "document" };
const OLD_IDS: Record<string, string> = {
  "hunter-license": "cv",
  "guild-crest": "employer-opensnz",
  "guild-crest-codeonym": "github-codeonym",
  "summoning-stone": "get-in-touch",
  "gate-key": "site-source",
  "master-sigil": "masters-degree",
  "bachelor-crest": "bachelors-degree",
  "bac-scroll": "baccalaureate",
  "ctf-flag": "capture-the-flag",
  "legacy-controller": "video-games",
  "mana-crystal": "coffee",
};

/** an older link's evidence, in today's names */
export function renamed(value: unknown): unknown {
  if (!value || typeof value !== "object" || !Array.isArray((value as { evidence?: unknown }).evidence)) return value;
  const file = value as { evidence: { kind?: unknown; id?: unknown }[] };
  return {
    ...file,
    evidence: file.evidence.map((e) =>
      e && typeof e === "object"
        ? {
            ...e,
            kind: typeof e.kind === "string" ? (OLD_KINDS[e.kind] ?? e.kind) : e.kind,
            id: typeof e.id === "string" ? (OLD_IDS[e.id] ?? e.id) : e.id,
          }
        : e,
    ),
  };
}

/** reads `#case=…` (with or without the #); null for anything that is not a valid case */
export function decodeCase(hash: string): CaseFile | null {
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith(`${HASH_KEY}=`) || raw.length > MAX_ENCODED) return null;
  try {
    const parsed = caseSchema.safeParse(renamed(JSON.parse(fromBase64Url(raw.slice(HASH_KEY.length + 1)))));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** keeps the evidence that exists in the record; reports what was dropped */
export function resolveCase(file: CaseFile, exists: (key: string) => boolean) {
  const seen = new Set<string>();
  const evidence: Evidence[] = [];
  const unknown: string[] = [];
  for (const e of file.evidence) {
    const key = nodeKeyOf(e);
    if (seen.has(key)) continue;
    seen.add(key);
    if (exists(key)) evidence.push(e);
    else unknown.push(key);
  }
  return { file: { ...file, evidence }, unknown };
}
