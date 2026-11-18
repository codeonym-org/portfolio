import "server-only";
import { ChatOpenAI } from "@langchain/openai";

/**
 * ── THE SYSTEM'S MIND ─────────────────────────────────────────
 * OpenRouter speaks the OpenAI wire protocol, so the agent talks to
 * it through ChatOpenAI with a swapped base URL.
 *
 * The model id is resolved per request, never baked into the build:
 *   1. `MODEL_ID` in Vercel Edge Config (when `EDGE_CONFIG` is set) —
 *      edit it in the dashboard and the next message uses it, no
 *      redeploy at all;
 *   2. the `MODEL_ID` environment variable;
 *   3. the default below.
 *
 * Default: Claude Haiku 5.5 with no reasoning, measured on OpenRouter
 * (2026-11): ~1 s to the first token with tools and a 6k-token prompt,
 * every tool call right, Artificial Analysis index 36 (gpt-oss-120b,
 * before it: 0.6 s but 4), ~$0.0004 a turn.
 */

export const OPENROUTER_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL_ID = "anthropic/claude-haiku-5.5";

/**
 * Which of a model's OpenRouter providers to try first, in order (falling
 * back to the rest if all are down): `MODEL_PROVIDERS`, comma-separated
 * provider slugs. For Claude the default is the fastest to the first
 * token in a measured run, all at the same price (Bedrock left out: one
 * call took 12 s). Other models: OpenRouter's own routing.
 */
const CLAUDE_PROVIDERS = ["claude-on-aws", "anthropic", "google-vertex"];
export function providerOrder(modelId: string): string[] | undefined {
  const set = process.env.MODEL_PROVIDERS?.split(",").map((p) => p.trim()).filter(Boolean);
  if (set?.length) return set;
  return modelId.startsWith("anthropic/") ? CLAUDE_PROVIDERS : undefined;
}

/** `MODEL_REASONING` low | medium | high; unset or "off": no reasoning asked for (the default model answers straight) */
export function reasoningEffort(): "low" | "medium" | "high" | undefined {
  const v = process.env.MODEL_REASONING?.trim().toLowerCase();
  return v === "low" || v === "medium" || v === "high" ? v : undefined;
}

const EDGE_TTL_MS = 30_000;
let edgeCache: { at: number; id: string | null } | null = null;

/** reads one key from Edge Config over its REST endpoint (no SDK needed) */
async function readEdgeConfigModel(): Promise<string | null> {
  const conn = process.env.EDGE_CONFIG;
  if (!conn) return null;
  if (edgeCache && Date.now() - edgeCache.at < EDGE_TTL_MS) return edgeCache.id;
  let id: string | null = null;
  try {
    const url = new URL(conn);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/item/MODEL_ID`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const value: unknown = await res.json();
      if (typeof value === "string" && value.trim()) id = value.trim();
    }
  } catch {
    // Edge Config unreachable — fall through to the environment
  }
  edgeCache = { at: Date.now(), id };
  return id;
}

export async function resolveModelId(): Promise<string> {
  return (await readEdgeConfigModel()) ?? process.env.MODEL_ID?.trim() ?? DEFAULT_MODEL_ID;
}

export function hasModelKey(): boolean {
  return !!process.env.OPEN_ROUTER_API_KEY;
}

/** attribution headers OpenRouter shows on its dashboard */
function attribution() {
  return {
    "HTTP-Referer": process.env.SITE_URL ?? "https://portfolio.codeonym.work",
    // header values must stay Latin-1 — no em dashes here
    "X-Title": "codeonym - The System",
  };
}

/** for the raw audio endpoints (no SDK) */
export function openRouterHeaders(): Record<string, string> {
  return { ...attribution(), authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY ?? ""}` };
}

export interface ChatModelOptions {
  temperature?: number;
  maxTokens?: number;
  /** reasoning effort for models that think (the voice can't wait long); none sent when unset */
  reasoningEffort?: "low" | "medium" | "high";
}

export function createChatModel(modelId: string, opts: ChatModelOptions = {}) {
  const order = providerOrder(modelId);
  const modelKwargs = {
    ...(opts.reasoningEffort ? { reasoning: { effort: opts.reasoningEffort } } : {}),
    ...(order ? { provider: { order, allow_fallbacks: true } } : {}),
  };
  return new ChatOpenAI({
    model: modelId,
    apiKey: process.env.OPEN_ROUTER_API_KEY,
    temperature: opts.temperature ?? 0.55,
    maxTokens: opts.maxTokens ?? 1400,
    streaming: true,
    // OpenRouter only implements Chat Completions
    useResponsesApi: false,
    ...(Object.keys(modelKwargs).length ? { modelKwargs } : {}),
    configuration: {
      baseURL: OPENROUTER_URL,
      defaultHeaders: attribution(),
    },
  });
}
