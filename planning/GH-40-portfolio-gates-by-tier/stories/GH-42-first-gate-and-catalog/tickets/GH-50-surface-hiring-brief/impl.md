# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** `src/components/interface/brief-panel.tsx`. **Changed:** `world-store.ts` (`brief` flag, `openBrief`,
closed by `closeFocus`, `openSector`, `setCase`), `window.tsx` (the brief is a third kind of window, beside a
sector and a case), `console.tsx` (a highlighted "One-minute brief" button before the suggestions),
`palette.tsx`, `system-commands.ts` (`open_brief`), `system-snapshot.ts` (`briefOpen`), `server/agent.ts`
(when to call it), `local-brain.ts` (+ test: "short version", "summary" open it offline), `world.config.ts`
(button label; a visitor quest "Read the Brief", +100 XP), and the five places that ask "is a window open".

**Decisions taken while building (by the agent):**

- The brief is a window like the others, not a seventh sector: no new ring of shards, no change to the scene.
- Content, in order: first profile paragraph; four facts (now, base, degree, focus); contact channels with CV
  download first, because a hiring team's next step is to reach him; the three guilds with role and project
  count; all ten projects by rank, one sentence each; the ten highest-graded job skills.
- Every project and skill opens its inspect card; a guild opens the Projects window.
- Opening the brief completes a new visitor quest, so the progress (epic decision 006) counts it.

**Checked:** desktop 1440×900 and phone 390×844: one click opens it, no horizontal scroll, a project row opens
its entry, no page errors. Live agent: "I have one minute. Give me the short version." → `open_brief`;
"Show me the other gates" → `open_gates` (the page went to `/gates`). Lint, `tsc --noEmit`, 44 tests, build.

**Not checked:** voice; real phones; the owner's view on whether this answers "too minimal".
