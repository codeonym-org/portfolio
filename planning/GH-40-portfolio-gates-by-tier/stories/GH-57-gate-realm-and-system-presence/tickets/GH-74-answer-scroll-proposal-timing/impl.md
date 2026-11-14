# GH-74 — the answer scrolls, the proposal waits: what was built (by the agent, 2026-11-13)

## Causes

- **Scroll:** the answer sits in a layer that lets the pointer through to the scene (so the Monolith can be
  dragged). The wheel therefore went to the scene, which zooms since ticket 68.
- **Timing:** the model calls `propose_action` before it writes its text, and the window opened at once.

## Decisions (by the agent, epic decision 009)

- **The answer takes the pointer only when it is longer than its room.** A short answer still lets the wheel
  and the drag through to the scene. When it overflows it scrolls with the wheel, a finger (`touch-action:
  pan-y`) and the keyboard (it can take focus), and shows a thin bar.
- **Timing is fixed in the rendering, not in the instructions**: a model cannot be trusted to order its calls.
  The window waits until no reply has been running for 2.2 s (a reply is several runs: tools, then text; the
  text is then revealed at reading speed). If the visitor sends a new message first, the proposal is dropped
  and counted as ignored.

## Files

`src/components/interface/console.tsx`, `src/app/globals.css` (`.answer-scroll`),
`src/agent/system-commands.ts` (`afterTheReply`, `dropPendingProposal`), `src/agent/converse.ts`.

## Checked (headless Chromium, production build, live model)

Desktop 1440×900. The greeting does not take the pointer. A 1194-character answer (915 px in a 342 px room):
the wheel scrolls it by 240 px, the End key goes to the bottom. With the 1.6 s delay first tried, the proposal
appeared 0.26 s before the last characters were revealed; the delay is now 2.2 s (not run again after that
change). Lint, type check, 59 tests and the build pass.

## Not checked

Touch scrolling on a real phone, Safari, Firefox; that the scene's zoom stays unchanged while scrolling (the
answer is not inside the scene's element, so the event cannot reach it, but no value was read to prove it).
