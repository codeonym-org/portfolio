/**
 * ── THE NEXT STEP ─────────────────────────────────────────────
 * What the visitor has not seen yet, in the order a hiring team
 * needs it: the brief, the strongest work, the projects, the
 * experience, the skills, the CV, and last the Gate (contact).
 *
 * Pure and dependency-free (unit-tested with `node --test`). The
 * live agent receives the whole list and decides by itself whether
 * to propose anything; the local index proposes the first entry.
 */

export interface Seen {
  /** sector ids the visitor has opened */
  sectors: string[];
  briefRead: boolean;
  cvRead: boolean;
  /** entity keys (`quest:<id>`) the visitor has inspected this visit */
  inspected: string[];
}

export interface NextStep {
  id: string;
  /** the invitation, as the System would say it */
  line: string;
  /** the command that takes the step */
  command: { name: string; args: Record<string, unknown> };
}

export interface StepIndex {
  playerName: string;
  /** the strongest project, if the record names one */
  flagship?: { id: string; name: string };
}

/** how many offers in a row a visitor may decline before the System stops offering */
export const MAX_DECLINED = 2;
/** the System does not raise two offers closer together than this */
export const OFFER_GAP_MS = 20_000;

/** everything the visitor has not seen yet, most useful first */
export function unseenSteps(seen: Seen, index: StepIndex): NextStep[] {
  const opened = (id: string) => seen.sectors.includes(id);
  const steps: (NextStep | false | undefined)[] = [
    !seen.briefRead && { id: "brief", line: "The whole record fits in one minute. Shall I brief you?", command: { name: "open_brief", args: {} } },
    index.flagship &&
      !seen.inspected.includes(`quest:${index.flagship.id}`) && {
        id: "flagship",
        line: `His strongest work is ${index.flagship.name}. Shall I open it?`,
        command: { name: "inspect_entity", args: { kind: "quest", id: index.flagship.id } },
      },
    !opened("projects") && { id: "projects", line: "You have not seen what he built. Shall I bring the projects forward?", command: { name: "open_sector", args: { sector: "projects" } } },
    !opened("experience") && { id: "experience", line: "His experience shows where he did this work. Shall I open it?", command: { name: "open_sector", args: { sector: "experience" } } },
    !opened("skills") && { id: "skills", line: "The skills section lists every skill with its grade. Shall I open it?", command: { name: "open_sector", args: { sector: "skills" } } },
    !seen.cvRead && { id: "cv", line: "His full CV is here. Shall I open it?", command: { name: "open_cv", args: {} } },
    !opened("contact") && { id: "contact", line: `You have seen the record. Contact reaches ${index.playerName} directly. Shall I open it?`, command: { name: "open_sector", args: { sector: "contact" } } },
  ];
  return steps.filter((s): s is NextStep => !!s);
}

export const nextStep = (seen: Seen, index: StepIndex): NextStep | null => unseenSteps(seen, index)[0] ?? null;

/** a proposal's identity: the action and its arguments */
export const proposalKey = (name: string, args: Record<string, unknown> = {}) =>
  [name, ...Object.keys(args).sort().map((k) => String(args[k]))].join(" ");

/** the step that follows `taken`, so an answer never offers what it just did */
export function nextStepAfter(taken: { name: string; args: Record<string, unknown> }[], seen: Seen, index: StepIndex): NextStep | null {
  const after: Seen = { ...seen, sectors: [...seen.sectors], inspected: [...seen.inspected] };
  for (const t of taken) {
    if (t.name === "open_brief") after.briefRead = true;
    else if (t.name === "open_cv" || t.name === "download_cv") after.cvRead = true;
    else if (t.name === "open_sector" && typeof t.args.sector === "string") after.sectors.push(t.args.sector);
    else if (t.name === "inspect_entity") after.inspected.push(`${t.args.kind}:${t.args.id}`);
    // a case argues from the strongest work: do not offer it again right after
    else if (t.name === "assemble_case" && index.flagship) after.inspected.push(`quest:${index.flagship.id}`);
  }
  return nextStep(after, index);
}
