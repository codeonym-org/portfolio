# A pulse on screen while the voice is live

## Problem

When the visitor talks with the System, the only sign on screen is five small bars beside the prompt.

## Change

While the voice is live the screen shows a heartbeat (story decision 001, point 9): a pulse line across the
bottom of the stage and the Monolith's heart beating with it. Each state looks different: listening follows the
visitor's microphone, thinking is a slow resting beat, speaking follows the System's voice.

## Done when

- Listening, thinking and speaking each show a distinct pulse; idle shows none.
- The Monolith's heart beats in time with the pulse line.
- With "reduce motion" set, the pulse is a steady glow.
- The pulse costs nothing when the voice is idle.
- Lint, type check, tests and build pass.
