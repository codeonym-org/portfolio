# HANDOFF — groundwork session on the portfolio "Gates" epic (2026-11-12)

Written for the agent that continues. The owner (codeonym) ran `/groundwork:create-story`; the session ran out of
budget mid-grilling. Continue with `/groundwork:create-story` on the story below, from "What is next" below.

## Rules that bind you

- Global: **never add Claude attribution** to commits or PRs. Project: never push to `main`; branch
  `<issue>-short-name`; PR title = conventional commit, body `Fixes #<n>`; secrets in `.env.local` (key names only).
- groundwork (`~/.claude/plugins/cache/codeonym-oss/groundwork/0.1.0/references/`: `structure.md`, `grilling.md`,
  `approval.md`, `drafting.md`, `trackers/github.md`): one question at a time, always with 2–4 options and a
  recommendation; write each decision as soon as agreed, quoting the answer; **nothing outside `planning/` without an
  explicit yes** (issues, commits, source files).
- `groundwork.md` exists at the repo root (tracker: GitHub `codeonym-org/portfolio`, board `1`, prefix `GH-`).
  Issue rules: a type (Feature/Improvement/Bug/Task), one `area: …` label, milestone `v9 — Next`.

## State of the repo

- Branch `38-living-record`, PR **#39** open, mergeable, Vercel preview passed, **not merged**. It is the redesign
  ("the living record": Monolith + shards, agent-driven, `/record`, `/llms.txt`). Owner still has to check voice
  (hold V), real phones/Safari/Firefox and the CV viewer on the preview.
- **Uncommitted, untracked:** `groundwork.md` and `planning/` (this file included). The owner has not been asked
  whether to commit them or on which branch — ask before committing.
- Owner's feedback on the redesign: it feels **too minimalistic; most UI / 3D elements are gone**. That is input
  for story 2 (the first gate), not for the current story.

## Decisions taken (do not ask again)

Epic `planning/GH-40-portfolio-gates-by-tier/` (status: tracked):

- **001** The work is an epic, "Gates"; the first gate (rank C) is its first gate story.
- **002** `/` opens the default gate with no choice; every gate is named, has a rank (rank is an attribute — several
  gates may share one) and its own route; gates form a catalog, like a console game library.
- **003** The catalog is the page `/gates`, built with the first gate; each gate is `/gates/<gate-name>`; unbuilt
  gates show as sealed cards. Whether `/` renders or redirects is left to the routing ticket.
- **004** One record (`src/config`) and one agent shared by all gates; a gate brings presentation and its actions.
- **005** Four stories, in order: (1) refresh the record, (2) first gate rank C + catalog, (3) live data for the
  System (GitHub read access, a map), (4) Deep S-tier gate (planned later).

Story `planning/GH-40-portfolio-gates-by-tier/stories/GH-41-refresh-record-from-cv/` (status: tracked):

- **001** Ten project entries: keep `opensnz-contract`, `pharma-mas`; remove Brikool, ARAPT, Mandoc-OCR, UNI-Lab;
  add i18n-ai, mediary, acli-py, jira-time-tracker, groundwork, design-skills (released) and flow-reel,
  gsm-agent-kit (marked "in development"). Medora and support repos are out.

- **002** Guilds are real entries (name, owner's role, what it is, link): OpenSNZ-Technology (Engineer),
  codeonym-oss and codeonym-org (Guild Master). Every project names its guild.
- **003** Project dates come from the CV, shown as "since"; for projects not on the CV the agent proposes a date.
- **004** Ranks: OpenSNZ entries S / main; i18n-ai, mediary, groundwork A; the other five B; all eight are side.
- **005** Write-ups restate each repo's README, nothing beyond it; owner reviews the eight texts in the ticket.
- **006** Scene: run with ten projects, fix only what is broken or unreadable; no new layout.
- **007** Skills: add Jaeger and Context API, remove Keras / Deep Learning, keep the other web skills.
- **008** The new CV replaces `public/cv.pdf` with the phone number; the phone number becomes a contact channel
  the agent may share (owner's explicit choice, against the recommendation).
- **009** Add a "Guild Master" title and a codeonym guild crest item; nothing else in titles/inventory.
- **010** Two tickets: (1) all of the record's data and text, (2) the scene check with ten projects.

Epic, added later the same day: **006** one visitor progress shared by every gate.

## What is next

Everything is drafted, approved and **tracked**: epic GH-40; stories GH-41 (refresh the record), GH-42 (first
gate + catalog), GH-43 (live GitHub data + map), GH-44 (Deep S-tier gate); tickets GH-45 (record data and text)
and GH-46 (scene check), sub-issues of GH-41. All on board 1 (Todo), milestone `v9 — Next`. Epic decision **007**:
out of scope. Epic decision **008**: nothing reaches `main` until the epic is complete; all work goes to one
long-lived branch.

1. Open with the owner: the epic branch's name (proposed `40-gates`), and whether PR #39 merges into `main` first
   or becomes the start of that branch. Ask before creating any branch.
2. `/groundwork:create-ticket` on GH-45 (`stories/GH-41-…/tickets/GH-45-record-data-and-text`).

## Facts already looked up (2026-11-12)

- Orgs the owner belongs to: codeonym-oss, codeonym-org, codeonym-labs, team-m2i, m2i-duo, agentic-ai-pfe (the
  last four not inspected). All repos have 0 stars — do not headline star counts.
- codeonym-oss: i18n-ai v0.3.0 (48 commits, MIT, docs.codeonym.work), mediary v0.4.0 (41, MIT, docs), acli-py
  v0.3.1 (30, MIT), jira-time-tracker v0.2.0 (21, MIT, docs), groundwork v0.2.0 (14, MIT), design-skills v0.1.1
  (15, MIT), flow-reel (13 commits, no release, no licence), claude-plugins, docs, .github.
- codeonym-org: portfolio, gsm-agent-kit (15 commits, "under development", all rights reserved), medora (2 commits,
  README: nothing implemented), codeonym-brand, codeonym-arch-design, claude-sessions (private), .github.
- One-line descriptions are in each repo's GitHub description (`gh repo list <org>`).
- Current record: `src/config/quests.config.ts` (6 quests), `chronicle.config.ts` (2 jobs, 3 degrees — matches the
  CV), `player.config.ts` (`guild` string, titles), `skills.config.ts` (64 skills). Everything that renders the
  record: scene (`src/record/nodes.ts`), windows, agent dossier (`src/agent/server/dossier.ts`), `/record` and
  `/llms.txt` (`src/record/plain.ts`), local index (`src/agent/converse.ts`).

## Ideas the owner raised for later stories (not decided)

- A GitHub read token / GitHub MCP server or tools so the agent shows live repo data (story 3). Security note for
  that story: token server-side only, read-only, public data, rate-limited.
- A map the agent can spawn on the page (story 3).
- The Deep S-tier gate: full gameplay, extended 3D, rewards (story 4). More gates after.
