# HANDOFF — the portfolio "Gates" epic (last updated 2026-11-12, by the agent)

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
- Before pushing: `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm build`. To look at the page headlessly:
  `.claude/skills/verify/SKILL.md`.

## State

| Issue | What | State |
|---|---|---|
| #40 | Epic: Gates | open |
| #41 | Story 1: refresh the record (#45, #46) | done, merged into `40-gates` (#47, #48) |
| #42 | Story 2: first gate + catalog (#49, #50) | done, merged into `40-gates` (#51, #52) |
| #43 | Story 3: live GitHub data + a map | see `stories/GH-43-…/history/CHANGES.md` |
| #44 | Story 4: The Deep (rank S gate) | drafted only |
| #39 | PR: the living record → `main` | draft; superseded by the epic branch, do not merge alone |

What exists on `40-gates`: guilds as entries; ten projects (two OpenSNZ, eight personal, by guild); new CV and
the phone number as a contact channel; the gate registry (`src/config/gates.config.ts`), the catalog `/gates`,
`/gates/the-surface` (same as `/`), `/gates/the-deep` (sealed screen); the one-minute brief (`open_brief`).

## Waiting for the owner (nothing blocks the work)

1. Review the eight project texts and three proposed start dates: jira-time-tracker and design-skills "since
   2026/09", flow-reel "since 2026/11" (story GH-41, ticket GH-45, decision 001).
2. The gate names "The Surface" and "The Deep", and whether the brief answers "too minimal" for the rank C gate
   (story GH-42, decision 001).
3. The phone number is public once the epic reaches `main` (story GH-41, decision 008).
4. Not checked by the agent anywhere: voice (hold V), real phones, Safari, Firefox.

## Next

Story GH-43 (live data), then GH-44 (The Deep). For The Deep, the owner's brief: "fully functional gameplay with
extended 3d elems and gamified experience with reward models"; it must build on the shared progress (epic
decision 006) and must not slow The Surface. When it opens, set its `state` to `open` in `gates.config.ts` and
give `/gates/[gate]/page.tsx` its component.
