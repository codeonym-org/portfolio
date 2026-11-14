# HANDOFF — the portfolio "Gates" epic (last updated 2026-11-14, by the agent)

Read this first, then `planning/GH-40-portfolio-gates-by-tier/` (decisions, drafts, `impl.md` per ticket,
`history/CHANGES.md` per level).

## How to work here

- **Epic decision 009:** the owner told the agent to work alone: grill yourself, take the recommended option,
  record each decision in the level's `decisions/` marked "taken by the agent", and log changes in `planning/`.
  All actions are approved, including branches, commits, pushes, pull requests and merges **into the epic
  branch**.
- **Epic decision 008:** nothing reaches `main` until the epic is complete. The epic branch is **`40-gates`**.
  Ticket branches start from it (`<issue>-short-name`), their pull requests target it and are squash-merged.
  `Fixes #n` does not close issues there: close each issue by hand with a comment naming the pull request.
  **Never push to `main`, never merge the epic into `main`: the owner does that.**
- **Never add Claude attribution** to commits or pull requests. Secrets are in `.env.local` (key names only).
- Tracker: GitHub `codeonym-org/portfolio`, board 1 (sub-issues are added to the board automatically; set the
  status with `gh project item-edit 1 --owner codeonym-org --url <issue> --field Status --value Todo`). Every
  issue: a type, one `area: …` label, milestone `v9 — Next`.
