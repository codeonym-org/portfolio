# The Gate Realm: seven planets to choose a gate from

## Problem

`/gates` is a shelf of two cards. It does not look like a realm of gates, and it has no room for the gates to come.

## Change

`/gates` becomes a 3D star system (story decision 001, points 1–4): a star and seven planets on their orbits,
each planet with its own generated design. The two charted planets are the gates: **First Light** (rank C, the
gate `/` opens; was "The Surface") and **Erebus** (rank S, sealed; was "The Deep"). The other five are uncharted:
visible, dim, named only "Uncharted", and they open nothing. Selecting a planet flies the camera to it and shows
its details; Enter or a click opens the gate.

## Done when

- `/gates` shows a star and seven planets; no two planets look alike.
- Arrow keys, a click, a tap or a swipe select a planet; Enter or the button opens a charted gate.
- The routes are `/gates/first-light` and `/gates/erebus`; `/` still opens the rank C gate; the old names are
  gone from the page, the agent, `/record` and `/llms.txt`.
- Without WebGL the page still lists every gate with working links.
- The home page loads no extra code because of this page.
- Lint, type check, tests and build pass.
