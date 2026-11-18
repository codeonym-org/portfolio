import "server-only";
import type { Client } from "@langchain/langgraph-sdk";
import { Command } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { SystemGraph } from "./agent";

/**
 * ── IN-PROCESS LANGGRAPH CLIENT ───────────────────────────────
 * `@ag-ui/langgraph`'s LangGraphAgent translates a LangGraph run into
 * AG-UI events, but it expects a LangGraph *server* behind a
 * `@langchain/langgraph-sdk` Client. This object implements the slice
 * of that Client the adapter calls, against a compiled graph living
 * in this very process — so the whole agent ships inside one Next.js
 * route on Vercel, no LangGraph deployment needed.
 *
 * Messages cross the boundary in the LangGraph Platform wire shape
 * (plain `{ type, id, content, tool_calls… }` dicts), exactly what the
 * adapter's converters expect from a real server.
 */

type Json = Record<string, unknown>;
type PlatformMessage = Json & { type: string; id?: string; content?: unknown };

/** state keys a run may write — never replay jumpTo/counters from a stale client snapshot */
const INPUT_KEYS = ["messages", "copilotkit"];

function toPlatformMessage(m: BaseMessage): PlatformMessage {
  const out: PlatformMessage = {
    type: m.getType(),
    id: m.id,
    content: m.content,
    name: m.name,
    additional_kwargs: m.additional_kwargs,
    response_metadata: m.response_metadata,
  };
  if (AIMessage.isInstance(m)) {
    out.tool_calls = m.tool_calls ?? [];
    out.invalid_tool_calls = m.invalid_tool_calls ?? [];
    if (m.usage_metadata) out.usage_metadata = m.usage_metadata;
  }
  if (ToolMessage.isInstance(m)) {
    out.tool_call_id = m.tool_call_id;
    out.status = m.status;
  }
  return out;
}

/** reasoning blocks never go back to a Chat Completions provider */
function textOnly(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content == null ? "" : String(content);
  return content
    .map((b) => (typeof b === "string" ? b : b && typeof b === "object" && (b as Json).type === "text" ? String((b as Json).text ?? "") : ""))
    .join("");
}

function fromPlatformMessage(raw: unknown): BaseMessage | null {
  if (BaseMessage.isInstance(raw)) return raw;
  if (!raw || typeof raw !== "object") return null;
  const m = raw as PlatformMessage;
  const id = typeof m.id === "string" ? m.id : undefined;
  switch (m.type) {
    case "human":
      return new HumanMessage({ id, content: m.content as HumanMessage["content"] });
    case "ai":
      return new AIMessage({
        id,
        content: textOnly(m.content),
        tool_calls: Array.isArray(m.tool_calls) ? (m.tool_calls as AIMessage["tool_calls"]) : [],
      });
    case "system":
      return new SystemMessage({ id, content: textOnly(m.content) });
    case "tool":
      return new ToolMessage({
        id,
        content: textOnly(m.content),
        tool_call_id: String(m.tool_call_id ?? ""),
        status: m.status === "error" ? "error" : "success",
      });
    default:
      return null;
  }
}

function toGraphInput(values: Json | null | undefined): Json | null {
  if (!values) return null;
  const input: Json = {};
  for (const key of INPUT_KEYS) {
    if (!(key in values) || values[key] === undefined) continue;
    input[key] =
      key === "messages" && Array.isArray(values.messages)
        ? values.messages.map(fromPlatformMessage).filter((m): m is BaseMessage => !!m)
        : values[key];
  }
  return input;
}

function serializeValues(values: unknown): Json {
  const v = (values ?? {}) as Json;
  const out: Json = {};
  for (const key of Object.keys(v)) {
    out[key] = key === "messages" && Array.isArray(v.messages) ? (v.messages as BaseMessage[]).map(toPlatformMessage) : v[key];
  }
  return out;
}

type Snapshot = Awaited<ReturnType<SystemGraph["getState"]>>;

function toThreadState(threadId: string, snap: Snapshot) {
  const cfg = (snap.config?.configurable ?? {}) as Json;
  return {
    values: serializeValues(snap.values),
    next: [...(snap.next ?? [])],
    tasks: (snap.tasks ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      interrupts: t.interrupts ?? [],
      error: t.error ?? null,
      checkpoint: null,
      state: null,
      result: t.result,
    })),
    metadata: snap.metadata ?? {},
    created_at: snap.createdAt ?? null,
    checkpoint: {
      thread_id: threadId,
      checkpoint_ns: String(cfg.checkpoint_ns ?? ""),
      checkpoint_id: (cfg.checkpoint_id as string | undefined) ?? null,
      checkpoint_map: null,
    },
    parent_checkpoint: snap.parentConfig?.configurable ?? null,
  };
}

export interface InProcessClientOptions {
  graphId: string;
  /** resolved per call — the model can change between runs */
  getGraph: () => Promise<SystemGraph>;
}

