# codeonym — the living record

**Live:** [portfolio.codeonym.work](https://portfolio.codeonym.work)

A portfolio with no pages. **THE SYSTEM**, an AI agent, lives in a fractured obsidian Monolith; every entry of the
CV — each project, skill, job, degree — is a shard in orbit around it. You ask (type, or hold **V** to talk) and the
agent answers by rearranging the place: it brings the right shards forward, opens the record beside them, and can
assemble a **case file**, a set of evidence picked for your question that you can share as a link. Its tool calls
are shown live as a run trace.

Without the agent (no key, offline, rate-limited) a local index takes over, **⌘K** runs every command by hand, and
[`/record`](https://portfolio.codeonym.work/record) and `/llms.txt` serve the same record as plain text.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui
- **3D:** three.js via React Three Fiber + drei + postprocessing; the models are generated in Blender
  ([`scripts/assets`](scripts/assets/README.md))
- **Agent:** LangChain `createAgent` served in-process through CopilotKit v2 (`/api/copilotkit`), models via
  OpenRouter, optional LangSmith tracing — see [`src/agent/README.md`](src/agent/README.md)
- Deployed on Vercel from `main`

## Run it

```bash
pnpm install
cp .env.example .env.local   # fill in the keys (OpenRouter is required for the agent)
pnpm dev                     # http://localhost:3000
```

| Command | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build && pnpm start` | Production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Node test runner (`src/**/*.test.ts`) |

Content (player profile, skills, quests, inventory) lives in `src/config/*.config.ts`
([`src/config/README.md`](src/config/README.md)).

## Controls

| Key | Action |
|---|---|
| / or T | Ask THE SYSTEM |
| hold V | Talk to THE SYSTEM |
| ⌘K / Ctrl K | Command palette |
| 1–6 | Open a sector |
| Drag | Spin the sky |
| Esc | Close what is open |
| M | Sound |
| F | Fullscreen |

## Contributing

`main` is protected: every change goes through a PR. Issues, milestones and labels are on
[GitHub Issues](https://github.com/codeonym-org/portfolio/issues) — see
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) for the workflow.
