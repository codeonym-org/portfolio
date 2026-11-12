/**
 * ── LIVE REPOSITORY DATA · pure pieces ────────────────────────
 * What GitHub says about a project right now, and how it is put
 * into words. Dependency-free (unit-tested with `node --test`).
 */

export interface RepoLive {
  /** owner/name */
  repo: string;
  url: string;
  /** ISO date of the last push */
  pushedAt: string;
  release?: { tag: string; publishedAt: string; url: string };
  /** newest first, first line of each message */
  commits: { message: string; date: string }[];
  openIssues: number;
  license?: string;
  language?: string;
}

/** "owner/name" of a GitHub repository link, if the owner is one we may read */
export function repoOf(link: string | undefined, owners: readonly string[]): string | null {
  const m = link?.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/);
  return m && owners.includes(m[1]) ? `${m[1]}/${m[2]}` : null;
}

/** "today", "3 days ago", "2 months ago" — whole units, never a guess finer than a day */
export function ago(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "recently";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  const months = Math.floor(days / 30.4);
  if (months < 24) return `${months} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** the facts in a few lines, for the agent and for people who read text */
export function describe(live: RepoLive, now: Date): string {
  return [
    `Live from GitHub (${live.repo}), read ${now.toISOString().slice(0, 10)}:`,
    live.release ? `- Latest release: ${live.release.tag}, published ${ago(live.release.publishedAt, now)} (${live.release.publishedAt.slice(0, 10)}).` : "- No release published yet.",
    `- Last push: ${ago(live.pushedAt, now)} (${live.pushedAt.slice(0, 10)}).`,
    ...(live.commits.length ? [`- Latest commits: ${live.commits.map((c) => `"${c.message}" (${c.date.slice(0, 10)})`).join("; ")}.`] : []),
    `- Open issues and pull requests: ${live.openIssues}.`,
    ...(live.license ? [`- Licence: ${live.license}.`] : []),
    ...(live.language ? [`- Main language: ${live.language}.`] : []),
  ].join("\n");
}
