# Implementation record (written after the build, 2026-11-12)

**Changed:** `src/config/{types,guilds.config,quests.config,player.config,inventory.config,skills.config}.ts`,
`src/config/README.md`, `src/record/{plain,nodes}.ts`, `src/app/record/page.tsx`, `src/agent/automation.ts`,
`src/agent/system-commands.ts`, `src/agent/server/{agent,dossier}.ts`, `src/components/agent/system-tools.tsx`,
`src/components/interface/{cards,inspect,sector-panels}.tsx`, tests, `public/cv.pdf`.

**Checked:** lint, `tsc --noEmit`, 43 tests, build. `/llms.txt` lists Guilds and ten projects with guild, date and
stage; `/cv.pdf` is the new file. Headless run (desktop 1440×900, phone 390×844): no page errors, ten shards,
all ten rise. Live agent: asked for the phone number it shows the contact card and writes no number; asked which
projects are open source it lists the seven codeonym-oss projects by guild.

**Not checked:** voice; real phones.
