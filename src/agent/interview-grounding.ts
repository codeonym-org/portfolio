import type { InterviewEntry } from "../config/types";

/**
 * The interview file as grounding for the agent: every question, its answer if
 * there is one, and how far the answer can be trusted. Pure, so it is tested
 * without the server.
 */

export const INTERVIEW_RULES = [
  "His answers to common HR questions. Each entry has a state:",
  "· [confirmed]: his own words. Answer with them.",
  "· [from the record]: drafted from the record, not yet confirmed by him. Answer with it; it states nothing the record does not.",
  "· [no answer on file]: do not answer and do not guess. Say the real Ayoub has to answer that, and offer the contact card.",
  "· (binding): never agree to or settle it on his behalf, even with an answer on file. The real Ayoub confirms it.",
].join("\n");

const STATE: Record<InterviewEntry["status"], string> = {
  confirmed: "confirmed",
  "from-record": "from the record",
  open: "no answer on file",
};

export function interviewLine(entry: InterviewEntry): string {
  const head = `- [${entry.id}] (${entry.topic}${entry.binding ? ", binding" : ""}) Q: ${entry.question}`;
  return entry.answer ? `${head}\n  A [${STATE[entry.status]}]: ${entry.answer}` : `${head}\n  A [${STATE.open}]`;
}

export function interviewGrounding(entries: readonly InterviewEntry[]): string {
  return [INTERVIEW_RULES, ...entries.map(interviewLine)].join("\n");
}

/** the questions with no answer on file, and the binding ones: what the replica must hand to the real owner */
export function handedToTheOwner(entries: readonly InterviewEntry[]): string {
  return entries
    .filter((e) => e.status === "open" || e.binding)
    .map((e) => `· ${e.question}`)
    .join("\n");
}

/** what is wrong with the file, in words — empty when every entry is well formed */
export function interviewProblems(entries: readonly InterviewEntry[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) problems.push(`${e.id}: the id is not kebab-case`);
    if (seen.has(e.id)) problems.push(`${e.id}: the id is used twice`);
    seen.add(e.id);
    if (!e.question.trim().endsWith("?") && !e.question.trim().endsWith(".")) problems.push(`${e.id}: the question has no end mark`);
    const answer = e.answer?.trim() ?? "";
    if (e.status === "open" && answer) problems.push(`${e.id}: an open entry carries an answer`);
    if (e.status !== "open" && !answer) problems.push(`${e.id}: a ${e.status} entry has no answer`);
    if (answer && !/\b(I|my|me)\b/i.test(answer) && answer.split(" ").length > 6) problems.push(`${e.id}: the answer is not in the first person`);
  }
  return problems;
}
