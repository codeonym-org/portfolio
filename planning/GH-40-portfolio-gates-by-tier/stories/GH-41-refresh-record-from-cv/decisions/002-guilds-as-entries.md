# 002: Guilds are real entries in the record, and every project belongs to one

**Date:** 2026-11-12 (grilling, Q2; agreed: "for your last question record it as answered with option 1")

**Question:** how do the guilds appear in the record? Today there is one text field, `guild: "OpenSNZ-Technology"`.

**Decision:** **guilds become entries of their own.** Three guilds:

- OpenSNZ-Technology — the owner is an **Engineer** there (the employer);
- codeonym-oss — the owner is the **Guild Master** (open-source projects);
- codeonym-org — the owner is the **Guild Master** (own products and this portfolio).

Each guild has a name, the owner's role in it, one line saying what it is, and a link. Every project entry names
the guild it belongs to, so a gate and the agent can group projects by guild.

- **Why:** the owner asked for the split between "where I am a guild master" and "where I am an engineer" to be
  visible; a link from project to guild lets every gate show it without repeating text.
- **Not chosen:** text only (a mention in the profile and a guild tag on projects — nothing to group by, no role);
  the two orgs as experience entries in the Chronicle (reads as inflated employment).
- **Left to the tickets:** the exact shape of a guild entry and where it lives in `src/config`.
