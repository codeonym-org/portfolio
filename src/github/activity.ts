/**
 * ── MY GITHUB ACTIVITY · pure pieces ──────────────────────────
 * What the server reads about my GitHub account (`activity-live.ts`)
 * and what is worked out from it on any side: streaks, the busiest
 * day and weekday, the calendar laid out in weeks. Dependency-free
 * (unit-tested with `node --test`). Only public facts ever reach it.
 */

export interface Day {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

export interface Activity {
  login: string;
  url: string;
  /** ISO date the account was opened */
  since: string;
  /** the last year, as GitHub's calendar counts it */
  year: {
    total: number;
    commits: number;
    pullRequests: number;
    issues: number;
    reviews: number;
    /** in private repositories: counted, never named */
    private: number;
    /** repositories committed to */
    repositories: number;
  };
  lifetime: {
    total: number;
    /** oldest first */
    byYear: { year: number; total: number }[];
    mergedPullRequests: number;
    publicRepositories: number;
    stars: number;
    followers: number;
  };
  /** the calendar, oldest first, one entry per day */
  days: Day[];
  /** share of code by size across the public repositories I worked on, largest first */
  languages: { name: string; color: string; share: number }[];
  /** the public repositories I committed most to this year */
  repositories: { name: string; url: string; commits: number; language?: string; color?: string }[];
  /** ISO time of the read */
  readAt: string;
}

// ── the raw answer, as far as it is read ──

interface Lang {
  size: number;
  node: { name: string; color: string | null };
}
export interface RawUser {
  url: string;
  createdAt: string;
  followers: { totalCount: number };
  repositories: { totalCount: number; nodes: { stargazerCount: number }[] };
  pullRequests: { totalCount: number };
  repositoriesContributedTo: { nodes: { isPrivate: boolean; languages: { edges: Lang[] } }[] };
  contributionsCollection: {
    contributionYears: number[];
    totalCommitContributions: number;
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
    totalIssueContributions: number;
    restrictedContributionsCount: number;
    commitContributionsByRepository: {
      repository: { nameWithOwner: string; url: string; isPrivate: boolean; primaryLanguage: { name: string; color: string | null } | null };
      contributions: { totalCount: number };
    }[];
    contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number }[] }[] };
  };
}

const GREY = "#8b949e";

/** the answer, reduced to public facts: a private repository is never named, and its code never counted */
export function fromRaw(login: string, u: RawUser, byYear: { year: number; total: number }[], readAt: Date): Activity {
  const c = u.contributionsCollection;
  const sizes = new Map<string, { size: number; color: string }>();
  for (const repo of u.repositoriesContributedTo.nodes) {
    if (repo.isPrivate) continue;
    for (const { size, node } of repo.languages.edges) {
      const had = sizes.get(node.name);
      sizes.set(node.name, { size: (had?.size ?? 0) + size, color: node.color ?? had?.color ?? GREY });
    }
  }
  const all = [...sizes.values()].reduce((n, l) => n + l.size, 0) || 1;
  const languages = [...sizes.entries()]
    .map(([name, l]) => ({ name, color: l.color, share: l.size / all }))
    .filter((l) => l.share >= 0.001)
    .sort((a, b) => b.share - a.share)
    .slice(0, 8);
  const commitsIn = c.commitContributionsByRepository.filter((r) => r.repository && !r.repository.isPrivate);
  const years = [...byYear].sort((a, b) => a.year - b.year);
  return {
    login,
    url: u.url,
    since: u.createdAt,
    year: {
      total: c.contributionCalendar.totalContributions,
      commits: c.totalCommitContributions,
      pullRequests: c.totalPullRequestContributions,
      issues: c.totalIssueContributions,
      reviews: c.totalPullRequestReviewContributions,
      private: c.restrictedContributionsCount,
      repositories: c.commitContributionsByRepository.length,
    },
    lifetime: {
      total: years.reduce((n, y) => n + y.total, 0),
      byYear: years,
      mergedPullRequests: u.pullRequests.totalCount,
      publicRepositories: u.repositories.totalCount,
      stars: u.repositories.nodes.reduce((n, r) => n + r.stargazerCount, 0),
      followers: u.followers.totalCount,
    },
    days: c.contributionCalendar.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
    languages,
    repositories: commitsIn
      .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount)
      .slice(0, 6)
      .map((r) => ({
        name: r.repository.nameWithOwner,
        url: r.repository.url,
        commits: r.contributions.totalCount,
        language: r.repository.primaryLanguage?.name,
        color: r.repository.primaryLanguage?.color ?? undefined,
      })),
    readAt: readAt.toISOString(),
  };
}

