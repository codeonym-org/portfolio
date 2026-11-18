/**
 * ── WHAT IS LEFT TO SEE ───────────────────────────────────────
 * What the stranger has not seen yet, in the order a hiring team
 * needs it: the brief, the strongest work, the projects, the
 * experience, the skills, the CV, and last Contact. The agent is
 * given the whole list as context and decides by itself whether to
 * offer anything; nothing here offers on its own.
 *
 * Pure and dependency-free (unit-tested with `node --test`).
 */

export interface Seen {
  /** sector ids the stranger has opened */
  sectors: string[];
  briefRead: boolean;
  cvRead: boolean;
  /** entity keys (`project:<id>`) the stranger has inspected this visit */
  inspected: string[];
}

export interface Unseen {
  id: string;
  /** the command that shows it */
  command: { name: string; args: Record<string, unknown> };
}

/** the strongest project, if the record names one */
export interface StepIndex {
  flagship?: { id: string; name: string };
}

/** how many offers in a row a stranger may refuse before the agent stops offering */
export const MAX_DECLINED = 2;
/** no two offers closer together than this */
export const OFFER_GAP_MS = 20_000;

/** everything the stranger has not seen yet, most useful first */
export function unseenSteps(seen: Seen, index: StepIndex): Unseen[] {
  const opened = (id: string) => seen.sectors.includes(id);
  const sector = (id: string): Unseen | false => !opened(id) && { id, command: { name: "open_sector", args: { sector: id } } };
  const steps: (Unseen | false | undefined)[] = [
    !seen.briefRead && { id: "brief", command: { name: "open_brief", args: {} } },
    index.flagship && !seen.inspected.includes(`project:${index.flagship.id}`) && { id: "flagship", command: { name: "inspect_entity", args: { kind: "project", id: index.flagship.id } } },
    sector("projects"),
    sector("experience"),
    sector("skills"),
    !seen.cvRead && { id: "cv", command: { name: "open_cv", args: {} } },
    sector("contact"),
  ];
  return steps.filter((s): s is Unseen => !!s);
}

/** an offer's identity: the action and its arguments */
export const proposalKey = (name: string, args: Record<string, unknown> = {}) =>
  [name, ...Object.keys(args).sort().map((k) => String(args[k]))].join(" ");
