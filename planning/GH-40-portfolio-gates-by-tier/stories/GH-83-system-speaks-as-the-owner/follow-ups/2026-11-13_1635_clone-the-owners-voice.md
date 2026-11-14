---
status: open
from: person
found-while: story "The System speaks as the owner" (grilling, Q6)
resolved-by:
---

# Give the replica a clone of the owner's real voice

The replica speaks with a stock voice (decision 006). The owner kept a clone of his own voice on the table, to
decide once the replica works in text.

What it would take: a few minutes of recorded samples; a provider that supports cloning (ElevenLabs or similar) and
its key, outside OpenRouter; a change in `src/agent/server/audio.ts`, which today only calls OpenRouter; and an
answer to the misuse risk of a copy of his voice behind the public `/api/voice/speech` route.
