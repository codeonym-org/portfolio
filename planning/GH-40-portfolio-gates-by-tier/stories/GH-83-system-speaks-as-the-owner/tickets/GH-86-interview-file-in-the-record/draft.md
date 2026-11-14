# The interview file: the owner's answers to common HR questions

## Problem

The record holds jobs, projects and skills. It does not hold what an HR interview asks: motivation, strengths and
weaknesses, how he works, what he is looking for, remote and relocation, availability. The agent has nothing true
to say about them.

## Change

A new, typed part of the record, tracked in git, holds the owner's own answers (story decision 003). The agent
drafts the common questions and grills the owner on them, one at a time; his answers are written in his words.
The file is made available to the agent's grounding, so the replica ticket can answer from it. Later sessions add
to it.

## Left to the ticket pass

- The shape of an entry (question, answer, topic, what is binding and must be confirmed by the owner).
- The list of questions for the first session, and the languages of the answers.
- Whether the answers also show on `/record` and `/llms.txt`.

## Done when

- The file exists in the record with the owner's answers from a first session, each one approved by him.
- It holds nothing he would not publish (the repository is public).
- A test checks that every entry is well formed and reaches the agent's grounding.
- Lint, type check, tests and build pass.
