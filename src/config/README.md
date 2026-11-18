# The content

Everything the record displays lives here — edit these files to update the
portfolio without touching a single component. The scene, the windows, the
agent's grounding, `/record` and `/llms.txt` are all rendered from them.

| File                  | What it controls                                                        |
| --------------------- | ----------------------------------------------------------------------- |
| `world.config.ts`     | The six sectors (names, sections, tones), boot and HUD copy, the agent's greeting and suggestions, credits |
| `owner.config.ts`    | Identity, what he is known for, strengths, links, languages, profile     |
| `projects.config.ts`    | Projects — each one is a lit shard near the Monolith; each names its organisation |
| `organizations.config.ts`    | The organisations he works in and the role held in each                 |
| `skills.config.ts`    | Skill sets, categories (sections of the Skills window), skills          |
| `documents.config.ts` | Documents, degrees and interests; `unlocks` = `"cv"` or a sector id      |
| `timeline.config.ts` | Experience timeline and education                                       |
| `interview.config.ts` | His answers to common HR questions, for the agent; filled by grilling sessions with him |
| `system.config.ts`    | Site settings: version, error and 404 screen copy                       |
| `types.ts`            | Shared shapes — TypeScript will flag any invalid edit                   |

## Rules

- Values are validated by the types in `types.ts` — if `pnpm build` passes,
  the UI cannot break from a config edit.
- Stat and mastery values are `0–100`. Project tiers are `"flagship" | "major" | "minor"`.
  Emphasis is `"highlight" | "strong" | "standard" | "quiet"`.
- Every entry becomes one shard in orbit (`src/record/nodes.ts`); its `id` is
  what the agent, case files and shared links refer to, so changing an id
  breaks old `#case=` links that cite it (the entry is dropped from the case).
- Sector ids are fixed (`SectorId` in `types.ts`); each needs a shard of the
  same name in `public/models/record/shards.glb`.
- Icons are [lucide](https://lucide.dev/icons) components — import any icon
  at the top of the file and reference it.
