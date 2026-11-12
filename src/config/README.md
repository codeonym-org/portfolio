# System Configuration

Everything the record displays lives here — edit these files to update the
portfolio without touching a single component. The scene, the windows, the
agent's grounding, `/record` and `/llms.txt` are all rendered from them.

| File                  | What it controls                                                        |
| --------------------- | ----------------------------------------------------------------------- |
| `world.config.ts`     | The six sectors (names, sections, tones), visitor quests + XP, boot and HUD copy, the System's greeting and suggestions, credits |
| `player.config.ts`    | Identity, level, rank, titles, stats, links, languages, profile, creed  |
| `quests.config.ts`    | Projects — each one is a dormant shard until ARISE wakes it             |
| `skills.config.ts`    | Skill sets, categories (sections of the Arsenal window), skills         |
| `inventory.config.ts` | Vault items, rarity tiers, lore; `unlocks` = `"cv"` or a sector id      |
| `chronicle.config.ts` | Experience timeline and education (Chronicle)                           |
| `system.config.ts`    | Version, vitals, error / 404 screen copy                                |
| `types.ts`            | Shared shapes — TypeScript will flag any invalid edit                   |

## Rules of the System

- Values are validated by the types in `types.ts` — if `pnpm build` passes,
  the UI cannot break from a config edit.
- Stat/mastery values are `0–100`. Quest ranks are `"S" | "A" | "B"`.
  Rarity is `"legendary" | "epic" | "rare" | "common"`.
- Every entry becomes one shard in orbit (`src/record/nodes.ts`); its `id` is
  what the agent, case files and shared links refer to, so changing an id
  breaks old `#case=` links that cite it (the entry is dropped from the case).
- Sector ids are fixed (`SectorId` in `types.ts`); each needs a shard of the
  same name in `public/models/record/shards.glb`.
- Icons are [lucide](https://lucide.dev/icons) components — import any icon
  at the top of the file and reference it.
