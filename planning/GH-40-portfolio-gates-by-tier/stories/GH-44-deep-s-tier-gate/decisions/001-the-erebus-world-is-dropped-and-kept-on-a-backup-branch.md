# 001: The Erebus world is dropped and kept on a backup branch

**Date:** 2026-11-13

## Context

Ticket #76 built Erebus as a world to walk (the throne hall, a hooded hunter, statues that wake), and #77 and #78
were to add a model director and rewards. Meanwhile the owner moved the idea of an agentic, voiced RPG into its own
project. That left the gate's future open.

## Decision

The owner, asked what Erebus should become:

> lets drop this world! we will get back to point zero, save it on a stale backup branch on remote (do not delete it!
> ) maybe we will need it later on !

- The portfolio goes back to `40-gates` as it was before Erebus.
- All the work stays on the remote branch `backup/erebus-world` (commit `e0d9371`). It is never deleted.
- #76, #77 and #78 are closed as not planned, each with a pointer to that branch.
- What the Deep S-tier gate becomes later is still open and is the owner's call.
