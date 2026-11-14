# The System persuades the Hunter to see and read more

## Problem

The agent answers what it is asked and stops. A recruiter who asks one question leaves with one answer, having
seen a small part of the record.

## Change

The agent treats the visitor as a Hunter who is weighing the Player for a role, and leads them on (story
decision 001, point 7):

- Every answer ends with **one** concrete next step tied to a part of the record the visitor has not seen.
- The agent can put that step as a System prompt (`offer`): the visitor accepts and the System does it.
- It stays honest: only facts from the record, gaps named, no pressure, and no offer after the visitor declines
  twice in a row.

## Done when

- Asked a plain question, the agent answers and ends with one next step that the visitor has not already taken.
- The agent can show an offer; accepting it runs the action (open a sector, a project, the brief, the CV, the
  contact card, a case).
- After two declined offers the agent stops offering until the visitor asks for more.
- The offline answers (no model) also end with a next step.
- Lint, type check, tests and build pass.
