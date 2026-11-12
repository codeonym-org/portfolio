# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** `src/agent/next-step.ts` (+ 5 tests): a pure picker of the next thing worth seeing, in the order
brief → strongest project → projects → experience → skills → CV → contact; `src/agent/guide.ts` (what this
visitor has seen, whether the System may still offer); the command `offer` (a System prompt whose "Accept" runs
one allowed action); in the store: `inspected`, `offers`, `noteOffer()`, `invite()`; `world.agent.flagship`
(`pharma-mas`); `world.prompts.offerHeading`.
**Changed:** the agent's prompt (new section THE HUNTER); the App Context (`guide.mayOffer`,
`guide.suggestedNext`); `converse.ts` (offline answers close with the next step; a plain "yes" takes it;
asking "what next" reopens declined offers); `local-brain.ts` (bug fix below).

**Decisions taken while building (by the agent):**

- **The page enforces the limits, not the model:** no offer within 45 seconds of the last one; none after two
  declined in a row; an offer may only run `open_brief`, `open_sector`, `inspect_entity`, `open_cv`,
  `download_cv` or `arise_all`, with arguments checked against that command's own schema and the record.
- **"Until the visitor asks" is detected in the page** ("what else", "what next", "show me more", French
  forms): the model was first given a `requested` flag and set it on every call, so the flag was removed.
- **A refused offer answers "Skipped … now answer normally"**: with a refusal worded as an error, the model
  (`gpt-oss-120b`) once produced a garbled reply.
- **The suggestion is given to the model as a sentence**, without command syntax, after it copied the syntax
  into a reply.
- **No next step** after a contact answer or "close": the Gate is the last step.

**Fixed while checking:** offline, "show me his skills" opened the project `design-skills` (a project name
containing a sector word). Sector words no longer select a project; a test covers it. This bug came with the
new projects of ticket GH-45.

**Checked:** the command by hand (gap, two declines, unknown id, accept runs the action); the live agent,
three runs: each answer ended with one next step or an offer, and accepting an offer opened what it named;
offline (the agent route blocked): closing step shown, "yes" and "ok" took it, the contact answer had none.
Lint, `tsc --noEmit`, 57 tests, build.

**Known limits:** the live model sometimes names a project by its id ("pharma-mas") in the closing line, and
sometimes calls `offer` twice in one reply (the second is skipped by the page). Not checked: French and Arabic
conversations; the voice.
