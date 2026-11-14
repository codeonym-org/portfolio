# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** `src/config/gates.config.ts` (+ `Gate` type), `src/components/gates/{surface-gate,gate-catalog,gate-art}.tsx`,
`src/app/gates/page.tsx`, `src/app/gates/[gate]/page.tsx`. **Changed:** `src/app/page.tsx` (renders the default
gate), top bar ("gates" button), palette entry, agent command `open_gates`, `/record` nav, `/llms.txt` (gates
listed), `globals.css` (one keyframe).

**Decisions taken while building (by the agent):**

- The catalog selects a gate on hover, focus or arrow/tab; a click opens it. The selected gate's cover fills the
  background. A dashed card says "More gates will open here".
- Covers are one SVG iceberg cut at the waterline (`gate-art.tsx`): the tip for The Surface, the mass for The
  Deep. No image files.
- Links from the catalog to a gate do **not** prefetch: with prefetch the catalog downloaded the gate's three.js
  code (2.8 MB uncompressed); without it 0.9 MB and no three.js.
- `open_gates` leaves the page after 600 ms so the agent's last line is seen.
- `/gates/[gate]` is statically generated; unknown names are a 404 (`dynamicParams = false`).

**Checked:** `/` 200, `/gates` 200, `/gates/the-surface` 200, `/gates/the-deep` 200 (sealed screen),
`/gates/nothing` 404; screenshots of the catalog on desktop and phone and of the sealed screen; lint,
`tsc --noEmit`, 43 tests, build.

**Not checked:** the `open_gates` command through the live agent; keyboard-only use of the catalog.
