import { achievements, timeline } from "@/config/timeline.config";
import { documents } from "@/config/documents.config";
import { owner } from "@/config/owner.config";
import { projects } from "@/config/projects.config";
import { skillCategories, skills } from "@/config/skills.config";
import { sectors, world } from "@/config/world.config";
import type { CaseFile } from "@/record/case-file";
import { compactArgs, useSession } from "@/store/session-store";
import { live, useWorldStore } from "@/store/world-store";
import { answerLocally, type BrainIndex } from "./local-brain";
import { dropPendingProposal, executeSystemCommand } from "./system-commands";

/**
 * ── ONE WAY IN ────────────────────────────────────────────────
 * Everything the visitor says goes through `converse`. It hands the
 * words to the live agent when its link is up, and to the local
 * index when it is not — the interface never needs to know which.
 */

/** the case the record makes with no model to argue it: the strongest entries, in their own words */
function defaultCase(): CaseFile {
  // the craft, not the passives: languages spoken and soft skills grade high but argue nothing
  const job = new Set(skillCategories.filter((c) => c.set === "job").map((c) => c.id));
  const top = skills
    .filter((s) => job.has(s.category))
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 2);
  const main = projects.filter((q) => q.type === "work");
  return {
    title: `The record of ${owner.handle}`,
    thesis: owner.profile[0],
    evidence: [
      ...main.map((q) => ({ kind: "project" as const, id: q.id, why: q.summary })),
      { kind: "experience" as const, id: timeline[0].id, why: `${timeline[0].role} at ${timeline[0].organization}, ${timeline[0].period}.` },
      ...top.map((s) => ({ kind: "skill" as const, id: s.id, why: s.about })),
      { kind: "education" as const, id: achievements[0].id, why: `${achievements[0].title} — ${achievements[0].issuer}, ${achievements[0].period}.` },
    ].map((e) => ({ ...e, why: e.why.length > 220 ? `${e.why.slice(0, 217)}…` : e.why })),
    verdict: "Assembled by the local index from the record as written — no model weighed it. Ask again when the link is up for a case argued to your question.",
  };
}

let index: BrainIndex | null = null;
function brainIndex(): BrainIndex {
  index ??= {
    owner: { name: owner.firstName, title: owner.title, job: owner.job, organization: owner.organization, location: owner.location, motto: owner.motto },
    sectors: sectors.map(({ id, name, section }) => ({ id, name, section })),
    projects: projects.map((q) => ({ id: q.id, name: q.name, summary: q.summary, stack: q.stack })),
    skills: skills.map(({ id, name }) => ({ id, name })),
    items: documents.map(({ id, name }) => ({ id, name })),
    defaultCase: defaultCase(),
  };
  return index;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let localSeq = 0;

/** answer from the local index, running its commands the way the agent would (visibly, one by one), and offering nothing: offers are the agent's own judgement */
export async function runLocally(text: string, opts: { echo?: boolean } = {}) {
  const session = useSession.getState();
  // unique across visits: a conversation resumed later keeps the ids of its earlier turns
  const id = `local-${Date.now().toString(36)}-${++localSeq}`;
  if (opts.echo !== false) session.upsertTurns([{ id: `${id}-q`, role: "visitor", text }]);
  session.set({ running: true });
  live.agentBusy = true;
  try {
    const reply = answerLocally(text, brainIndex());
    session.step({ id: `${id}-route`, name: "local_index.route", args: compactArgs({ query: text }), source: "local" });
    await wait(260);
    session.step({ id: `${id}-route`, status: "done" });
    for (const [i, action] of reply.actions.entries()) {
      const step = `${id}-${i}`;
      session.step({ id: step, name: action.name, args: compactArgs(action.args), source: "local" });
      const result = await executeSystemCommand(action.name, action.args);
      session.step({ id: step, status: /^(Invalid|Unknown|Command .* failed)/.test(result) ? "failed" : "done" });
      await wait(140);
    }
    session.upsertTurns([{ id: `${id}-a`, role: "system", text: reply.text, cards: reply.map ? [{ type: "map" }] : undefined }]);
  } finally {
    live.agentBusy = false;
    useSession.getState().set({ running: false });
  }
}

const ASKS_FOR_MORE = /what (else|next|now|should i (see|read|look))|show me more|anything else|where (next|should i)|quoi d'autre|et ensuite|la suite/i;

/** how long a message waits for the link to come up before the local index takes it */
const LINK_WAIT_MS = 5000;

export async function converse(input: string) {
  const text = input.trim().slice(0, 1200);
  if (!text || useSession.getState().running) return;
  // moving on without answering a proposal is ignoring it
  dropPendingProposal();
  if (useWorldStore.getState().prompt?.id === "offer") useWorldStore.getState().ignore();
  // asking for more reopens the offers a visitor had declined
  if (ASKS_FOR_MORE.test(text)) useWorldStore.getState().invite();
  useSession.getState().set({ mode: "text" });

  // the link loads lazily: give it a moment on the first message
  const deadline = Date.now() + LINK_WAIT_MS;
  while (useSession.getState().online === null && !useSession.getState().agentSend && Date.now() < deadline) {
    useSession.getState().set({ running: true });
    await wait(120);
  }
  const { agentSend, online } = useSession.getState();
  if (agentSend && online !== false) return agentSend(text);
  if (online !== false) useSession.getState().set({ online: false, notice: world.agent.offline });
  return runLocally(text);
}

/** try the live agent again on the next message */
export function retryLink() {
  useSession.getState().set({ online: null, notice: null });
}