/** thread ids seen by this instance — capped; a forgotten id falls back to a checkpoint lookup */
const MAX_KNOWN = 1000;

export function createInProcessClient({ graphId, getGraph }: InProcessClientOptions): Client {
  const knownIds = new Set<string>();
  const known = {
    has: (id: string) => knownIds.has(id),
    add: (id: string) => {
      knownIds.delete(id);
      knownIds.add(id);
      if (knownIds.size > MAX_KNOWN) knownIds.delete(knownIds.values().next().value as string);
    },
  };
  const controllers = new Map<string, AbortController>();
  const assistant = {
    assistant_id: graphId,
    graph_id: graphId,
    name: graphId,
    config: {},
    context: {},
    metadata: {},
    version: 1,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
  const schemaProps = Object.fromEntries(INPUT_KEYS.map((k) => [k, {}]));
  const threadConfig = (threadId: string, checkpointId?: string | null) => ({
    configurable: { thread_id: threadId, ...(checkpointId ? { checkpoint_id: checkpointId } : {}) },
  });

  const client = {
    assistants: {
      search: async () => [assistant],
      get: async () => assistant,
      getSchemas: async () => ({
        graph_id: graphId,
        input_schema: { type: "object", properties: schemaProps },
        output_schema: { type: "object", properties: schemaProps },
        state_schema: { type: "object", properties: schemaProps },
        config_schema: { type: "object", properties: {} },
      }),
      getGraph: async () => {
        const drawable = await (await getGraph()).getGraphAsync();
        return {
          nodes: Object.values(drawable.nodes).map((n) => ({ id: n.id, type: "runnable", data: n.name ?? n.id })),
          edges: drawable.edges.map((e) => ({ source: e.source, target: e.target, conditional: !!e.conditional })),
        };
      },
    },

    threads: {
      get: async (threadId: string) => {
        if (!known.has(threadId)) {
          const snap = await (await getGraph()).getState(threadConfig(threadId));
          if (!snap.config?.configurable?.checkpoint_id) throw new Error(`Thread ${threadId} not found`);
          known.add(threadId);
        }
        return { thread_id: threadId, status: "idle", metadata: {}, values: {} };
      },
      create: async (payload?: { threadId?: string; metadata?: Json }) => {
        const threadId = payload?.threadId ?? crypto.randomUUID();
        known.add(threadId);
        return { thread_id: threadId, status: "idle", metadata: payload?.metadata ?? {}, values: {} };
      },
      getState: async (threadId: string) => toThreadState(threadId, await (await getGraph()).getState(threadConfig(threadId))),
      updateState: async (threadId: string, options: { values?: Json; checkpointId?: string; asNode?: string }) => {
        const graph = await getGraph();
        const config = await graph.updateState(threadConfig(threadId, options.checkpointId), toGraphInput(options.values) ?? {}, options.asNode);
        return { checkpoint: { thread_id: threadId, checkpoint_ns: "", checkpoint_id: config.configurable?.checkpoint_id ?? null }, configurable: config.configurable };
      },
      getHistory: async (threadId: string, options?: { checkpoint?: { checkpoint_id?: string }; limit?: number }) => {
        const graph = await getGraph();
        const history = [];
        for await (const snap of graph.getStateHistory(threadConfig(threadId, options?.checkpoint?.checkpoint_id), { limit: options?.limit ?? 50 })) {
          history.push(toThreadState(threadId, snap));
        }
        return history;
      },
    },

    runs: {
      stream: (threadId: string, _assistantId: string, payload: Json & { input?: Json; command?: { resume?: unknown }; config?: Json & { configurable?: Json; recursion_limit?: number }; checkpointId?: string; context?: Json }) =>
        (async function* () {
          const graph = await getGraph();
          const controller = new AbortController();
          controllers.set(threadId, controller);
          known.add(threadId);
          const input = payload.command?.resume !== undefined ? new Command({ resume: payload.command.resume }) : toGraphInput(payload.input);
          try {
            const events = graph.streamEvents(input, {
              version: "v2",
              // LangSmith (when LANGSMITH_TRACING=true): one named trace per run, grouped by thread
              runName: graphId,
              tags: [graphId],
              metadata: { agent: graphId, thread_id: threadId },
              configurable: { ...(payload.config?.configurable ?? {}), ...threadConfig(threadId, payload.checkpointId).configurable },
              recursionLimit: payload.config?.recursion_limit ?? 40,
              signal: controller.signal,
              ...(payload.context ? { context: payload.context } : {}),
            });
            for await (const data of events) yield { event: "events", data };
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error("[system-agent] run failed:", err);
            // details stay in the server log; the visitor gets an in-world line
            yield { event: "error", data: { error: "RunError", message: "The agent lost its connection. Try again in a moment." } };
          } finally {
            if (controllers.get(threadId) === controller) controllers.delete(threadId);
          }
        })(),
      cancel: async (threadId: string) => {
        controllers.get(threadId)?.abort();
      },
    },
  };

  return client as unknown as Client;
}
