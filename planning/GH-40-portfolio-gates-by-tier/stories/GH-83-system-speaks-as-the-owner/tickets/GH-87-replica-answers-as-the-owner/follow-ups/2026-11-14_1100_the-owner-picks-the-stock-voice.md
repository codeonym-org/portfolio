---
status: open
from: agent
found-while: ticket GH-87 (the replica), built without the owner (story decision 008)
resolved-by:
---

# The owner listens to the stock voices and picks the closest to his own

Story decision 006 asks for the stock voice closest to the owner. The agent cannot hear him, so the voice was left
at `gb_oliver_confident`.

What to do: play a first-person sentence with a few voices of the TTS model (set `TTS_VOICE` in `.env.local`, hold
V on the page), let the owner choose, and set the default in `src/agent/server/audio.ts`. In the same session,
check the voice agent out loud: the disclosure once, "I'd rather answer that myself" for an open question, nothing
binding agreed.
