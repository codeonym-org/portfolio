# GH-61 — the index as a wheel: what was built (by the agent, 2026-11-12)

## Decisions taken in the ticket pass (by the agent, epic decision 009)

- **A half wheel docked on the left edge**, six segments over 156°, drawn as SVG. It replaces the index rail
  (`index-rail.tsx` removed). The hub shows the count of entries and the name of the aimed sector.
- **Three ways to open it:** move the mouse to the left edge (a 16 px strip, or the "INDEX" tab); hold **Q**
  (release opens the aimed sector, like a weapon wheel); tap the tab on touch. Arrow keys move the aim while Q is
  held; Escape closes; keys 1–6 still open a sector directly.
- **The wheel takes no pointer events while closed**, so the scene under it stays draggable.
- Visited sectors carry a gold mark on the rim; the aimed segment lights its ring in the scene (`setHovered`).
- **Check builds use their own folder.** `next.config.ts` reads `NEXT_DIST_DIR`; the checks build and serve with
  `NEXT_DIST_DIR=.next-verify`. Reason: a production build into `.next` while the owner's `next dev` ran left the
  dev server with a stale stylesheet (the System window appeared unstyled on 2026-11-12).

## Files

`src/components/interface/index-wheel.tsx` (new), `shell.tsx`, `next.config.ts`, `.gitignore`,
`eslint.config.mjs`, `.claude/skills/verify/SKILL.md`.

## Checked (headless Chromium, production build)

Desktop 1440×900: edge hover opens, click opens the sector, leaving closes (wheel inert); hold Q + two arrows +
release opens Projects; key 5 opens the Vault. Phone 390×844: tap the tab, tap a segment opens it.

## Not checked

Real phones, Safari, Firefox, a screen reader.
