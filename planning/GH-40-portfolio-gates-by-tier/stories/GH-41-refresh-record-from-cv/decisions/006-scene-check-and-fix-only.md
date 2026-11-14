# 006: The scene is checked with ten projects and only what is broken is fixed

**Date:** 2026-11-12 (grilling, Q6; agreed: chose "Check and fix only (Recommended)")

**Question:** the scene was laid out with six projects. Does this story adapt it to ten, given that the next story
redesigns the page as the first gate?

**Decision:** **one ticket runs the page with ten projects and fixes only what is broken or unreadable**:
overlapping shards or labels, and an "ARISE all" that runs too long. No new visuals and no new layout.

- **Why:** the next story redesigns the page; work on a new layout now may be thrown away. The live site must not
  look worse in between.
- **Not chosen:** data only (crowding accepted until the first gate); a new layout now, for example by guild.
- **Facts on 2026-11-12:** every count is computed from the project list (`quests.length` in `nodes.ts`,
  `world-store.ts`, `system-commands.ts`, `sector-panels.tsx`), so nothing breaks with ten. Unknown until run: ten
  shards on one ring (`ring(quests.length, radius 4.85)`), ten bound orbits (`boundOrbit(index)`), and "ARISE all"
  at `ARISE_MS` 2600 ms each (about 26 s for ten).
