# Implementation record (written after the check, 2026-11-12, by the agent alone)

**Run:** production build, headless Chromium on the GPU, desktop 1440×900 and phone 390×844, storage cleared.

**Seen:**

- Ten project shards on the outer ring: no shard overlaps another; labels readable on desktop. On the phone the
  shard labels are hidden by design (≤640 px).
- All ten risen: the bound orbits stay clear of each other and do not hide the Monolith.
- "ARISE all" took about 30 s for ten (2.6 s per rise plus a 0.35 s gap). **Fixed:** `ARISE_MS` 2600 → 1700 and
  the gap 350 → 150 ms in both callers (`sector-panels.tsx`, `system-commands.ts`). Measured after: 18.8 s on
  desktop, 18.7 s on phone, 10/10 risen, no page errors.

**Decision (taken by the agent):** shorten every rise instead of adding a second, faster timing only for "all".
One constant, no new code; a single ARISE still reads as an event at 1.7 s. *Not chosen:* raising several
shadows at once (changes the store's one-at-a-time model just before the gate redesign).

**Left as it is (for story GH-42, the first gate):** with the Projects window open on desktop, the labels of the
two shards nearest the window ("i18n-ai", "Mediary") run under the window's edge and lose their last letters.
Readable, not broken; the gate redesign replaces this layout.

**Checked:** lint, `tsc --noEmit`, 43 tests, build.
