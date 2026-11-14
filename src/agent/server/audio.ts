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
 * Defaults, measured on OpenRouter (2026-09):
 *  · STT `openai/gpt-4o-mini-transcribe` — a steady 0.7–0.9 s for a
 *    short clip, ~$0.0001 per utterance, strong on English, French and
 *    Arabic. (Parakeet / Voxtral are a hair faster but have no Arabic;
 *    Whisper bills a 10 s minimum; qwen3-asr swung from 0.5 s to 25 s.)
 *  · TTS `mistralai/voxtral-mini-tts-2603` — ~1 s to the first byte
 *    (Kokoro took 5–6 s), mp3 output, English + French voices
 */

export const DEFAULT_STT_MODEL_ID = "openai/gpt-4o-mini-transcribe";
export const DEFAULT_TTS_MODEL_ID = "mistralai/voxtral-mini-tts-2603";
/** a calm, confident British male — the System, not a butler */
export const DEFAULT_TTS_VOICE = "gb_oliver_confident";

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
