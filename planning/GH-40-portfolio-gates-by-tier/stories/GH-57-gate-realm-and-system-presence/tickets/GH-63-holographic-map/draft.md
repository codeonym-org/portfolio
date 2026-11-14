# A holographic map: from the globe down to the city

## Problem

The map is a small still picture. The visitor cannot turn it, zoom it or see where the city is in its country.

## Change

The map opens as a holographic overlay over the scene (story decision 001, point 10): a globe the visitor can
turn and zoom. On opening it flies from the whole globe to the region, the country and the city (Oujda). The
overlay shows his local time and the time difference, as the card does today. The small map card stays under the
agent's reply and gains an "open the hologram" button; `show_map` can open the overlay directly.

All map data ships with the site: no map service, no tiles, no geolocation.

## Done when

- The overlay opens from the map card, the contact window and the agent.
- Drag turns the globe; the wheel or a pinch zooms; four steps (Globe, Region, Country, City) jump between
  levels.
- At city level the visitor sees Oujda's position and its main roads.
- No request leaves the site; data sources are credited in the overlay.
- Escape closes it; the page behind is unchanged.
- Lint, type check, tests and build pass.
