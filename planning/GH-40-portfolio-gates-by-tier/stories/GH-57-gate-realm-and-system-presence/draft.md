# The Gate Realm and a System with presence

## Problem

The gates catalog is a flat shelf of cards, and the System is quiet: its notices are small toasts, its voice has
five small bars, the map is a still picture, and the index is a plain list. The agent answers questions but does
not lead a hiring visitor further into the record. The owner asked for all of this to feel like a game interface
before The Deep is built.

## Change

Six changes, each its own ticket (story decision 001):

1. **The Gate Realm.** `/gates` becomes an interstellar selector: seven planets around a star, each with its own
   design. Two are charted gates: **First Light** (rank C, the home page) and **Erebus** (rank S, sealed). Five
   are uncharted and wait for future gates.
2. **The System's own type and dialog.** System messages use a dedicated System font and appear in a System
   window: short notices, and prompts with actions ("Accept" / "Later").
3. **The System persuades.** The visitor is the Hunter (a recruiter); the agent leads them to see and read more
   about the Player, with honest offers shown as System prompts.
4. **The index as a wheel.** The sector index becomes a radial wheel that appears from the left edge, like a
   game's weapon wheel.
5. **A pulse for the voice.** While the voice is live, the screen shows a heartbeat: a pulse line and a beating
   heart in the Monolith.
6. **A holographic map.** The map opens as a holographic overlay with a globe the visitor can turn and zoom,
   from the globe down to the city.

## Done when

- `/gates` shows seven planets; the two charted ones open their gates; the page works with a keyboard, on a
  phone and without WebGL.
- System notices and prompts use the System font and the System window.
- The agent ends its answers with one honest next step, and can offer it as a prompt the visitor accepts.
- The wheel opens from the left edge, by key and by touch, and opens every sector.
- The voice shows a pulse in each of its states.
- The map overlay zooms from the globe to Oujda and sends no request to another site.
- The home page does not load slower than before this story.

Design: story decision 001. Tickets, in order: the Gate Realm; the System font and dialog; the System persuades;
the index wheel; the voice pulse; the holographic map.
