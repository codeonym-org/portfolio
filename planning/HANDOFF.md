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
| #43 | Story 3: live GitHub data + a map (#53, #54) | done, merged into `40-gates` (#55, #56) |
| #44 | Story 4: The Deep (rank S gate) | drafted only |
| #39 | PR: the living record → `main` | draft; superseded by the epic branch, do not merge alone |

What exists on `40-gates`: guilds as entries; ten projects (two OpenSNZ, eight personal, by guild); new CV and
the phone number as a contact channel; the gate registry (`src/config/gates.config.ts`), the catalog `/gates`,
`/gates/the-surface` (same as `/`), `/gates/the-deep` (sealed screen); the one-minute brief (`open_brief`); live GitHub data
(`github_live`, `/api/github/<project id>`, optional `GITHUB_TOKEN`); the map card (`show_map`).

## Waiting for the owner (nothing blocks the work)

1. Review the eight project texts and three proposed start dates: jira-time-tracker and design-skills "since
   2026/09", flow-reel "since 2026/11" (story GH-41, ticket GH-45, decision 001).
2. The gate names "The Surface" and "The Deep", and whether the brief answers "too minimal" for the rank C gate
   (story GH-42, decision 001).
3. The phone number is public once the epic reaches `main` (story GH-41, decision 008).
4. Optional: add a read-only `GITHUB_TOKEN` on Vercel if GitHub rate limits ever show (story GH-43, decision 001).
5. Not checked by the agent anywhere: voice (hold V), real phones, Safari, Firefox.

## Next: story GH-44, The Deep (nothing built, nothing decided yet)

Stories 1–3 are done and merged into `40-gates`. GH-44 is the only story left; its folder
(`stories/GH-44-deep-s-tier-gate/`) holds only the short draft. No branch exists for it and no code was written.

The owner's brief: "fully functional gameplay with extended 3d elems and gamified experience with reward
models". It must build on the shared progress (epic decision 006), share the record and the agent (004), and
not slow The Surface.

**A design the last agent was about to record (a proposal, not a decision — write it as story decision 001 if
you keep it, or replace it):**

- **A dive.** Side view of the iceberg's underwater mass. The visitor steers a light downward (WASD / arrows, or
  hold the pointer or a finger where to go). The camera follows.
- **Relics.** The record's entries float in the dark: the top job skills as small motes, the eight personal
  projects as crystals grouped by guild, the two OpenSNZ rank S entries at the bottom. Coming close collects one:
  a toast, XP, and its entry in a codex panel (text from `src/config`, link to the repository).
- **Three layers with gates between them:** the Shallows (skills), the Guild Reefs (codeonym-oss, codeonym-org),
  the Abyss (OpenSNZ work and "the Heart"). A gate opens after enough relics of the layer above.
- **A light meter** that drains with depth and refills on each relic; empty sends the visitor back to the last
  gate (no hard failure).
- **Rewards:** a visitor rank E → S from the relic count, shown in the HUD with a rank-up toast; reaching the
  Heart gives a title and a downloadable "hunter card" image, then the contact card.
- **Build notes:** its own route chunk (`/gates/the-deep`), its own R3F canvas; reuse `public/models/record/
  shards.glb` geometries (`useGLTF`, see `constellation.tsx`), `Toasts`, `play()` sounds, `levelFor`. Add the
  found relics to the persisted part of `world-store.ts` (storage key `codeonym-record-v9`; check `partialize`
  and `resetProgress`). Then set `state: "open"` for `the-deep` in `gates.config.ts` and return the new
  component from `src/app/gates/[gate]/page.tsx` (today every open gate renders `SurfaceGate`).
- **Known gap to plan as a ticket:** the agent inside The Deep (the chat stack is only mounted by the Surface's
  `Shell`).

Suggested tickets: (1) the dive scene, controls and relic collection; (2) layers, gates and the light meter;
(3) rewards: rank, codex, hunter card, the Heart; (4) the System in The Deep; then open the gate.

After GH-44: the epic is complete. Tell the owner; the owner merges `40-gates` into `main` (decision 008).
Pull request #39 can then be closed as superseded.
