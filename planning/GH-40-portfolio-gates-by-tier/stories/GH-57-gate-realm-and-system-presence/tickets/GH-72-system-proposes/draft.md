# The System proposes an action only when it decides to, and never the same one twice

From the owner's review of the offers (story decision 004).

## Problem

The offer window always shows the same proposal, and one comes with every reply. The System uses the owner's
full name in capitals and calls the visitor "Hunter".

## Change

- After each reply the System decides whether to propose an action. No proposal is the normal case.
- A proposal follows from what was just discussed; one already made is not made again.
- The visitor can accept, refuse or ignore. Ignoring does not count as a refusal.
- The System says "Ayoub" for the owner and no longer says "Hunter" to the visitor.

## Done when

- Several questions in a row do not raise the same proposal twice, and some replies raise none.
- Accept runs the action; refuse and ignore close the window; two refusals in a row stop the proposals.
- Lint, type check, tests and build pass.
