import { clientIp, limited, reject } from "@/agent/server/rate-limit";
import { activityConfigured, activityLive } from "@/github/activity-live";

/** my GitHub activity: the contribution calendar, streaks, languages — read-only, public facts, cached an hour */
export const runtime = "nodejs";

const BUDGET = 30;
const WINDOW_MS = 5 * 60_000;

export async function GET(request: Request) {
  if (!activityConfigured()) return reject(503, "GitHub activity is not set up on this server.");
  if (limited(`gh-activity:${clientIp(request)}`, BUDGET, WINDOW_MS)) return reject(429, "Too many requests. Try again in a few minutes.");
  const activity = await activityLive();
  if (!activity) return reject(502, "GitHub did not answer. The record still holds.");
  return Response.json(activity, { headers: { "cache-control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } });
}
