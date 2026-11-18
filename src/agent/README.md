# The portfolio's agent

Two LangChain agents, and both are **Ayoub**: they answer a stranger in the
first person, as he would in a job interview. Their rules:

- It answers only from the record and the interview file
  (`src/config/interview.config.ts`).
- What it does not answer here (a question with no answer on file, an opinion
  or plan the record does not state, anything binding: salary, start date,
  offer, contract) it never guesses or settles: it says it would rather discuss
  it directly and offers his business card in a window (`propose_action` →
  `show_business_card`); accepting hands the card over.
- Every offer is the agent's own judgement, and rare. The page never offers
  anything on its own: no greeting window, no scripted invitation.
- Asked sincerely whether the stranger is talking to a person, it never claims
  to be human. A line under the console says the answers are generated from
  the record.
- The local index, used when the model is unreachable, does not speak as him.

The two agents:

- **the text agent** (`system`): strangers type to it (the prompt at the
  bottom, **/** or **T** to focus it). It answers from Ayoub's record and
  answers *with the page*: it opens sections, inspects entries, hands over his
  card, and assembles a **case file** — a set of evidence picked from the
  record by id, each with one line on why it matters.
- **the voice agent** (`system-voice`): strangers **hold V** (or the mic
  button) and talk. It answers out loud, and its only tool hands work to the
  text agent in the background.

```
browser                                   server (one Next.js route)
───────                                   ─────────────────────────
CopilotKit v2 provider ── /api/copilotkit ─► CopilotRuntime (v2, single endpoint)
  useFrontendTool × record commands           └─ LangGraphAgent (@ag-ui/langgraph)
  useAgentContext (live page state)               └─ in-process client
  AgentBridge (headless useAgent)                     └─ createAgent (langchain)
    └─► session store ─► console, run trace               state: CopilotKitStateSchema
                                                           middleware: copilotkit →
                                                             history window → call
                                                             limit → retry
                                                           tools: consult_archive
                                                           model: OpenRouter
```

## What the visitor sees of a run

- **Run trace** (top left): every tool call by its real name, with its
  arguments and duration, as it happens. Nothing is staged — the rows are the
  agent's AG-UI messages (`agent-bridge.tsx`).
- **Beams**: a tool call that touches an entry sends a pulse from the Monolith
  to that entry's shard.
- **Case files** (`assemble_case`): validated against `record/case-file.ts`,
  entries that do not exist are dropped, and the result is written to the URL
  as `#case=<base64url>`, so a case can be shared and opens without the agent.
- **No link, no problem**: if the route is down, a run fails, ends without a
  reply or stalls for 25 s, the same message is answered by the local index
  (`local-brain.ts`, a keyword router over the same command registry). It can
  open anything; it cannot reason, and says so.
- **⌘K** runs the same commands by hand, and `window.system` exposes them to
  scripts (`system.snapshot()`, `system.run(name, args)`).

## Voice pipeline

```
hold V ─► MediaRecorder ─► runtime `transcribe` (OpenRouter STT, STT_MODEL_ID)
       ─► voice agent run ──────────── AG-UI stream ────────────┐
            delegate_task(task)                                  │
              ├─ dispatches CUSTOM "voice_task" {id, task} ──────┤──► browser task queue
              └─ returns an ACK at once — the voice keeps talking│      (one task at a time)
            text deltas ─► sentence chunker ─► /api/voice/speech │         │
                              (OpenRouter TTS, TTS_MODEL_ID) ─► speaker    ▼
                                                               text agent run
                                                               (record tools, "[VOICE TASK #n]")
                                                                           │
  voice agent run ◄── "[TASK REPORT] #n · DONE · result…" ◄────────────────┘
     └─► spoken outcome
```

- The voice agent's single tool never waits. Tasks queue in the browser
  because the text agent's record commands are frontend tools, so they run where
  the page is.
- A finished task comes back as a `[TASK REPORT]` message once the voice is
  free (not while the visitor is holding the key). Reports that pile up are
  sent as one message.
- Barge-in: pressing V while he speaks stops the audio, cancels the
  pending TTS requests and aborts the voice run. Queued tasks keep running.
- The voice agent runs on its AG-UI agent directly (`agent.runAgent`), and the
  text agent through `copilotkit.runAgent`. They never share CopilotKit's run
  loop.
- The reply is spoken sentence by sentence while it streams. The first chunk
  may break at a comma, so the first audio arrives sooner.
- In the interview, the text agent's replies to typed questions are spoken too,
  through the same chunker and speaker (not its runs for delegated tasks: the
  voice tells those). A switch in the interview sets his replies to text only.
- Before saying anything, the page asks whether the browser lets this tab play
  sound (`voice/sound-permission.ts`: the browser's autoplay policy where it has
  one, otherwise whether the stranger has pressed or typed on the page). If not,
  the reply stays in text and the stranger is told once; a refused play is
  caught the same way. Any press or key afterwards lets him speak again.

| File | Role |
| --- | --- |
| `voice/protocol.ts` | wire shapes between the agents (task event, task/report messages) |
| `voice/task-queue.ts` | sequential background task queue |
| `voice/speech-chunker.ts` | streamed text → speakable sentences |
| `voice/sound-permission.ts` | whether the browser lets the tab play sound |
| `server/voice-agent.ts` | the voice `createAgent` + `delegate_task` |
| `server/audio.ts` | OpenRouter STT (`TranscriptionService`) + TTS |
| `../app/api/voice/speech` | TTS route (mp3 stream) |
| `../components/agent/voice/` | recorder, speaker, orchestrator |

Pure modules have unit tests: `pnpm test`.

## Files

| File | Role |
| --- | --- |
| `system-commands.ts` | the command registry (zod) — frontend tools, ⌘K, `window.system.run` |
| `converse.ts` | the one way in: live agent when the link is up, local index when not |
| `local-brain.ts` | the local index: keyword router (EN/FR) over the command registry |
| `../record/case-file.ts` | case file schema, URL encoding, resolution against the record |
| `server/agent.ts` | the `createAgent` graph, system prompt, middleware |
| `server/dossier.ts` | grounding rendered from `src/config/*` (digest + archive) |
| `interview-grounding.ts` | the interview file (`src/config/interview.config.ts`) as grounding: each HR question, its answer and its state |
| `server/tools.ts` | backend tools (`consult_archive`) |
| `server/model.ts` | OpenRouter model + per-request model id |
| `server/checkpointer.ts` | MemorySaver capped to the 300 most recent threads, none kept past seven days |
| `retention.ts` | the retention period (seven days from the first message) and which threads a store must forget |
| `history.ts` | the conversations a browser keeps: what is saved, what is dropped, which one is resumed |
| `../store/history-store.ts` | those conversations in `localStorage`, and the thread in progress |
| `server/in-process-client.ts` | LangGraph SDK client served by the local graph |
| `server/system-agent.ts` | AG-UI agents (text + voice); route app context into CopilotKit state |
| `server/middleware.ts` | history window + app-context note (shared by both agents) |
| `server/rate-limit.ts` | per-IP sliding windows for the public routes |
| `reply-hygiene.ts` | what the console shows of a reply: leaked tool calls and degenerate tails cut |
| `next-step.ts`, `guide.ts` | what the stranger has not seen yet, and whether offers may still be made: context for the agent's own judgement |
| `../components/agent/` | provider, frontend tools, the bridge to the session store |
| `../store/session-store.ts` | turns, cards and the run trace the interface renders |

## Conversations and retention

Nothing is stored in a database. On the server a conversation lives in the process's memory: the runner's threads
(`InMemoryAgentRunner`) and the graphs' checkpoints (`BoundedMemorySaver`). Both are capped at 300 threads and both
forget a thread seven days after its first message (`retention.ts`; the runner is swept from the route, at most every
ten minutes). A serverless instance is recycled long before that, so the server's memory is a cache, not the record.

The record is the visitor's own browser: `store/history-store.ts` saves each conversation in `localStorage` under its
thread id (the turns shown, the text agent's AG-UI messages, what was said aloud) and drops it seven days after its
first message. The link (`components/agent/agent-bridge.tsx`) runs the agent under the current thread id and starts it
from the saved messages, and AG-UI sends the whole message list with every run, so a thread the server has forgotten
continues with its context. The voice agent starts over in a resumed conversation; the text agent holds what was said.
Only the interview (`/interview`) is kept this way. The home page talks in a thread of its own, held in memory for the
visit and never saved; going between the two pages switches threads, each found where it was left. On the home page,
the agent may offer a stranger who wants to go further its interview room (`propose_action` → `open_interview`), once a
visit, when it judges it fits.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPEN_ROUTER_API_KEY` | yes | OpenRouter key; without it the route answers 503 |
| `MODEL_ID` | no | OpenRouter model id for both agents, default `openai/gpt-oss-120b` (the voice agent uses low reasoning effort) |
| `STT_MODEL_ID` | no | OpenRouter speech-to-text model, default `openai/gpt-4o-mini-transcribe` (steady ~0.8 s, multilingual incl. Arabic, ~$0.0001 per utterance) |
| `TTS_MODEL_ID` | no | OpenRouter text-to-speech model, default `mistralai/voxtral-mini-tts-2603` (~1 s to first byte, mp3) |
| `TTS_VOICE` | no | voice id for the TTS model, default `gb_oliver_confident` (Voxtral voices: `en_paul_*`, `gb_oliver_*`, `gb_jane_*`, `fr_marie_*`) |
| `EDGE_CONFIG` | no | Vercel Edge Config connection string. When set, the `MODEL_ID` **item** in Edge Config overrides the env var. |
| `SITE_URL` | no | sent to OpenRouter as `HTTP-Referer` |
| `LANGSMITH_TRACING` | no | `true` traces every agent run to LangSmith (LangChain reads the `LANGSMITH_*` vars itself) |
| `LANGSMITH_API_KEY` | with tracing | LangSmith API key |
| `LANGSMITH_PROJECT` | no | LangSmith project the traces land in |
| `LANGSMITH_ENDPOINT` | no | LangSmith API URL, default `https://api.smith.langchain.com` (set the EU URL for EU workspaces) |

`.env.example` lists them all.

**Tracing.** Each run is one trace named after its agent (`system` or
`system-voice`), tagged with it, and carrying `thread_id` in its metadata, so
LangSmith's Threads view groups a visitor's conversation. A spoken turn shows
up as a `system-voice` trace, followed by the `system` trace for each
delegated task. The route flushes pending traces with `after()`, so they are
not lost when a Vercel function freezes. STT and TTS are direct OpenRouter
calls and are not traced (the audio would bloat the traces).

The model id is read on every request, never at build time. On Vercel:

- **no redeploy at all:** connect an Edge Config store to the project (this
  sets `EDGE_CONFIG`) and add an item `MODEL_ID`. Edits to it apply within
  about 30 s.
- **env var only:** Vercel applies a changed env var only to new deployments,
  so after editing `MODEL_ID` use *Redeploy*. It doesn't need a code change
  or a rebuild.

## Guards

It's a public endpoint that spends tokens, so the route:

- allows only `info` / `agent/run|connect|stop` / `transcribe`;
- rate-limits runs and transcriptions per IP (best effort, per instance), and
  TTS characters on `/api/voice/speech`;
- caps body size (and recordings at 4 MB / 30 s);
- caps each visitor message at 8 model calls (4 for the voice agent);
- keeps at most 300 conversations in memory per instance.

Set a credit limit on the OpenRouter key as the real backstop.
