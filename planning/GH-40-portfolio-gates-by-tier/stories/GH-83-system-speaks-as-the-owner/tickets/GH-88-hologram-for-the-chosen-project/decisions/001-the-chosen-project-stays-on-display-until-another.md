# 001: The chosen project stays on display until another is chosen or the stranger leaves the projects

**Date:** 2026-11-14 (ticket pass; taken by the agent, story decision 008)

**Questions and what was taken:**

- **Which project is "chosen":** a new store field `chosen` (a project id, not persisted). Opening a project's
  details sets it, by a click on its shard, the Details button, the brief, the palette or the agent's
  `inspect_entity`. Closing the details card keeps it, so the stranger sees the hologram once the card is gone. It
  clears when another project is chosen, or when the stranger leaves the projects: another section, the brief, a
  case, or closing the windows. Not chosen: tying it to `inspect` (the details card dims the scene, so the
  hologram would only show behind a veil and vanish when the card closes).
- **What the hologram shows:** both. The shard grows (x1.45 in the open sky, x1.2 in the halo, where it is already
  enlarged) and burns hottest of all, and a card is projected beside it: "on display", the name, the stage, the
  organisation and the dates. The shard's own label is hidden while the card names it. The card hangs above the
  shard, or below it when the shard is high on the screen, so it never leaves the top edge.
- **How the aura is drawn:** one component (`scene/hologram.tsx`), one instance, facing the stranger: a soft glow
  (a canvas gradient tinted with the shard's hue) and two additive rings, one full and one an arc, turning in
  opposite directions. Three draw calls and one DOM element; no post-processing. It sizes itself from the shard's
  current scale (`nodeScale`, written by the constellation like `nodePositions`).
- **Cost:** measured headless at 1440x900, low quality: median and p95 frame time 16.7 ms with nothing chosen and
  with a project on display (vsync-capped both times, no regression visible). Not measured on a phone.
- **Reduced motion:** the aura holds still (no turning rings, no pulse), the card appears without its unfolding.
- **Without WebGL:** the project's card in the Projects window is marked: a gold edge, an "ON DISPLAY" chip and
  `aria-current`. The same mark shows with WebGL, so the window and the sky agree.