// ── worked out from the calendar ──

export interface Streaks {
  /** days in a row up to today (or up to yesterday, when today has nothing yet) */
  current: number;
  longest: number;
  /** where the longest began and ended */
  longestFrom?: string;
  longestTo?: string;
  /** days with at least one contribution */
  active: number;
}

export function streaks(days: readonly Day[]): Streaks {
  let longest = 0;
  let run = 0;
  let from = "";
  let longestFrom: string | undefined;
  let longestTo: string | undefined;
  let active = 0;
  for (const d of days) {
    if (d.count > 0) {
      active++;
      if (run === 0) from = d.date;
      run++;
      if (run > longest) {
        longest = run;
        longestFrom = from;
        longestTo = d.date;
      }
    } else run = 0;
  }
  // today may simply not have begun: the streak still stands on yesterday
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].count > 0; i--) current++;
  return { current, longest, longestFrom, longestTo, active };
}

/** the single busiest day */
export function bestDay(days: readonly Day[]): Day | undefined {
  return days.reduce<Day | undefined>((best, d) => (d.count > (best?.count ?? 0) ? d : best), undefined);
}

const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** contributions by weekday, Monday first */
export function byWeekday(days: readonly Day[]): number[] {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) sums[(weekdayOf(d.date) + 6) % 7] += d.count;
  return sums;
}

/** the calendar in columns of weeks, Sunday on top as GitHub draws it; null pads the first week */
export function weeks(days: readonly Day[]): (Day | null)[][] {
  if (!days.length) return [];
  const out: (Day | null)[][] = [];
  let week: (Day | null)[] = Array.from({ length: weekdayOf(days[0].date) }, () => null);
  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      out.push(week);
      week = [];
    }
  }
  if (week.length) out.push(week);
  return out;
}

/** 0 for nothing, then 1–4 by quartile of the active days, so one huge day does not flatten the rest */
export function levels(days: readonly Day[]): (count: number) => 0 | 1 | 2 | 3 | 4 {
  const counts = days.map((d) => d.count).filter((n) => n > 0).sort((a, b) => a - b);
  const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(p * counts.length))] ?? 1;
  const [a, b, c] = [q(0.25), q(0.5), q(0.75)];
  return (n) => (n <= 0 ? 0 : n <= a ? 1 : n <= b ? 2 : n <= c ? 3 : 4);
}

/** the facts in a few lines, for the agent */
export function describeActivity(a: Activity): string {
  const s = streaks(a.days);
  const best = bestDay(a.days);
  const wd = byWeekday(a.days);
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const top = wd.indexOf(Math.max(...wd));
  return [
    `Live from GitHub (${a.login}), read ${a.readAt.slice(0, 10)}:`,
    `- Last 12 months: ${a.year.total} contributions (${a.year.commits} commits, ${a.year.pullRequests} pull requests, ${a.year.issues} issues, ${a.year.reviews} reviews), on ${s.active} days, in ${a.year.repositories} repositories${a.year.private ? `; ${a.year.private} of them in private repositories` : ""}.`,
    `- Since ${a.since.slice(0, 4)}: ${a.lifetime.total} contributions (${a.lifetime.byYear.map((y) => `${y.year}: ${y.total}`).join(", ")}); ${a.lifetime.mergedPullRequests} pull requests merged.`,
    `- Streaks: ${s.current} days running now, ${s.longest} at the longest${s.longestFrom ? ` (${s.longestFrom} to ${s.longestTo})` : ""}.`,
    ...(best ? [`- Busiest day: ${best.date}, ${best.count} contributions. Busiest weekday: ${names[top]}.`] : []),
    ...(a.languages.length ? [`- Languages across my public work: ${a.languages.slice(0, 5).map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(", ")}.`] : []),
    ...(a.repositories.length ? [`- Most commits this year (public): ${a.repositories.map((r) => `${r.name} (${r.commits})`).join(", ")}.`] : []),
  ].join("\n");
}
