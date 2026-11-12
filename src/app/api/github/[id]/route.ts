import { clientIp, limited, reject } from "@/agent/server/rate-limit";
import { liveRepos, repoLive } from "@/github/live";

/** live facts about one project's repository — read-only, cached, only for projects in the record */
export const runtime = "nodejs";

const BUDGET = 60;
const WINDOW_MS = 5 * 60_000;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!liveRepos[id]) return reject(404, "No repository on record for this project.");
  if (limited(`gh:${clientIp(request)}`, BUDGET, WINDOW_MS)) return reject(429, "Too many requests. Try again in a few minutes.");
  const live = await repoLive(id);
  if (!live) return reject(502, "GitHub did not answer. The record still holds.");
  return Response.json(live, { headers: { "cache-control": "public, max-age=300, s-maxage=600" } });
}
