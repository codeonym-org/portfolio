# 001: Projects are lit from the start, and only what was seen is kept

**Date:** 2026-11-14 (ticket pass; taken by the agent, story decision 008)

**Questions and what was taken:**

- **Where do the projects sit now?** Every project rides the tight orbit near the Monolith that the "risen" ones
  used, lit like every other shard. A click opens its details at once. Not chosen: leaving them on the outer ring
  (the tight orbit is the look the owner had already accepted for a raised project).
- **The Projects window:** every card shows its details, stack and buttons. The counter, the ARISE button and the
  "sealed" row are gone.
- **Commands removed:** `arise`, `arise_all`, `reset_progress`, `visitor_progress`. Nothing replaces them here; the
  plain commands ("show me your projects") come with GH-87.
- **The effect `awaken`** is renamed `shockwave` (the command, the palette entry and the sound file). It is still a
  visual effect the agent can cast.
- **What the page remembers:** the sections opened, whether the brief was read and whether the CV was read. XP,
  levels, quests, sync and the list of raised projects are removed from the store.
- **Stored state from before:** the persisted state moves to version 2. Old `completed` entries ("brief",
  "license") become the two flags; the rest is dropped. No visitor sees an error or a reset of what they opened.
- **Unused after this:** the level-up sound and the music ducking for "big moments" are deleted.
- **The agent's context** carries `sectionsOpened`, `briefRead`, `cvRead` instead of quests and sync.
