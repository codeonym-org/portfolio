# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** `scripts/assets/world-map.mjs` → `src/record/world-map.ts` (36 kB path, Natural Earth 1:110m land,
public domain, credited in the contact window); `src/record/time.ts` (+ tests: offset of a time zone, 24-hour
clock, the difference in words); `src/components/interface/map-card.tsx`.
**Changed:** `player.base` (city, country, coordinates, `Africa/Casablanca`) in the config and its type; the card
type `map`; the frontend tool `show_map`; the agent prompt; the offline index ("where is he based", "what
time") with a test; the contact window, which now ends with the map.

**Decisions taken while building (by the agent):**

- The caption (city, his time, the difference) sits **above** the map: under a reply the card can be cut by the
  prompt, and the caption is the information.
- The difference is computed in the browser from the visitor's clock. The agent is told it does not know the
  visitor's time zone and must not state the difference itself.
- Not added to the brief: the brief already states the base, and the contact window is one click away.

**Fixed while checking:** the difference read "5 h 59 min" — the zone's offset was compared against a time with
seconds. It now compares whole minutes; a test covers it.

**Checked:** live agent, browser clock set to New York: "Where is he based, and what time is it for him?" →
`show_map`; the card read "Oujda, Morocco · 21:35 there · 6 hours ahead of you"; no request left the site.
Lint, `tsc --noEmit`, 51 tests, build.

**Not checked:** the card on a phone; the map inside the contact window in a screenshot.