- Before pushing: `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `NEXT_DIST_DIR=.next-verify pnpm build` (never
  build into `.next` while the owner's `next dev` runs: it leaves the dev server with a stale stylesheet; then
  `git checkout tsconfig.json`, the build rewrites it). To look at the page headlessly:
  `.claude/skills/verify/SKILL.md`.

## State

| Issue | What | State |
|---|---|---|
| #40 | Epic: Gates | open |
| #41 | Story 1: refresh the record (#45, #46) | done, merged into `40-gates` (#47, #48) |
| #42 | Story 2: first gate + catalog (#49, #50) | done, merged into `40-gates` (#51, #52) |
| #43 | Story 3: live GitHub data + a map (#53, #54) | done, merged into `40-gates` (#55, #56) |
| #57 | Story 4: the Gate Realm and a System with presence (#58–#63, #68, #72, #74) | done, merged into `40-gates` (#64–#67, #69–#71) |
| #44 | Story 5: The Deep (Erebus) | dropped by the owner on 2026-11-13; the work is kept on the remote branch `backup/erebus-world` (never delete it). Closing #44 is the owner's call |
| #83 | Story 6: the System speaks as the owner, no Solo Leveling persona (#84–#88) | done, merged into `40-gates` (#89–#94) |
| #39 | PR: the living record → `main` | draft; superseded by the epic branch, do not merge alone |

What exists on `40-gates`: guilds as entries; ten projects (two OpenSNZ, eight personal, by guild); new CV and
the phone number as a contact channel; the gate registry (`src/config/gates.config.ts`), the catalog `/gates`,
`/gates/the-surface` (same as `/`), `/gates/the-deep` (sealed screen); the one-minute brief (`open_brief`); live GitHub data
(`github_live`, `/api/github/<project id>`, optional `GITHUB_TOKEN`); the map card (`show_map`).

## Rules learned in story GH-57

- Do not stop or restart the owner's dev server (port 3001). Ask the owner to restart `pnpm dev` if styles look
  stale. Run your own check server on another port from `.next-verify`.
- Lint rule `react-hooks/immutability`: do not write to values a hook returns (for example
  `gl.domElement.style`); put the style on `<Canvas>`. Do not run prettier.
- The model may make an offer only every 45 s, and offer kinds are `quest`, `skill`, `item`.

## Waiting for the owner (nothing blocks the work)

1. Review the eight project texts and three proposed start dates: jira-time-tracker and design-skills "since
   2026/09", flow-reel "since 2026/11" (story GH-41, ticket GH-45, decision 001).
2. The gate names "The Surface" and "The Deep", and whether the brief answers "too minimal" for the rank C gate
   (story GH-42, decision 001).
3. The phone number is public once the epic reaches `main` (story GH-41, decision 008).
4. Optional: add a read-only `GITHUB_TOKEN` on Vercel if GitHub rate limits ever show (story GH-43, decision 001).
5. Not checked by the agent anywhere: voice with a real microphone (hold V), real phones, pinch gestures,
   Safari, Firefox.
6. The hologram draws Morocco with the Sahara as one outline (`scripts/assets/holo-map.mjs`).
7. Story GH-83: the stock voice for the replica (GH-87 follow-up); whether to close #44; a new export of
   `public/cv.pdf` if it still names the project "Multi-Agent Pharmaceutical Catalog System" (now AiCA).

## Done: story GH-57. Next: GH-44

**GH-57 "The Gate Realm and a System with presence"** was asked for by the owner on 2026-11-12 and went
**before** The Deep (epic decision 010). Its design is in
`stories/GH-57-gate-realm-and-system-presence/decisions/` (001–003); each ticket has an `impl.md` that says
what was built, what was checked and what was not.

| Ticket | What | State |
|---|---|---|
| #58 | The Gate Realm: `/gates` as seven planets; gates renamed First Light and Erebus | done, merged into `40-gates` |
| #59 | The System font (Rajdhani) and the System window: notices and prompts | done, merged into `40-gates` |
| #60 | The System persuades: one next step per answer, the `offer` tool | done, merged into `40-gates` |
| #61 | The index as a wheel from the left edge (hover the edge, hold Q, tap the tab) | done, merged into `40-gates` (#67) |
| #68 | From the owner's review (decision 003): answers in the System font; the camera frames the Monolith above the words; free camera | done, merged into `40-gates` (#69) |
| #62 | A pulse on screen while the voice is live (an ECG trace and a bpm readout) | done, merged into `40-gates` (#70) |
| #63 | A holographic map: globe to city, data shipped with the site | done, merged into `40-gates` (#71) |
| #72 | From the owner's review (decision 004): the System decides when to propose an action, never the same twice; "Ayoub" and "Stranger" | done, merged into `40-gates` |
| #74 | From the owner's review: a long answer scrolls; a proposal window waits until the reply is finished | done, merged into `40-gates` |

What this story added on `40-gates`: `/gates` as seven planets; the System font and window; the `offer` tool;
the index wheel; a camera the visitor can move; the voice pulse; the holographic map (`open_map`,
`public/data/holo-map.json`, built by `scripts/assets/holo-map.mjs`, see `scripts/assets/README.md`).

Open for the owner from this story (nothing blocks): the names "First Light" and "Erebus" (one file,
`src/config/gates.config.ts`); the word "Stranger" for the visitor (`world.agent.visitor`);
whether to use a stronger `MODEL_ID` (the model sometimes ignores the proposal rules, see GH-72 `impl.md`).

## Last: story GH-83, the System speaks as the owner

Asked for by the owner on 2026-11-13, after dropping The Deep. Its design is in
`stories/GH-83-system-speaks-as-the-owner/decisions/` (001–008); each ticket records its own pass in
`decisions/`.

| Ticket | What | State |
|---|---|---|
| #84 | Plain names for the record, the organisations and the stranger | done (#89) |
| #85 | Projects lit on load; no arise, XP, levels or quests | done (#90) |
| #86 | The interview file: his answers to common HR questions (`interview.config.ts`) | done (#91, then the owner's interview session in #94) |
| #87 | The agent answers as his AI replica, in the first person, and hands open or binding questions to him | done (#92) |
| #88 | The chosen project on display: an aura and a projected card in the sky, marked in the Projects window | done (#93) |

Rules from this story: the agent speaks as Ayoub in the first person and its first reply discloses it is his AI
replica; it gives binding answers on file (start date, contract) as information but never settles them; salary
has no answer and, like any question with no answer, gets "I'd rather answer that myself." plus the contact card. The theme (gates, ranks, the System, the dark sky) stays.

Next: nothing is planned. When the owner is done with the open points, the epic is complete; the owner merges
`40-gates` into `main` (decision 008) and closes pull request #39 as superseded.
