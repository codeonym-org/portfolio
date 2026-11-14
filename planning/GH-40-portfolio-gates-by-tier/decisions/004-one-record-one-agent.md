# 004: All gates share one record and one agent; a gate brings its own presentation

**Date:** 2026-11-12 (grilling, Q4; agreed: "ok" to the recommended option)

**Question:** what do all gates share?

**Decision:** **one record (`src/config`) and one agent (THE SYSTEM, same grounding), shared by every gate.** A
gate decides how the record is presented and which actions the agent can perform there. A change to the record is
made once and shows in every gate.

- **Why:** a single source of truth about the owner; the agent already takes its actions from the page it runs on
  (frontend tools), so a gate supplying its own actions needs no second agent.
- **Not chosen:** a separate agent per gate (several prompts to keep honest and in sync, a different "System" in
  each gate); nothing shared (every CV change repeated per gate, gates drift apart).
