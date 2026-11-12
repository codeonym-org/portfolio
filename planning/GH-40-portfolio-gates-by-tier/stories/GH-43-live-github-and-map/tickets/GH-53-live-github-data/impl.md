# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** `src/github/format.ts` (pure: `repoOf`, `ago`, `describe`, + tests), `src/github/live.ts` (server
only: allow-list built from the record, three GitHub GET requests, cached 600 s, 6 s timeout, null on failure),
`src/app/api/github/[id]/route.ts` (404 for ids not in the record, 60 requests per 5 minutes per address),
`src/components/interface/live-repo.tsx` (the strip on a personal project's inspect card).
**Changed:** `src/agent/server/tools.ts` (`github_live`), `src/agent/server/agent.ts` (when to call it; it is a
second source of truth beside the dossier), `.env.example` (`GITHUB_TOKEN`, optional).

**Checked against the real GitHub API, without a token:** `/api/github/mediary` returned release v0.4.0
(2026-09-30), last push 2026-11-07, three commits, MIT, Python; `/api/github/pharma-mas` 404 (no repository on
record); `/api/github/flow-reel` 200 with no release; a path-traversal id 404. The live agent, asked "Is mediary
still maintained? What is its latest version?", called `github_live` and answered with the release and dates.
Lint, `tsc --noEmit`, 47 tests, build.

**Not checked:** the strip in a screenshot; behaviour when GitHub rate-limits (the code returns nothing).
