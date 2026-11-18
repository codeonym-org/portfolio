import { after } from "next/server";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { CopilotRuntime, createCopilotRuntimeHandler, InMemoryAgentRunner, ɵGLOBAL_STORE } from "@copilotkit/runtime/v2";
import { lapsedThreads } from "@/agent/retention";
import { OpenRouterTranscriptionService } from "@/agent/server/audio";
import { hasModelKey } from "@/agent/server/model";
import { clientIp, limited, reject } from "@/agent/server/rate-limit";
import { createSystemAgent, createVoiceAgent, SYSTEM_AGENT_ID, VOICE_AGENT_ID } from "@/agent/server/system-agent";

/**
 * ── COPILOTKIT RUNTIME (v2, single endpoint) ──────────────────
 * The browser's CopilotKit provider talks to this one POST route; the
 * runtime runs both Systems in-process and streams AG-UI events:
 *
 *  · `system`       — the text agent (world tools, dialogue window)
 *  · `system-voice` — the voice agent (talks, delegates tasks)
 *
 * plus `transcribe`: CopilotKit's speech-to-text route, served by
 * OpenRouter STT (`STT_MODEL_ID`).
 *
 * Conversations live in this process's memory only (the runner's
 * threads, the graphs' checkpoints): at most 300 of them, and none for
 * longer than seven days from its first message (`agent/retention.ts`).
 * The stranger's browser keeps its own copy for the same seven days and
 * sends the whole conversation with each message, so a thread this
 * process has forgotten simply continues.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const copilotRuntime = new CopilotRuntime({
  agents: { [SYSTEM_AGENT_ID]: createSystemAgent(), [VOICE_AGENT_ID]: createVoiceAgent() },
  runner: new InMemoryAgentRunner({ maxThreads: 300, maxRunsPerThread: 40, onConcurrentRun: "supersede" }),
  transcriptionService: new OpenRouterTranscriptionService(),
});

/* ── retention: the runner has a cap on count but none on age ── */

const SWEEP_EVERY_MS = 10 * 60_000;
let sweptAt = 0;
type Removable = { removeThread?: (id: string, store: unknown) => void };

/** forget the runner's threads that began more than seven days ago; at most once every ten minutes */
function sweepRunner(now = Date.now()) {
  if (now - sweptAt < SWEEP_EVERY_MS) return;
  sweptAt = now;
  try {
    // `removeThread` is the store's own eviction step (the one its count and byte caps use); it is not public
    const store = ɵGLOBAL_STORE as unknown as Removable;
    if (typeof store.removeThread !== "function") return;
    for (const id of lapsedThreads(ɵGLOBAL_STORE, now)) store.removeThread(id, ɵGLOBAL_STORE.peek(id));
  } catch (err) {
    console.warn("[system] retention sweep failed", err);
  }
}

/* ── guards: this endpoint spends real tokens on a public site ── */

/** only what the chat and voice need — the in-memory thread routes list every visitor's threads */
const ALLOWED = new Set(["info", "agent/run", "agent/connect", "agent/stop", "transcribe"]);
/** a few seconds of base64 speech fit well under this */
const MAX_BODY = 3 * 1024 * 1024;
const WINDOW_MS = 10 * 60_000;
/** one spoken turn costs a voice run, a task run and a report run */
const BUDGET = { run: 60, transcribe: 40 };

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
  mode: "single-route",
  hooks: {
    onRequest: ({ request }) => {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > MAX_BODY) throw reject(413, "Message too large for the System.");
    },
    onBeforeHandler: ({ request, route }) => {
      if (!ALLOWED.has(route.method)) throw reject(404, "Not found.");
      if (route.method !== "agent/run" && route.method !== "transcribe") return;
      sweepRunner();
      if (!hasModelKey()) throw reject(503, "The System is dormant (no model key configured).");
      const bucket = route.method === "transcribe" ? "transcribe" : "run";
      if (limited(`${bucket}:${clientIp(request)}`, BUDGET[bucket], WINDOW_MS)) {
        throw reject(429, "The System needs a moment to recover its mana. Try again in a few minutes.");
      }
    },
  },
});

export const POST = (request: Request) => {
  // LangSmith uploads traces in the background; on serverless, finish them before the function freezes
  if (process.env.LANGSMITH_TRACING === "true") after(awaitAllCallbacks);
  return handler(request);
};
