# GH-72 — the System proposes: what was built (by the agent, 2026-11-13)

Decisions: story decision 004.

## What changed

- **Prompt** (`src/agent/server/agent.ts`): section NAMES (Ayoub; "Stranger" for the visitor); section THE
  VISITOR replaces THE HUNTER (answer first, then decide whether to propose; when to and when not to); a short
  FINAL CHECK before the dossier. The voice prompt (`voice-agent.ts`) and the dossier's name line follow.
- **Tool** `offer` → `propose_action` (`system-commands.ts`): refuses an action already proposed in this visit
  or already open; can propose `open_map`; records each proposal and its outcome.
- **Context** (`components/agent/system-tools.tsx`): `guide.mayPropose`, `guide.notSeenYet` (all of it),
  `guide.proposedThisVisit` (each with its outcome). `guide.suggestedNext` is gone.
- **Store** (`world-store.ts`): `offers.log`, `raiseOffer`, `settleOffer`, `ignore`; a prompt may have
  `onIgnore`. `noteOffer` is gone.
- **Window** (`system-dialog.tsx`, `shell.tsx`, `converse.ts`): "Accept" / "Not now", a cross, Escape ignores,
  a new message ignores, 40 s without an answer ignores.
- **Pure helpers** (`next-step.ts`): `unseenSteps`, `proposalKey` (two new tests, 59 in all).
- **Config:** `player.firstName`, `world.agent.visitor`, `world.prompts.refuse / offerKeys / offerHeading`;
  the greeting is headed "A STRANGER HAS ENTERED"; First Light's tagline no longer says "Hunter".
- **Local index** (`converse.ts`): invites on every other answer, never twice to the same step; uses "Ayoub".

## Checked (headless Chromium, production build)

- The window, with the command called directly: shown; Escape and the cross close it as ignored; the same
  proposal again is refused; two refusals stop further proposals; "what else should I see?" allows them again;
  accepting opens the CV.
- Four conversations of seven or eight questions with the live model. In the last one: two proposals in seven
  replies (the brief, then the projects), none repeated, "Ayoub" or "the Player" throughout, no "Hunter", the
  full name given as "Bouarour Ayoub" when asked.

## Known limits

- **The model does not always obey.** In the last run one reply of seven still ended with an invitation written
  in its text instead of a proposal, and one reply to "ok" was only a notice. The tool's rules (never twice,
  not what is open, the pause, the stop after two refusals) hold whatever the model does; the wording and the
  timing depend on the model.
- **Broken replies from the model were seen** in two of the four runs (an empty reply, replies made of dots).
  They came while a checklist with "…" examples stood at the very end of the prompt; with the checklist moved
  before the dossier and the "…" removed, the last run had none, but one reply still carried stray invisible
  characters. Whether the prompt or the provider caused them is not established. A stronger `MODEL_ID` is the
  likely remedy if they return.

## Not checked

Voice (the voice prompt changed: names only), French and Arabic conversations, real phones, Safari, Firefox.
