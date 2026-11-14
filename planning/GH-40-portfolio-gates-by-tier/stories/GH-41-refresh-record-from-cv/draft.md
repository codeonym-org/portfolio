# Refresh the record — open-source and guild work in, academic projects out

## Goal

The record says who the owner is today: an engineer at OpenSNZ-Technology and the guild master of two GitHub
organizations with released open-source projects. Every gate and the agent read this record, so it is corrected
before the first gate is built.

## What it delivers

- **Guilds as entries** (decision 002): OpenSNZ-Technology (Engineer), codeonym-oss and codeonym-org (Guild
  Master). Each has a name, the owner's role, one line on what it is, and a link. Every project names its guild.
- **Ten projects** (decision 001): `opensnz-contract` and `pharma-mas` stay. Brikool, ARAPT, Mandoc-OCR and
  UNI-Lab are removed. Added: i18n-ai, mediary, acli-py, jira-time-tracker, groundwork, design-skills (released);
  flow-reel and gsm-agent-kit (marked "in development").
- **Ranks** (decision 004): OpenSNZ entries rank S, main work. i18n-ai, mediary, groundwork rank A. The other
  five rank B. All eight personal projects are side projects.
- **Dates** (decision 003): from the owner's CV, shown as "since <month year>".
- **Skills** (decision 007): Jaeger and Context API added, Keras / Deep Learning removed.
- **Profile** (decision 009): a new title, "Guild Master", and a new inventory item, a codeonym guild crest.
- **CV and contact** (decision 008): the new CV replaces `public/cv.pdf`, phone number included. The phone number
  becomes a contact channel the agent may share.
- **The scene still reads well with ten projects** (decision 006).

## Rules every ticket keeps

- A project's text restates its repository's README and adds nothing beyond it (decision 005). No star counts.
- Everything that reads the record shows the same data: the scene, the windows, `/record`, `/llms.txt`, the
  agent's dossier and the local index.
- No new visuals or layout: the next story redesigns the page (decision 006).
- `pnpm lint`, `npx tsc --noEmit`, `pnpm test` and `pnpm build` pass before pushing.

## Tickets, in order (decision 010)

1. **Update the record: guilds, ten projects, skills, CV and contact** — all data and text, and everything that
   reads it.
2. **Check the scene with ten projects and fix what is broken** — run the page, fix only what is broken or
   unreadable.

## Out of scope

Medora and the support repositories as projects; rewriting existing titles or inventory items; a new project
layout; live GitHub data (story 3).
