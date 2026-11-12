# GH-68 — the stage makes room: what was built (by the agent, 2026-11-12)

Decisions: story decision 003. Nothing further was decided in the ticket pass except the numbers below.

## What was built

- **Answers in the System font.** `.oracle` in `globals.css`: Rajdhani 500, bold 700, slightly smaller than the
  serif was (the sans reads larger).
- **The console reports its height.** `console.tsx` watches its own box (ResizeObserver) and writes
  `view.clear` (px from the bottom) and the CSS variable `--console-clear`. It is 0 while a window is open.
- **The rig frames the Monolith above the words** (`rig.tsx`): free area = height − 76 px top bar − `view.clear`.
  The camera pulls back until the Monolith is at most 80 % of the free area (limit 1.55×) and the view offset
  lifts the scene so the Monolith's middle is the middle of the free area.
- **Scrim** `.console-scrim`: a gradient to the void behind the words, `--console-clear` + 90 px high.
- **The visitor's camera** (`view.zoom`, `view.tilt`, `resetCamera`): vertical drag tilts (−0.3 to 0.95 rad),
  wheel and two-finger pinch zoom (0.62× to 1.7×), double click resets. A new answer returns a close-up to 1×.

## Checked (headless Chromium, production build, offline brain)

1920×920, 1440×900 and 390×844: idle, an answer, and an offer prompt over an answer. The answer never prints
over the Monolith; the prompt has its window; the answer's computed font is Rajdhani. Desktop: wheel zoom plus a
diagonal drag changes the view; double click returns it.

## Not checked

Pinch on a real phone, Safari, Firefox. The pull-back number `BODY_SPAN` was measured on one screenshot, not
derived from the model's bounds.
