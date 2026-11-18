import "server-only";
import { TranscriptionService, type TranscribeFileOptions } from "@copilotkit/runtime/v2";
import { player } from "@/config/player.config";
import { pronounce } from "../voice/pronounce";
import { audioFormat } from "../voice/protocol";
import { OPENROUTER_URL, openRouterHeaders } from "./model";

/**
 * ── THE SYSTEM'S EARS AND VOICE ───────────────────────────────
 * Both go through OpenRouter's audio endpoints:
 *
 *  STT  POST /audio/transcriptions — plugged into CopilotKit's runtime
 *       as a `TranscriptionService`, so the browser uses the runtime's
 *       own `transcribe` route
 *  TTS  POST /audio/speech — raw mp3 bytes, streamed straight through
 *       by `app/api/voice/speech`
 *
 * Defaults, measured on OpenRouter (2026-11), English / French / Arabic:
 *  · STT `mistralai/voxtral-mini-transcribe-3-0` — the fastest that got
 *    all three right: 0.5–0.7 s for a short clip (gpt-4o-mini-transcribe,
 *    before it: 0.8–1.2 s, and it misheard the English), 2.2 % word
 *    error (Artificial Analysis), ~$0.0003 per utterance, webm accepted
 *  · TTS `x-ai/grok-voice-tts-1.0`, voice `rex` (a deep male voice):
 *    0.4–0.6 s to the first byte, streamed mp3, 20+ languages incl.
 *    Arabic, $15 per 1M characters (~$0.004 for a 290-character reply).
 *    ElevenLabs Flash was as fast at $40; Fish Drama-3's $10 ends on
 *    2026-11-30 ($50 after); Gemini 3.8 Flash Lite is a little cheaper
 *    but 1.3–2.2 s, not streamed and PCM only.
 *    Each has one provider on OpenRouter: no routing to choose.
 */

export const DEFAULT_STT_MODEL_ID = "mistralai/voxtral-mini-transcribe-3-0";
export const DEFAULT_TTS_MODEL_ID = "x-ai/grok-voice-tts-1.0";
/** a deep, calm male voice (Grok's voices: rex, leo, sal are male; eve, ara female) */
export const DEFAULT_TTS_VOICE = "rex";

export const sttModelId = () => process.env.STT_MODEL_ID?.trim() || DEFAULT_STT_MODEL_ID;
export const ttsModelId = () => process.env.TTS_MODEL_ID?.trim() || DEFAULT_TTS_MODEL_ID;
export const ttsVoice = () => process.env.TTS_VOICE?.trim() || DEFAULT_TTS_VOICE;

/** a held key shouldn't become a 25 MB upload */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** what is tried when the configured model fails: the one that served the site before (2026-09 to 2026-11) */
export const FALLBACK_STT_MODEL_ID = "openai/gpt-4o-mini-transcribe";

/**
 * The configured model first and, if it fails for any reason but a rate
 * limit, the fallback once. Every failure is logged with the provider's
 * own words (CopilotKit turns any error that mentions "auth" or "401"
 * into a bare "Authentication failed", which hides the cause). The last
 * error keeps the provider's wording ("429", "auth"…) so CopilotKit's
 * transcribe handler maps it to the right status for the browser.
 */
export class OpenRouterTranscriptionService extends TranscriptionService {
  async transcribeFile({ audioFile, mimeType }: TranscribeFileOptions): Promise<string> {
    if (audioFile.size > MAX_AUDIO_BYTES) throw new Error("Recording too long (duration limit).");
    if (audioFile.size < 800) return "";
    const data = Buffer.from(await audioFile.arrayBuffer()).toString("base64");
    const format = audioFormat(mimeType ?? audioFile.type);
    const models = [...new Set([sttModelId(), FALLBACK_STT_MODEL_ID])];
    let last: Error | null = null;
    for (const model of models) {
      const res = await fetch(`${OPENROUTER_URL}/audio/transcriptions`, {
        method: "POST",
        headers: { ...openRouterHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ model, input_audio: { data, format } }),
        signal: AbortSignal.timeout(20_000),
      }).catch((err: unknown) => err as Error);
      if (res instanceof Response && res.ok) {
        const body = (await res.json()) as { text?: unknown };
        return typeof body.text === "string" ? body.text.trim() : "";
      }
      const detail = res instanceof Response ? `${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}` : String(res);
      console.error(`[stt] ${model} failed (${format}, ${audioFile.size} B) — ${detail}`);
      last = new Error(`OpenRouter STT ${detail}`);
      if (res instanceof Response && res.status === 429) break;
    }
    throw last ?? new Error("OpenRouter STT failed");
  }
}

/** the provider's response, body still streaming — the caller pipes it on. His name is respelled so the voice says it right. */
export function synthesizeSpeech(text: string, signal?: AbortSignal) {
  return fetch(`${OPENROUTER_URL}/audio/speech`, {
    method: "POST",
    headers: { ...openRouterHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ model: ttsModelId(), voice: ttsVoice(), input: pronounce(text, player.firstName, player.pronounced), response_format: "mp3" }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  });
}
