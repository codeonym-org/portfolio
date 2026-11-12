# 001: The design of the first gate and the catalog (taken by the agent, epic decision 009)

**Date:** 2026-11-12 (story pass, run by the agent alone; each point is the option the agent recommends)

1. **Which page is the first gate?** The owner's brief: "the iceberg (aka landing page, current one, optimized for
   resource, quick check, info providing)". **The first gate is the current living record**, kept light.
   *Not chosen:* a new page from scratch (throws away #39).
2. **Names.** The owner's image is an iceberg. The rank C gate is **"The Surface"** (`/gates/the-surface`); the
   rank S gate is **"The Deep"** (`/gates/the-deep`), sealed until story GH-44. *Not chosen:* "The Living Record"
   (names the content, which every gate shares, not the gate).
3. **`/` renders the default gate; it does not redirect.** Shared links, `#case=` links and search results keep
   working. `/gates/the-surface` renders the same gate and names `/` as its canonical address.
4. **Gate registry:** `src/config/gates.config.ts` — id, name, rank, state (`open` | `sealed`), tagline,
   description, what it holds, who it is for. The catalog, the routes, the agent and `/llms.txt` read it.
5. **The catalog `/gates`** is server-rendered with no WebGL, laid out like a console library: the selected gate
   large, the others as cards; a sealed gate shows a lock, its rank and what it will hold, and opens a sealed
   screen, not an error. Covers are drawn in CSS/SVG: no large images.
6. **Ways in:** a "Gates" button in the top bar, an entry in the ⌘K palette, an agent command `open_gates`, and a
   link on `/record`.
7. **"Too minimal" — what the Surface gains.** It stays light (hiring teams, phones). It gains a **brief**: who
   he is, the three guilds with his role, the ranked projects, the signature skills, contact and CV, readable in
   a minute without the agent. Extended 3D and gameplay go to The Deep. *Not chosen:* more 3D in the Surface
   (works against "optimized for resource").
8. **"Light on resources", in numbers:** the catalog and sealed pages ship no three.js; the Surface adds no new
   model or texture in this story.
9. **Tickets, in order:** (1) the gate registry, the catalog, the gate routes, the sealed screen and the ways in;
   (2) the brief in The Surface.

**For the owner to confirm later:** the two names, and whether the brief answers "too minimal" for this gate.
