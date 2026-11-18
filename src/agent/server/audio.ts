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
 *  · TTS `elevenlabs/eleven-flash-v2.5` — 0.4–0.7 s to the first byte
 *    (Voxtral TTS, before it: 0.5–1.4 s), mp3, multilingual incl. Arabic,
 *    ~$0.008 for a 200-character reply. Each has one provider on
 *    OpenRouter, so there is no routing to choose.
 */

export const DEFAULT_STT_MODEL_ID = "mistralai/voxtral-mini-transcribe-3-0";
export const DEFAULT_TTS_MODEL_ID = "elevenlabs/eleven-flash-v2.5";
/** ElevenLabs "George": a warm, calm British male; any ElevenLabs voice id works */
export const DEFAULT_TTS_VOICE = "JBFqnCBsd6RMkjVDRZzb";

export const sttModelId = () => process.env.STT_MODEL_ID?.trim() || DEFAULT_STT_MODEL_ID;
export const ttsModelId = () => process.env.TTS_MODEL_ID?.trim() || DEFAULT_TTS_MODEL_ID;
export const ttsVoice = () => process.env.TTS_VOICE?.trim() || DEFAULT_TTS_VOICE;

/** a held key shouldn't become a 25 MB upload */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/**
 * Errors keep the provider's wording ("429", "auth"…) — CopilotKit's
 * transcribe handler maps them to the right status for the browser.
 */
export class OpenRouterTranscriptionService extends TranscriptionService {
  async transcribeFile({ audioFile, mimeType }: TranscribeFileOptions): Promise<string> {
    if (audioFile.size > MAX_AUDIO_BYTES) throw new Error("Recording too long (duration limit).");
    if (audioFile.size < 800) return "";
    const data = Buffer.from(await audioFile.arrayBuffer()).toString("base64");
    const res = await fetch(`${OPENROUTER_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { ...openRouterHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        model: sttModelId(),
        input_audio: { data, format: audioFormat(mimeType ?? audioFile.type) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`OpenRouter STT ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { text?: unknown };
    return typeof body.text === "string" ? body.text.trim() : "";
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
