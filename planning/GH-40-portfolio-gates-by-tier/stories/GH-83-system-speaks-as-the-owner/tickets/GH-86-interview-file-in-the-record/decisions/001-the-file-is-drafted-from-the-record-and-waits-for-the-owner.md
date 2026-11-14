# 001: The file is drafted from the record and waits for the owner's word

**Date:** 2026-11-14 (ticket pass; taken by the agent, story decisions 003 and 008)

**Questions and what was taken:**

- **The shape of an entry:** `id`, `topic` (motivation, work, strengths, practical, terms), `question`, `status`,
  `answer` (first person) and `binding`. The status is one of `confirmed` (his words, approved by him),
  `from-record` (drafted from what the record already states) and `open` (no answer).
- **Who wrote the first answers?** The owner asked not to be asked again (decision 008), and the story forbids
  inventing his answers (decision 003). So: 8 entries are drafted only from his profile, experience and
  organisations, marked `from-record`; 11 questions are left `open` with no answer (weakness, hardest problem, a
  failure, team style, next role, next years, open to offers, remote or relocation, contract, start date, salary).
  No entry is `confirmed` yet. Not chosen: writing plausible answers for him.
- **What the agent is told:** each entry reaches the grounding with its state. For `open` it must not answer and
  offers the contact card; for `binding` it never settles anything, even with an answer on file.
- **Languages:** the answers are in English; the agent already replies in the visitor's language.
- **`/record` and `/llms.txt`:** the file is not shown there in this ticket. Only `confirmed` answers should ever be
  published as his words, and there are none yet.
- **Where it lives:** `src/config/interview.config.ts` (data), `src/agent/interview-grounding.ts` (rendering and
  checks, pure, tested), read by `server/dossier.ts` into the digest and the `interview` archive section.
- **Not done, and why the issue stays open:** "each answer approved by him" needs the owner. See the follow-up.
