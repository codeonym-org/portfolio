/**
 * ── TIME BETWEEN TWO PLACES ───────────────────────────────────
 * The Player's local time and how far it is from the visitor's,
 * from the browser's own clock: no geolocation, no request.
 * Dependency-free (unit-tested with `node --test`).
 */

/** minutes east of UTC for an IANA time zone at a given instant */
export function offsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  // the parts stop at the minute, so compare against the same minute
  return Math.round((local - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** "14:05" in the given time zone */
export function clockIn(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

/** how his clock compares with the visitor's, in words */
export function difference(hisOffset: number, visitorOffset: number): string {
  const minutes = hisOffset - visitorOffset;
  if (minutes === 0) return "the same time as you";
  const hours = Math.abs(minutes) / 60;
  const amount = Number.isInteger(hours) ? `${hours} hour${hours === 1 ? "" : "s"}` : `${Math.floor(hours)} h ${Math.abs(minutes) % 60} min`;
  return `${amount} ${minutes > 0 ? "ahead of" : "behind"} you`;
}
