import "server-only";
import { guilds } from "@/config/guilds.config";
import { quests } from "@/config/quests.config";
import { repoOf, type RepoLive } from "./format";

/**
 * ── LIVE REPOSITORY DATA ──────────────────────────────────────
 * Reads public facts about a project's repository from GitHub's REST
 * API. Rules (epic decision 007, story GH-43 decision 001):
 *  · read-only, public data, GET only;
 *  · only repositories the record already links to — a caller names a
 *    project id, never a repository;
 *  · the token (optional, GITHUB_TOKEN) never leaves the server;
 *  · every answer is cached for ten minutes, so a busy page costs
 *    GitHub three requests per project per ten minutes at most;
 *  · any failure returns null and the caller falls back to the record.
 */

const OWNERS = guilds.flatMap((g) => g.link?.match(/github\.com\/([\w.-]+)\/?$/)?.[1] ?? []);
const REVALIDATE_S = 600;

/** project id → owner/name, for every project whose link is a repository of one of Ayoub's guilds */
export const liveRepos: Record<string, string> = Object.fromEntries(quests.flatMap((q) => {
  const repo = repoOf(q.link, OWNERS);
  return repo ? [[q.id, repo]] : [];
}));

async function gh<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "portfolio-record",
        "x-github-api-version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: REVALIDATE_S },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

interface GhRepo {
  html_url: string;
  pushed_at: string;
  open_issues_count: number;
  language: string | null;
  license: { spdx_id: string | null } | null;
}
interface GhRelease {
  tag_name: string;
  published_at: string;
  html_url: string;
}
interface GhCommit {
  commit: { message: string; committer: { date: string } | null };
}

export async function repoLive(projectId: string): Promise<RepoLive | null> {
  const repo = liveRepos[projectId];
  if (!repo) return null;
  const [info, release, commits] = await Promise.all([gh<GhRepo>(`/repos/${repo}`), gh<GhRelease>(`/repos/${repo}/releases/latest`), gh<GhCommit[]>(`/repos/${repo}/commits?per_page=3`)]);
  if (!info) return null;
  const licence = info.license?.spdx_id;
  return {
    repo,
    url: info.html_url,
    pushedAt: info.pushed_at,
    release: release ? { tag: release.tag_name, publishedAt: release.published_at, url: release.html_url } : undefined,
    commits: (commits ?? []).map((c) => ({ message: c.commit.message.split("\n")[0].slice(0, 100), date: c.commit.committer?.date ?? info.pushed_at })),
    openIssues: info.open_issues_count,
    license: licence && licence !== "NOASSERTION" ? licence : undefined,
    language: info.language ?? undefined,
  };
}
