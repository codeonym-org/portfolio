import assert from "node:assert/strict";
import { test } from "node:test";
import { ago, describe, repoOf, type RepoLive } from "./format.ts";

const now = new Date("2026-11-12T12:00:00Z");

test("only repositories of the allowed owners are read", () => {
  assert.equal(repoOf("https://github.com/codeonym-oss/mediary", ["codeonym-oss"]), "codeonym-oss/mediary");
  assert.equal(repoOf("https://github.com/someone/else", ["codeonym-oss"]), null);
  assert.equal(repoOf("https://github.com/codeonym-oss", ["codeonym-oss"]), null);
  assert.equal(repoOf("https://evil.dev/codeonym-oss/mediary", ["codeonym-oss"]), null);
  assert.equal(repoOf(undefined, ["codeonym-oss"]), null);
});

test("dates are told in whole days and months", () => {
  assert.equal(ago("2026-11-12T08:00:00Z", now), "today");
  assert.equal(ago("2026-11-11T08:00:00Z", now), "yesterday");
  assert.equal(ago("2026-11-02T12:00:00Z", now), "10 days ago");
  assert.equal(ago("2026-07-12T12:00:00Z", now), "4 months ago");
  assert.equal(ago("not a date", now), "recently");
});

test("a repository is described with its release, or says there is none", () => {
  const live: RepoLive = { repo: "codeonym-oss/mediary", url: "https://github.com/codeonym-oss/mediary", pushedAt: "2026-11-10T10:00:00Z", commits: [{ message: "fix: retry", date: "2026-11-10T10:00:00Z" }], openIssues: 2, license: "MIT" };
  assert.match(describe(live, now), /No release published yet/);
  assert.match(describe({ ...live, release: { tag: "v0.4.0", publishedAt: "2026-11-01T00:00:00Z", url: "" } }, now), /Latest release: v0\.4\.0, published 11 days ago/);
  assert.match(describe(live, now), /"fix: retry" \(2026-11-10\)/);
});
