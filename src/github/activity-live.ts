import "server-only";
import { player } from "@/config/player.config";
import { fromRaw, type Activity, type RawUser } from "./activity";

/**
 * ── MY GITHUB ACTIVITY, LIVE ──────────────────────────────────
 * The contribution calendar and what goes with it, from GitHub's
 * GraphQL API. Rules, as for the repositories (`live.ts`):
 *  · read-only, public facts: one account (mine, from the record),
 *    never one a caller names; a private repository is counted at
 *    most, never named (`fromRaw`);
 *  · GraphQL needs a token: GITHUB_TOKEN, a fine-grained token with
 *    public read access only, which never leaves the server; without
 *    it there is no calendar and the caller says so;
 *  · one read an hour per server instance, the CDN keeps it too;
 *  · any failure returns null.
 */

const LOGIN = player.links.github.match(/github\.com\/([\w-]+)/)?.[1] ?? "";
const TTL_MS = 60 * 60_000;

const USER = `query($login: String!) {
  user(login: $login) {
    url createdAt
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100) { totalCount nodes { stargazerCount } }
    pullRequests(states: MERGED) { totalCount }
    repositoriesContributedTo(first: 100, privacy: PUBLIC, includeUserRepositories: true, contributionTypes: [COMMIT, PULL_REQUEST]) {
      nodes { isPrivate languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } }
    }
    contributionsCollection {
      contributionYears totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions totalIssueContributions restrictedContributionsCount
      commitContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner url isPrivate primaryLanguage { name color } }
        contributions { totalCount }
      }
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

/** one total per year, in one request: an alias per year */
const YEARS = (years: number[]) =>
  `query($login: String!) { user(login: $login) { ${years
    .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { contributionCalendar { totalContributions } }`)
    .join(" ")} } }`;

async function graphql<T>(query: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !LOGIN) return null;
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "user-agent": "portfolio-record" },
      body: JSON.stringify({ query, variables: { login: LOGIN } }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T; errors?: unknown };
    return body.data ?? null;
  } catch {
    return null;
  }
}

let kept: { at: number; activity: Activity } | null = null;
let reading: Promise<Activity | null> | null = null;

async function read(): Promise<Activity | null> {
  const first = await graphql<{ user: RawUser | null }>(USER);
  const user = first?.user;
  if (!user) return null;
  const years = user.contributionsCollection.contributionYears.filter((y) => Number.isInteger(y) && y > 2000 && y < 3000);
  const totals = years.length ? await graphql<{ user: Record<string, { contributionCalendar: { totalContributions: number } }> }>(YEARS(years)) : null;
  const byYear = years.map((year) => ({ year, total: totals?.user?.[`y${year}`]?.contributionCalendar.totalContributions ?? 0 }));
  return fromRaw(LOGIN, user, byYear, new Date());
}

/** true when the server can read the calendar at all */
export const activityConfigured = () => !!process.env.GITHUB_TOKEN && !!LOGIN;

export async function activityLive(): Promise<Activity | null> {
  if (kept && Date.now() - kept.at < TTL_MS) return kept.activity;
  // one read at a time, however many ask at once
  reading ??= read().finally(() => (reading = null));
  const activity = await reading;
  if (activity) kept = { at: Date.now(), activity };
  return activity ?? kept?.activity ?? null;
}
