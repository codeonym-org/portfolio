# The index as a wheel that opens from the left edge

## Problem

The index is a plain list on the left. It works, but it is the least game-like part of the interface.

## Change

The index becomes a radial wheel, like a game's weapon wheel (story decision 001, point 8). It is hidden until
the pointer reaches the left edge of the screen or the visitor holds a key; on a phone, a small tab on the left
edge opens it. The six sectors are its segments. Pointing at a segment lights that sector's ring in the sky and
shows its name and how many entries it holds; a click, or releasing the key, opens it.

## Done when

- Moving the pointer to the left edge opens the wheel; moving away closes it.
- Holding the key opens it; releasing the key opens the pointed sector.
- On a phone, the edge tab opens the wheel and a tap opens a sector.
- Keys 1–6 still open the sectors; the wheel is reachable and usable by keyboard and screen reader.
- Lint, type check, tests and build pass.
