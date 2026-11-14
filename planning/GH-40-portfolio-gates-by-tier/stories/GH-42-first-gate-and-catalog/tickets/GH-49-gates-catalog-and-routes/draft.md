# The gates catalog, gate routes and the sealed gate screen

## Problem

The site has one page and no notion of a gate. There is nowhere to see which gates exist or to enter one.

## Change

- A gate registry (`src/config/gates.config.ts`) with two gates: **The Surface** (rank C, open) and **The Deep**
  (rank S, sealed).
- `/gates`: the catalog, laid out like a console library, server-rendered, no WebGL.
- `/gates/<gate-name>`: an open gate renders the gate; a sealed gate renders a sealed screen; an unknown name is
  a 404. `/` renders the default gate.
- Ways in: a "Gates" button in the top bar, a ⌘K palette entry, an agent command `open_gates`, links on `/record`
  and in `/llms.txt`.

Rests on epic decisions 002–004 and story decision 001.

## Out of scope

The brief (next ticket); building The Deep (story GH-44).

## Done when

- `/` and `/gates/the-surface` show the same gate; `/gates` lists both gates; `/gates/the-deep` shows the sealed
  screen; `/gates/nothing` is a 404.
- The catalog page loads no three.js chunk.
- From the gate, the top bar, the palette and the agent each reach the catalog.
- Lint, type check, tests and build pass.
