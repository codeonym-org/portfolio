/**
 * ── WHAT HE DID, IN WORDS ─────────────────────────────────────
 * Every tool he calls is a step of the run trace. Under each question
 * the conversation lists the steps taken to answer it, in plain words
 * ("Opened projects"), with the real call beside them for whoever
 * wants to see how the agent works (`open_sector · 120 ms`).
 */

export interface Step {
  id: string;
  name: string;
  args: string;
  status: "running" | "done" | "failed";
  startedAt: number;
  ms?: number;
}

/** steps of the run itself, not of anything it did */
const PLUMBING = new Set(["agent.run", "local_index.route"]);

/**
 * The steps taken for the question asked at `at`: from a moment before
 * it (the trace and the turn are stamped by different clocks in the
 * same tab) until the next question.
 */
export function stepsFor<S extends Step>(trace: readonly S[], at: number, next: number | undefined): S[] {
  return trace.filter((s) => !PLUMBING.has(s.name) && s.startedAt >= at - 400 && (next === undefined || s.startedAt < next - 400));
}

/** the first value in compact arguments: `sector: "projects"` → `projects` */
export function firstArg(args: string): string {
  const quoted = /"([^"]*)"/.exec(args);
  if (quoted) return quoted[1];
  const bare = /:\s*([^,\s)]+)/.exec(args);
  return bare ? bare[1] : "";
}

const humanize = (id: string) => id.replace(/[-_]+/g, " ").trim();

const WORDS: Record<string, [now: string, done: string, takesArg?: boolean]> = {
  open_sector: ["Opening", "Opened", true],
  inspect_entity: ["Looking at", "Looked at", true],
  open_brief: ["Opening the one-minute brief", "Opened the one-minute brief"],
  open_github: ["Reading my GitHub", "Opened my GitHub"],
  open_map: ["Opening the map", "Opened the map"],
  close_windows: ["Clearing the table", "Cleared the table"],
  assemble_case: ["Assembling a case file", "Assembled a case file"],
  show_business_card: ["Handing you my card", "Handed you my card"],
  hand_over: ["Offering to talk directly", "Offered to talk directly"],
  open_cv: ["Opening the CV", "Opened the CV"],
  download_cv: ["Preparing the CV", "Prepared the CV"],
  copy_contact: ["Copying my contact", "Copied my contact"],
  open_link: ["Opening a link", "Opened a link"],
  consult_archive: ["Searching the record", "Searched the record"],
  github_live: ["Checking GitHub", "Checked GitHub"],
  delegate_task: ["Handing off a task", "Handed off a task"],
  propose_action: ["Suggesting a next step", "Suggested a next step"],
  capture_snapshot: ["Taking a snapshot", "Took a snapshot"],
  set_sound: ["Changing the sound", "Changed the sound"],
  set_quality: ["Changing the quality", "Changed the quality"],
  set_fullscreen: ["Going full screen", "Went full screen"],
  open_interview: ["Opening the interview", "Opened the interview"],
  download_transcript: ["Preparing the transcript", "Prepared the transcript"],
};

/** a step in plain words, in the present while it runs and in the past once it is done */
export function describe(step: Pick<Step, "name" | "args" | "status">): string {
  const words = WORDS[step.name];
  const running = step.status === "running";
  if (!words) {
    const said = humanize(step.name);
    return running ? `${said[0]?.toUpperCase() ?? ""}${said.slice(1)}…` : `${said[0]?.toUpperCase() ?? ""}${said.slice(1)}`;
  }
  const [now, done, takesArg] = words;
  const arg = takesArg ? humanize(firstArg(step.args)) : "";
  const said = arg ? `${running ? now : done} ${arg}` : running ? now : done;
  return running ? `${said}…` : said;
}

/** how long the steps took together, for the summary of a finished turn */
export function took(steps: readonly Pick<Step, "ms">[]): number {
  return steps.reduce((sum, s) => sum + (s.ms ?? 0), 0);
}

/** `1840` → `1.8 s`, `120` → `120 ms` */
export function duration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}
