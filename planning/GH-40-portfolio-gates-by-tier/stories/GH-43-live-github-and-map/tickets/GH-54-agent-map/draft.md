# A map the agent can show: where he is and what time it is there

## Problem

A hiring team wants to know where he is based and whether working hours overlap. Today that is one line of text.

## Change

A map card the agent shows under its reply (`show_map`), also reachable from the brief and the contact window:
a world map with his base marked, his local time, and the time difference with the visitor, computed in the
browser. No geolocation, no map service (story decision 001, point 6).

## Done when

- Asked "where is he based?" or "what time is it for him?", the agent shows the map card.
- The card shows Oujda, Morocco, his current local time and "N hours ahead of / behind you" (or "same time").
- No request leaves the site to draw the map.
- Lint, type check, tests and build pass.
