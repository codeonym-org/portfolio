# Update the record: guilds, ten projects, skills, CV and contact

## Problem

The record lists four academic projects, misses eight personal projects, knows one guild as a text field, and
serves an old CV. The agent and every page repeat this.

## Change

- Add guild entries (OpenSNZ-Technology, codeonym-oss, codeonym-org) with the owner's role, and a guild on every
  project (story decision 002).
- Remove Brikool, ARAPT, Mandoc-OCR, UNI-Lab. Add i18n-ai, mediary, acli-py, jira-time-tracker, groundwork,
  design-skills, flow-reel, gsm-agent-kit, each written from its README with repository and docs links (story
  decisions 001, 005), ranked per decision 004, dated per decision 003.
- Skills: add Jaeger and Context API, remove Keras / Deep Learning (decision 007).
- Add the "Guild Master" title and a codeonym guild crest item (decision 009).
- Replace `public/cv.pdf` with the new CV; add the phone number as a contact channel; change the agent's rule
  from "never a phone number or address" to "never an address" (decision 008).
- Update everything that reads the record (windows, `/record`, `/llms.txt`, dossier, local index) and the tests.

## Left for the ticket pass

- The exact shape of a guild entry and where it lives in `src/config`.
- Start dates for the three projects not on the CV (jira-time-tracker, design-skills, flow-reel): the agent
  proposes, the owner corrects.
- Where the phone number appears (contact card, `/record`, `/llms.txt`, dossier).
- The owner reviews the eight project texts before merge.

## Out of scope

Any change to the scene's layout (next ticket); rewriting existing titles or items.

## Done when

- `/record` and `/llms.txt` list ten projects, each with its guild, and no academic project.
- The agent, asked "which projects are open source?", answers from the new entries and names the guild.
- The agent gives the phone number when asked how to call the owner, and never an address.
- `/cv.pdf` is the 2026-11-12 CV.
- Lint, type check, tests and build pass.
