# codeonym — the living record

**Live:** [portfolio.codeonym.work](https://portfolio.codeonym.work)

A portfolio with no pages. **THE SYSTEM**, an AI agent, lives in a fractured obsidian Monolith; every entry of the
CV — each project, skill, job, degree — is a shard in orbit around it. You ask (type, or hold **V** to talk) and the
agent answers by rearranging the place: it brings the right shards forward, opens the record beside them, and can
assemble a **case file**, a set of evidence picked for your question that you can share as a link. Its tool calls
are shown live as a run trace.

[`/interview`](https://portfolio.codeonym.work/interview) is the same agent face to face: his avatar at a desk in an
office, as in a real interview: you ask by text or by voice, and he answers aloud (or in text only, if you choose; or when the browser does not yet let the tab play sound) (it blinks, breathes, looks at you, and its jaw follows the voice),
the turn in progress laid out in floating windows around him (his words, what he shows), the turn before kept small in a corner, a transcript that opens as an old leather book of diaries, one diary for each of your conversations, handwritten and dated, with its contents, notes, stamps and stickers, whose pages bend as they turn and rustle, and his business card: dark metal with the brand mark carved in it, his contact details on the back, saved as a vCard. The avatar (from a photo of the owner seated, in a stylized CG look) and his chair are Hyper3D Rodin models; the avatar is rigged in Rodin (its humanoid skeleton and idle clip, played on his trunk and head), and two shapes made on his face, the jaw open and the eyes shut, let him blink and speak; while he speaks he holds still and looks the stranger in the eyes; the office around him is built from Rodin models too, each at its real size (the oak desk, the laptop, notebook, book, pen cup and plant on it, the back desk and its monitor, the shelf of binders, the fig tree, the lamp), in a plain room with a window.

Conversations are kept for seven days from their first message, in your own browser (`localStorage`) and in the
server's memory, then forgotten. A conversation left in progress is resumed on the next visit, and the book of diaries
returns to any other one still kept.

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

Content (profile, skills, projects, documents) lives in `src/config/*.config.ts`
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
