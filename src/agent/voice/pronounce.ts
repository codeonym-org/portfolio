/**
 * The voice reads "Ayoub" wrongly. Every text sent to the TTS model has the
 * name respelled the way the owner says it; the screen keeps the real name.
 * Pure, so it is tested without the server.
 */
export function pronounce(text: string, name: string, spoken: string): string {
  if (!name || !spoken) return text;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), spoken);
}
