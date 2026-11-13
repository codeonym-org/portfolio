# 008: The agent runs the rest of the story without asking

**Date:** 2026-11-13 (said by the owner when approving the issues: "yeah and be autonoumous do not bother me
again!")

**Question:** how are the ticket passes and the implementation run?

**Decision:** **as in epic decision 009:** for each question the agent would have asked, it writes the options,
takes the one it recommends, and records it in the level's `decisions/`, marked "taken by the agent". It creates
branches, commits, pushes, opens and merges pull requests into `40-gates`, and edits issues.

- **Limits that still hold:** never push to `main` or merge the epic into it; no Claude attribution; secrets stay
  in `.env.local`; the owner's dev server on :3001 is not restarted.
- **One exception that cannot be avoided:** ticket GH-86 needs the owner's own answers. The agent prepares
  everything else and builds the file with answers drafted only from what the record already states, each marked
  as waiting for his word; it does not invent his opinions.
