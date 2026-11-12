# Gates — the portfolio as tiers, from a fast C-tier gate to a deep S-tier gate

## Goal

The portfolio becomes a set of **gates**. A gate is one way to enter the same record: it has a name, a rank and
its own page. Hiring teams get a fast, light gate that answers their questions quickly. Visitors who want more get
a deep gate with full gameplay.

## Why now

The redesign in #39 ("the living record") is fast and agent-driven, but the owner finds it too minimal: most of
the interface and 3D elements are gone. One page cannot be both the quick check for a recruiter and the full
experience. The record is also out of date: it still lists academic projects and misses the open-source work.

## How gates work

- `/` opens the default gate directly, with no choice to make (decision 002).
- `/gates` is the catalog of gates, like a console game library. Each gate lives at `/gates/<gate-name>`. A gate
  that is not built yet shows as a sealed card (decision 003).
- Rank is an attribute of a gate; several gates may share a rank (decision 002).
- All gates share one record (`src/config`) and one agent. A gate brings its own presentation and its own actions
  (decision 004).
- A visitor has one progress (XP, level, risen shadows), kept in the browser and shared by every gate
  (decision 006).

## Stories, in order (decision 005)

1. **Refresh the record** — open-source and guild work in, academic projects out.
2. **The first gate (rank C) and the gates catalog** — the gate hiring teams see; this is where the "too
   minimal" feedback is answered.
3. **Live data for the System** — GitHub read access and a map the agent can show.
4. **The Deep S-tier gate** — full gameplay, extended 3D, rewards. Planned in detail later.

## Not part of this epic (decision 007)

- Accounts and a server database: no sign-in, progress stays in the browser.
- Gates beyond the first two.
- Writing to GitHub: access is read-only, public data only.
- A CMS or admin page: the record changes by pull request.
