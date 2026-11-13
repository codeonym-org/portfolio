# No arise, no progress: projects lit on load, and no XP, levels or quests

## Problem

Projects start as dark "dormant" shards the visitor must raise one by one, and the visitor collects XP, levels,
six quests and a sync percentage. None of it belongs in an interview.

## Change

Every project shard glows from the first frame, in its final orbit (story decision 005). Clicking one, or the agent
showing one, brings it forward and opens its details, as other entries do. The projects panel loses its ARISE
buttons and its counter and gets a plain "Open" action. XP, levels, the visitor quests and the sync percentage are
removed from the store, the interface, the agent's commands and its context (story decision 004). The store keeps
what the stranger has opened, for the agent's suggestions.

## Left to the ticket pass

- What replaces the Monolith's burst and the rise sound.
- How saved state from before (risen projects, XP) is read or discarded.
- Which of the agent's commands and next-step rules relied on "risen", and what they use now.

## Done when

- On a first visit every project is lit and can be opened with one click.
- No ARISE button, counter, XP, level, quest or sync percentage shows anywhere, and the agent has no command for
  them.
- The agent still suggests what the stranger has not seen yet.
- A browser with saved state from before loads without an error.
- Lint, type check, tests and build pass.
