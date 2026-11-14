---
planning-root: planning
forge: github
default-branch: main
tracker: github
tracker-project: codeonym-org/portfolio
tracker-board: "1"
key-prefix: GH-
epic-as: issue with sub-issues
story-as: issue with sub-issues
ticket-as: issue
---

# Project rules

- Every issue gets a type (Feature, Improvement, Bug or Task), one `area: …` label and the open version milestone.
- Branches are named `<issue number>-short-name`; PR titles are conventional commits and the body says `Fixes #<n>`.
- Never push to `main`.
- Never add Claude attribution to commits or pull requests.
- Before pushing: `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm build`.
