import assert from "node:assert/strict";
import { test } from "node:test";
import { byWeekday, fromRaw, levels, streaks, weeks, type Day, type RawUser } from "./activity.ts";

const run = (start: string, counts: number[]): Day[] =>
  counts.map((count, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count };
  });

test("streaks: the longest run, and the current one standing on yesterday", () => {
  const s = streaks(run("2026-01-01", [1, 2, 0, 3, 3, 3, 3, 0, 1, 1, 0]));
  assert.equal(s.longest, 4);
  assert.equal(s.longestFrom, "2026-01-04");
  assert.equal(s.longestTo, "2026-01-07");
  assert.equal(s.current, 2);
  assert.equal(s.active, 8);
  assert.equal(streaks(run("2026-01-01", [1, 0, 0])).current, 0);
  assert.equal(streaks(run("2026-01-01", [1, 1, 1])).current, 3);
});

test("weeks start on Sunday, padded; weekdays sum Monday first", () => {
  // 2026-01-01 is a Thursday
  const days = run("2026-01-01", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const w = weeks(days);
  assert.equal(w[0].length, 7);
  assert.deepEqual(w[0].slice(0, 4), [null, null, null, null]);
  assert.equal(w[0][4]?.date, "2026-01-01");
  assert.equal(w[1][0]?.date, "2026-01-04");
  assert.deepEqual(byWeekday(days), [1, 1, 1, 2, 2, 2, 1]);
});

test("levels by quartile: nothing is 0, one huge day does not flatten the rest", () => {
  const lv = levels(run("2026-01-01", [0, 1, 2, 3, 4, 5, 6, 7, 8, 200]));
  assert.equal(lv(0), 0);
  assert.equal(lv(1), 1);
  assert.equal(lv(8), 4);
  assert.equal(lv(200), 4);
  assert.ok(lv(4) >= 2 && lv(4) <= 3);
});

test("a private repository is never named and its code never counted", () => {
  const raw: RawUser = {
    url: "https://github.com/me",
    createdAt: "2020-10-21T01:49:44Z",
    followers: { totalCount: 3 },
    repositories: { totalCount: 2, nodes: [{ stargazerCount: 2 }, { stargazerCount: 1 }] },
    pullRequests: { totalCount: 9 },
    repositoriesContributedTo: {
      nodes: [
        { isPrivate: false, languages: { edges: [{ size: 300, node: { name: "TypeScript", color: "#3178c6" } }, { size: 100, node: { name: "CSS", color: null } }] } },
        { isPrivate: true, languages: { edges: [{ size: 9000, node: { name: "Go", color: "#00ADD8" } }] } },
      ],
    },
    contributionsCollection: {
      contributionYears: [2026, 2025],
      totalCommitContributions: 10,
      totalPullRequestContributions: 2,
      totalPullRequestReviewContributions: 0,
      totalIssueContributions: 1,
      restrictedContributionsCount: 4,
      commitContributionsByRepository: [
        { repository: { nameWithOwner: "me/secret", url: "https://github.com/me/secret", isPrivate: true, primaryLanguage: null }, contributions: { totalCount: 50 } },
        { repository: { nameWithOwner: "me/open", url: "https://github.com/me/open", isPrivate: false, primaryLanguage: { name: "TypeScript", color: "#3178c6" } }, contributions: { totalCount: 5 } },
      ],
      contributionCalendar: { totalContributions: 17, weeks: [{ contributionDays: [{ date: "2026-01-01", contributionCount: 2 }] }] },
    },
  };
  const a = fromRaw("me", raw, [{ year: 2026, total: 17 }, { year: 2025, total: 3 }], new Date("2026-11-18T00:00:00Z"));
  assert.deepEqual(a.repositories.map((r) => r.name), ["me/open"]);
  assert.deepEqual(a.languages.map((l) => [l.name, l.share]), [["TypeScript", 0.75], ["CSS", 0.25]]);
  assert.equal(a.languages[1].color, "#8b949e");
  assert.equal(a.lifetime.total, 20);
  assert.deepEqual(a.lifetime.byYear.map((y) => y.year), [2025, 2026]);
  assert.equal(a.lifetime.stars, 3);
  assert.equal(JSON.stringify(a).includes("secret"), false);
});
