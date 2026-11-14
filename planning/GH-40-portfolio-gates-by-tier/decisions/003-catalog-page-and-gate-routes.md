# 003: The catalog is the page `/gates`; each gate is a page under it

**Date:** 2026-11-12 (grilling, Q3; agreed: "ok, each gate is a realm / page !! under the gates page!")

**Question:** where does the catalog live, and when is it built?

**Decision:** **the catalog is its own page, `/gates`, built with the first gate; each gate is a page under it,
`/gates/<gate-name>`.** Every gate has a "Gates" entrance to the catalog. A gate is shown as a card: name, rank,
cover image, one line, and how heavy it is. Gates not built yet appear as sealed cards.

- **Why:** sealed cards make the gates idea visible with a single playable gate; a real page keeps the catalog out
  of every gate's bundle and gives each gate an address to share.
- **Not chosen:** an overlay inside each gate (every gate carries the catalog; nothing to link to); waiting for the
  second gate (the concept stays invisible).
- **With 002:** `/` still opens the default gate with no choice to make. Whether `/` renders that gate or redirects
  to its `/gates/<gate-name>` address is left to the ticket that builds the routes.
