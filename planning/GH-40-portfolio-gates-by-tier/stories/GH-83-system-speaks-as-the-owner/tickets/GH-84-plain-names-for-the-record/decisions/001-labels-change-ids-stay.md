# 001: What is shown changes; ids and identifiers stay

**Date:** 2026-11-13 (ticket pass; taken by the agent, story decision 008)

**Questions and what was taken:**

- **Do sector ids and entry ids change?** No. `status`, `inventory`, `hunter-license` and the evidence kind `quest`
  are inside shared `#case=` links and the agent's tools. Only names, labels and descriptions change. Not chosen:
  renaming ids with a redirect table (more code for something nobody sees).
- **Do code identifiers change (`quests`, `guilds`, `player`, `Quest`)?** No, in this ticket. A note in each config
  file says so. Renaming them is a mechanical change that can follow once the story is done.
- **The profile's level, rank and "S-rank assessment pending":** removed from the record and its type. They stated
  nothing true about him.
- **The "Vitals" block** (context window and output capacity gauges): removed from the Profile window. Fake gauges.
- **Titles** become "Known for", with plain names. **Stat codes** (INT, MP, STR…) become AI, CTX, BE, FE, OPS, OBS.
- **Skill and document descriptions** are rewritten plainly from what the old text already claimed; nothing new is
  stated about him.
- **The rarity word** (legendary, epic…) is no longer printed; the colour stays.
- **Erebus** keeps its planet and "sealed" state; its text no longer promises gameplay or rewards.
- **The agent's prompts** lose the Solo Leveling framing and call him Ayoub in the third person. The first person
  comes with ticket GH-87.
- **Left for GH-85, on purpose:** ARISE, the dormant projects, the counter, XP, levels, quests and SYNC.
