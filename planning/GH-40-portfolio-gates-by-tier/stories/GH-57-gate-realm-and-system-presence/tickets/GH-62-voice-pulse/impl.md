# GH-62 — the voice pulse: what was built (by the agent, 2026-11-12)

## Decisions taken in the ticket pass (by the agent, epic decision 009)

- **The pulse line lives in the console, above the words**, not across the whole stage: the console's height is
  what the camera frames around (ticket 68), so the line makes its own room and never crosses the Monolith.
- **A heart monitor trace** drawn on a 2D canvas (P wave, QRS spike, T wave), with a beats-per-minute readout in
  the System font. Rate and height come from the state and the loudness (`voiceLive.level`):
  listening blue, 64–110 bpm; thinking and decoding violet, a resting 52; speaking gold, 76–130.
- **The Monolith's heart beats with it**: the monitor writes `live.heart` (1 on the spike, fading), the Monolith
  adds it to the heart's glow, size and light.
- **Reduced motion:** a steady glowing line in the state's colour, no canvas, no beat.
- **Idle costs nothing:** the component is unmounted; no canvas and no animation frame.
- **`system.pulse(phase)`** on the dev bridge shows a state without a microphone (used by the check).

## Files

`src/components/interface/voice-pulse.tsx` (new), `console.tsx`, `src/components/scene/monolith.tsx`,
`src/store/world-store.ts` (`live.heart`), `src/agent/dev-bridge.tsx`.

## Checked (headless Chromium, production build)

Desktop and phone: no canvas while idle; listening, thinking, speaking each draw their line and rate (64, 52,
76 bpm at silence); back to idle removes it. Reduced motion: the steady line, no canvas.

## Not checked

A real microphone and the System's real voice (so: how the line follows loudness), real phones, Safari, Firefox.
