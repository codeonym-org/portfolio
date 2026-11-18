import { synthesizeSpeech } from "@/agent/server/audio";
import { hasModelKey } from "@/agent/server/model";
import { clientIp, limited, reject } from "@/agent/server/rate-limit";

/**
 * ── THE AGENT'S VOICE (TTS) ──────────────────────────────────
 * POST { text } → audio/mpeg, streamed straight from OpenRouter's
 * speech endpoint (`TTS_MODEL_ID`, `TTS_VOICE`). The browser calls it
 * once per sentence while the voice agent is still writing the next.
 * CopilotKit has no speech-output route, hence this one.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** one sentence from the chunker is ≤ ~260 chars; leave headroom */
const MAX_CHARS = 400;
/** characters per visitor per window (TTS is billed per character) */
const CHAR_BUDGET = 12_000;
const WINDOW_MS = 10 * 60_000;

export async function POST(request: Request) {
  if (!hasModelKey()) return reject(503, "The voice is offline (no model key is configured).");
  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
  } catch {
    return reject(400, "Expected JSON { text }.");
  }
  if (!text) return reject(400, "Nothing to say.");
  if (text.length > MAX_CHARS) return reject(413, "Too long to say at once.");
  // weight the window by characters, in 40-char units
  if (limited(`tts:${clientIp(request)}`, CHAR_BUDGET / 40, WINDOW_MS, Math.ceil(text.length / 40))) {
    return reject(429, "The voice has said a lot for now. Try again in a few minutes.");
  }

  let upstream: Response;
  try {
    upstream = await synthesizeSpeech(text, request.signal);
  } catch (err) {
    console.error("[voice] tts request failed:", err);
    return reject(502, "The voice could not be reached.");
  }
  if (!upstream.ok || !upstream.body) {
    console.error("[voice] tts failed:", upstream.status, (await upstream.text().catch(() => "")).slice(0, 300));
    return reject(502, "The voice could not be reached.");
  }
  return new Response(upstream.body, {
    headers: { "content-type": upstream.headers.get("content-type") ?? "audio/mpeg", "cache-control": "no-store" },
  });
}
