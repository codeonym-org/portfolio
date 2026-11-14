"use client";

import { useEffect, useRef } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import type { Message, ToolCall } from "@ag-ui/client";
import { SYSTEM_AGENT_ID } from "@/agent/constants";
import { runLocally } from "@/agent/converse";
import { cleanReply, withDisclosure, withoutRepeatedDisclosure } from "@/agent/reply-hygiene";
import { player } from "@/config/player.config";
import { parseVoiceTask } from "@/agent/voice/protocol";
import { isSectorId, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { caseSchema } from "@/record/case-file";
import { compactArgs, useSession, type Card, type Turn } from "@/store/session-store";
import { live, pulse } from "@/store/world-store";

/**
 * ── THE LIVE AGENT, AS A SESSION ──────────────────────────────
 * Turns the text agent's AG-UI message list into what the interface
 * shows: turns (the conversation), cards (what its presentation
 * tools drew) and the run trace (every tool call, by its real name,
 * with its arguments and how long it took). Also registers the
 * agent as the session's sender; if a run fails, the same message is
 * answered by the local index instead.
 */

function textOf(m: Message): string {
  const c = (m as { content?: unknown }).content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("");
  return "";
}

function parseArgs(call: ToolCall): Record<string, unknown> {
  try {
    return JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

const ARCHIVE_SECTOR: Record<string, string> = { identity: "status", experience: "experience", education: "experience", projects: "projects", skills: "skills", inventory: "inventory" };

/** the beam for tool calls that do not touch the store themselves (backend lookups, cards) */
function reach(name: string, args: Record<string, unknown>) {
  if (name === "consult_archive") {
    const sector = ARCHIVE_SECTOR[String(args.section)];
    if (sector && isSectorId(sector)) pulse(`sector:${sector}`);
  } else if (name === "present_skills" && Array.isArray(args.ids)) {
    args.ids.slice(0, 12).forEach((id) => pulse(`skill:${String(id)}`));
  } else if (name === "show_contact_card" || name === "show_map") {
    pulse("sector:contact");
  }
}

function cardOf(name: string, args: Record<string, unknown>): Card | null {
  if (name === "show_map") return { type: "map" };
  if (name === "show_contact_card") return { type: "contact", links: Array.isArray(args.links) ? args.links.map(String) : undefined };
  if (name === "present_skills" && Array.isArray(args.ids)) return { type: "skills", ids: args.ids.map(String), title: typeof args.title === "string" ? args.title : undefined };
  if (name === "assemble_case") {
    const file = caseSchema.safeParse(args);
    return file.success ? { type: "case", file: file.data } : null;
  }
  return null;
}

/** every assistant message between two visitor messages is one turn: its cards, then its words */
function toTurns(messages: Message[], settled: Set<string>, running: boolean): Turn[] {
  const turns: Turn[] = [];
  let open: Turn | null = null;
  for (const m of messages) {
    if (m.role === "user") {
      const task = parseVoiceTask(textOf(m));
      turns.push({ id: m.id, role: "visitor", text: task ? task.task : textOf(m), voice: !!task });
      open = null;
    } else if (m.role === "assistant") {
      const calls = (m as { toolCalls?: ToolCall[] }).toolCalls ?? [];
      // a card appears once its tool call's arguments have fully arrived
      const cards = calls.filter((c) => settled.has(c.id)).map((c) => cardOf(c.function.name, parseArgs(c))).filter((c): c is Card => !!c);
      // tool calls written out as text, or a run of "… … …" from a model that lost the thread, are never shown
      const text = cleanReply(textOf(m));
      if (!text && !cards.length) continue;
      if (!open) {
        open = { id: m.id, role: "system", text, cards };
        turns.push(open);
      } else {
        open.text = [open.text, text].filter(Boolean).join("\n\n");
        open.cards = [...(open.cards ?? []), ...cards];
      }
    }
  }
  // the first answer to the stranger discloses the replica, and only that one. The prompt asks the model
  // for it; the model does not always comply, so the console makes sure. The first answer is checked once
  // complete, so a disclosure still streaming in is not doubled.
  const first = turns.findIndex((t) => t.role === "visitor" && !t.voice);
  turns.forEach((t, i) => {
    if (t.role !== "system" || i <= first) return;
    if (i !== first + 1) t.text = withoutRepeatedDisclosure(t.text);
    else if (!running || turns.slice(i + 1).some((n) => n.role === "visitor")) t.text = withDisclosure(t.text, player.firstName);
  });
  return turns;
}

/** how long a run may go without a single new token or tool call before the local index takes over */
const STALL_MS = 25_000;

/** rejects when a run stops making progress — a link that never came up must not leave the visitor waiting */
function stalled(agent: { messages: unknown[]; isRunning: boolean }, stop: () => void): Promise<never> {
  return new Promise((_, reject) => {
    const mark = () => `${agent.messages.length}:${JSON.stringify(agent.messages[agent.messages.length - 1] ?? null).length}`;
    let last = mark();
    let since = Date.now();
    let started = false;
    const timer = setInterval(() => {
      started ||= agent.isRunning;
      if (started && !agent.isRunning) return clearInterval(timer);
      const now = mark();
      if (now !== last) {
        last = now;
        since = Date.now();
      } else if (Date.now() - since > STALL_MS) {
        clearInterval(timer);
        stop();
        reject(new Error("the run stalled"));
      }
    }, 500);
  });
}

export function AgentBridge() {
  const { agent } = useAgent({ agentId: SYSTEM_AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const refs = useRef({ agent, copilotkit });
  const seen = useRef(new Set<string>());
  const runs = useRef(0);

  useEffect(() => {
    refs.current = { agent, copilotkit };
  }, [agent, copilotkit]);

  const messages = agent.messages as Message[];
  const running = agent.isRunning;

  // register as the session's sender
  useEffect(() => {
    const session = useSession.getState();
    session.set({
      agentSend: async (text) => {
        const { agent, copilotkit } = refs.current;
        play("confirm", { volume: 0.3 });
        useSession.getState().set({ notice: null });
        const before = agent.messages.length;
        agent.addMessage({ id: crypto.randomUUID(), role: "user", content: text });
        try {
          await Promise.race([copilotkit.runAgent({ agent }), stalled(agent, () => copilotkit.stopAgent({ agent }))]);
          const answered = (agent.messages as Message[]).slice(before + 1).some((m) => m.role === "assistant");
          if (!answered) throw new Error("the run ended without a reply");
          useSession.getState().set({ online: true });
        } catch (err) {
          console.error("[system] run failed — answering from the local index", err);
          useSession.getState().set({ online: false, notice: world.agent.offline });
          await runLocally(text, { echo: false });
        }
      },
      agentStop: () => refs.current.copilotkit.stopAgent({ agent: refs.current.agent }),
    });
    return () => useSession.getState().set({ agentSend: null, agentStop: null });
  }, []);

  // the run itself is a step of the trace
  useEffect(() => {
    live.agentBusy = running;
    const session = useSession.getState();
    if (running) session.step({ id: `run-${++runs.current}`, name: "agent.run", args: `thread: "system"`, source: "agent" });
    else if (runs.current) session.step({ id: `run-${runs.current}`, status: "done" });
    session.set({ running });
  }, [running]);

  // messages → turns, cards, trace, beams
  const tail = messages.length ? `${messages.length}:${textOf(messages[messages.length - 1]).length}` : "0";
  const calls = messages.reduce((n, m) => n + ((m as { toolCalls?: ToolCall[] }).toolCalls?.length ?? 0), 0);
  useEffect(() => {
    const session = useSession.getState();
    const results = new Map<string, string>();
    for (const m of messages) if (m.role === "tool") results.set(m.toolCallId, textOf(m));
    const settled = new Set(results.keys());

    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const call of (m as { toolCalls?: ToolCall[] }).toolCalls ?? []) {
        const args = parseArgs(call);
        const result = results.get(call.id);
        const failed = result !== undefined && /^(Invalid|Unknown command|No \w+ "|Command ".*" failed)/.test(result);
        session.step({ id: call.id, name: call.function.name, args: compactArgs(args), status: result === undefined ? "running" : failed ? "failed" : "done", source: "agent" });
        if (result !== undefined && !seen.current.has(call.id)) {
          seen.current.add(call.id);
          reach(call.function.name, args);
        }
      }
    }
    session.upsertTurns(toTurns(messages, settled, running));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tail`, `calls` and `running` are the change signals for the mutable message list
  }, [tail, calls, running]);

  return null;
}
