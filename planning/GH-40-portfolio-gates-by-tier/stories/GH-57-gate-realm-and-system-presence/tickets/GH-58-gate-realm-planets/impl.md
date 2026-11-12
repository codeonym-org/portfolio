# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** `src/config/realm.config.ts` (seven planets, the realm's copy, `planetOfGate`); the `Planet` type;
`src/components/gates/gate-realm.tsx` (the page: HTML details, the list of worlds, keys, swipe);
`realm-scene.tsx` (the 3D scene, its own chunk, loaded after the page); `planet-shaders.ts` (one fragment
shader with a branch per kind of world, plus air, ring and star); `planet-art.tsx` (each planet as a flat SVG);
`rank-badge.tsx`.
**Removed:** `gate-catalog.tsx`, `gate-art.tsx` (the card shelf and the iceberg covers).
**Changed:** gates renamed in `gates.config.ts` (`first-light`, `erebus`, new taglines and descriptions);
`surface-gate.tsx` → `first-light-gate.tsx`; the sealed screen draws the gate's planet; the agent's
`open_gates` description and the palette's search words.

**Decisions taken while building (by the agent):**

- **Order of the worlds, from the star out:** a lava world, First Light, a barren world, a gas giant with two
  moons, a ringed ice world, a crystal world, Erebus last. Erebus is the farthest from the light on purpose.
- **Uncharted worlds** are drawn at half light and half colour, have no name in the list ("· · ·") and show
  "Uncharted · no gate" when selected.
- **A sealed gate** is shown by a slowly turning cage of gold lines around its planet.
- **Whole-realm view** (Escape or the orbit button): the camera pulls back to show every orbit; charted worlds
  carry a name label there.
- **Camera:** the selected world sits right of the text on a wide screen and above it on a narrow one.
- **One clock for all shaders**, a module-level uniform, because the lint rule forbids changing a memoised
  material inside a frame callback.
- **Phone:** the long description and the "holds" list are hidden; the tagline, audience and button stay.
- **Reduced motion:** the worlds stop orbiting and turning, and the camera jumps instead of flying.

**Checked (headless Chromium, real GPU, 1440×900 and 390×844):** every world selected and looked at; no
shader or console error; arrow keys travel; Enter opens `/gates/first-light`; `/gates/erebus` shows the seal;
`/gates/the-deep` is 404; with JavaScript off the page still links both gates; `/llms.txt` lists the new names.
`/gates` loads 2 JavaScript files the home page does not, and the home page loads none of them.
Lint, `tsc --noEmit`, 51 tests, build.

**Not checked:** a device without WebGL (only JavaScript off); "reduce motion"; real phones; Safari, Firefox.
**Left as is:** in the whole-realm view on a wide screen, Erebus's orbit runs partly under the list of worlds.
