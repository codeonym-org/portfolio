# Live GitHub data for personal projects: agent tool and project card

## Problem

The agent only knows what is written in the record. It cannot say whether a project is active, or its current
version.

## Change

- A server module reads public facts about a project's repository from GitHub (latest release, last push, three
  latest commits, open issues, licence), cached ten minutes, read-only, only for projects in the record.
- The agent gets a tool, `github_live`; each personal project's card shows a "Live from GitHub" strip.
- Optional `GITHUB_TOKEN`, server-side only.

Rests on epic decision 007 and story decision 001.

## Done when

- Asked "is mediary maintained, what is its latest version?", the agent answers with the release and date read
  from GitHub.
- A personal project's card shows the strip; an OpenSNZ project's card does not.
- `/api/github/<unknown id>` is a 404; no token reaches the browser; when GitHub fails the card shows nothing.
- Lint, type check, tests and build pass.
