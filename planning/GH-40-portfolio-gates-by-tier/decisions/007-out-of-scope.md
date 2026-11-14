# 007: Four things are not part of the epic

**Date:** 2026-11-12 (grilling, Q7; agreed: "all four, write the drafts")

**Question:** what is explicitly not part of the Gates epic?

**Decision:** **these four stay out:**

1. **Accounts and a server database.** No sign-in, no visitor data stored on a server; progress stays in the
   visitor's browser (decision 006).
2. **Gates beyond the first two.** The epic ends with the rank C gate and the Deep S-tier gate; further gates are
   new work later.
3. **Writing to GitHub.** GitHub access is read-only and public data only; the agent never creates issues, stars
   or comments on the owner's behalf.
4. **A CMS or admin page.** The record stays in `src/config` and changes by pull request.

- **Why:** each one would add a server, a security surface or an open-ended scope that the two gates do not need.
- **Not chosen:** leaving any of the four open to be asked for inside the epic.
