# GH-63 — the holographic map: what was built (by the agent, 2026-11-13)

## Decisions taken in the ticket pass (by the agent, epic decision 009)

- **One data file, built once** (`scripts/assets/holo-map.mjs` → `public/data/holo-map.json`, 498 kB, about
  135 kB gzipped), loaded only when the map opens. Natural Earth for land and borders (public domain),
  OpenStreetMap for the city's roads (ODbL, credited in the overlay's footer and in `world.credits`). No tiles,
  no map service, no geolocation: the only request is to this site.
- **Lines of light, not a textured globe.** Coastlines, borders, the base country in gold, a graticule. It fits
  the System's look and costs little to draw.
- **Four levels:** Globe, Region, Country orbit the globe; for City the camera comes down over a flat plate
  that carries the roads (three classes) and rings at 2, 5 and 10 km. The plate is much larger than the true
  scale of the globe: at true scale a city is a point.
- **The opening flight** goes through the four levels in about six seconds and stops as soon as the visitor
  drags, scrolls, pinches or picks a level. With reduced motion the map opens still, at the country level.
- **Controls:** drag turns (at city level it turns the plate), wheel or pinch zooms, the four buttons and the
  left and right arrow keys change level, Escape or a click outside closes. Other keys of the record are
  ignored while the map is open.
- **Morocco is drawn with the Sahara as one outline**, as the owner's country draws it. The line Natural Earth
  puts between its two features is removed in the script (`HOME`). Open for the owner.
- **`base.countryCentre`** in `player.config.ts`: the country level centres on the middle of the country, not
  on the city, which is in its north-east corner.
- **Two agent tools:** `show_map` keeps drawing the small card (now with an "Open the hologram" button);
  the new `open_map` opens the overlay directly. `close_windows` closes it. `mapOpen` is in the snapshot.
- **After looking at the renders:** the place marker is a dot with an opening ring (a beam standing on the
  globe looked like a "no entry" sign from the side); a shade sits under the readouts so the map's lines do
  not cross the words; the country level stands a little further back; roads are cut at 12.5 km (Overpass
  returns whole ways).

## Files

New: `scripts/assets/holo-map.mjs`, `public/data/holo-map.json`, `src/components/map/holo-scene.tsx`,
`src/components/interface/holo-map.tsx`.
Changed: `src/config/player.config.ts`, `src/config/types.ts`, `src/config/world.config.ts`,
`src/store/world-store.ts`, `src/components/interface/shell.tsx`, `map-card.tsx`, `palette.tsx`,
`src/agent/system-commands.ts`, `system-snapshot.ts`, `src/app/globals.css`, `scripts/assets/README.md`.

## Checked (headless Chromium, production build)

Desktop (1440×900) and phone (390×844): `open_map` opens the overlay; each of the four buttons reaches its
level; wheel out from City gives Country; the right arrow gives City; Escape closes and no dialog is left; no
request to any host other than the site. Screenshots of the four levels were looked at on both sizes.
Lint, type check, 57 tests and the build pass.

## Not checked

Pinch on a real touch screen, real phones, Safari, Firefox, the frame rate on a weak GPU, and the agent
choosing `open_map` by itself in a real conversation (the check calls the command directly).
