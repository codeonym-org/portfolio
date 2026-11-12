# 001: The ticket's own choices (taken by the agent, epic decision 009)

**Date:** 2026-11-12 (ticket pass, run by the agent alone; each line is the recommended option)

**Questions and decisions:**

1. **Shape of a guild.** `Guild { id, name, role: "Engineer" | "Guild Master", kind, summary, link? }` in a new
   `src/config/guilds.config.ts`, with `findGuild(id)`. `Quest.guild` is a guild id, required. `player.guild`
   (the employer's name) stays, because the profile line "Software Engineer at …" uses it.
   *Not chosen:* guilds inside `player.config.ts` (projects would import the player).
2. **Released or in development.** New optional `Quest.stage: "released" | "in development"`. All eight personal
   projects have `status: "ongoing"` (they are maintained) and a stage. *Not chosen:* a version number in the
   record (it goes stale within weeks; story 3 shows live versions).
3. **Docs link.** New optional `Quest.docs`, shown as a second link.
4. **Start dates not on the CV** (story decision 003: the agent proposes): jira-time-tracker "since 2026/09",
   design-skills "since 2026/09" (repositories created 2026-09-28 and 2026-09-25), flow-reel "since 2026/11"
   (created 2026-11-02). **The owner should correct these if work started earlier.**
5. **Where the phone number appears:** the contact window, the contact card, a fourth shard in the contact ring,
   `/record`, `/llms.txt`, the agent's dossier, and the `copy_contact` / `open_link` tools (`tel:` link). The agent
   never writes it in its text: it shows the contact card, as for the email.
6. **Projects window:** personal projects are grouped by guild, each group with the guild's role and summary.
   This is data layout, not new visuals.
7. **Project text:** restated from each README as read on 2026-11-12. Two sentences go beyond a README and are
   facts about this repository: groundwork "This portfolio's own plan was made with it" and design-skills "The 3D
   assets of this portfolio were built with it". **The owner reviews the eight texts in the pull request.**
