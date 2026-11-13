# 001 — Erebus is rank B: a world to play, piloted by the System (2026-11-13)

**Status:** taken by the agent (epic decision 009) from the owner's brief. Replaces the "dive" proposal that
`planning/HANDOFF.md` carried (never recorded as a decision).

## What the owner said

"now lets build the B rank gate (previously we said it was the S tier, but lets make it B, we are challenging
ourselves so in future we need to build something even BETTER), build the game like 3d world with playable sung
jin woo player! add rewarding system ... localstorage for creating and storing user profile, etc .... the take is
this is unconventional game, it's piloted by agent and interactive! be unpredicted"

## Decisions

1. **Rank B.** Erebus is a rank B gate, so ranks A and S stay free for later gates. The story folder keeps its
   old name (`GH-44-deep-s-tier-gate`); only the rank and the texts change.
2. **The hunter is an original character.** Sung Jin-Woo belongs to Solo Leveling's authors: the game does not
   use his name or his likeness. The visitor plays a hooded hunter they name themselves, in the same genre
   (levels, a System, shadows that rise). The owner can restyle it later.
3. **The world is the record.** A black plateau on Erebus. Ayoub's ten projects stand on it as sealed obelisks,
   each held by a Warden whose strength follows the project's rank. Beating a Warden lets the visitor say ARISE:
   the project joins them as a shadow soldier that fights beside them, and its real text opens in the codex.
   Ayoub's strongest job skills lie around as runes: picking one up gives a small permanent bonus and its entry.
   So every reward is a piece of the record, read at the moment it was earned.
4. **The System pilots the game.** There are no fixed levels. The game reports events (entered, quest done,
   level up, Warden down, low health, standing still, died, the visitor spoke) to a director. The director
   answers with one line of speech and up to three actions from a fixed list: spawn, quest, twist (blackout,
   slow time, frenzy, giants, mirrored controls, tremors, calm, a rain of echoes), gift, bargain (a System window:
   accept or refuse a price), reveal an obelisk, grant a title it invents for this visitor.
   - The director is the model (the same model and persona as the System, epic decision 004), asked through
     `POST /api/erebus/director` and answering with JSON that the browser validates and clamps.
   - A **local director** (seeded random, no network) answers when the model is absent, slow, over budget or
     returns something invalid, and for small events. The game is fully playable with no model key.
   - The visitor can speak to the System (T): it answers in one line and may change the world in reply.
5. **A profile in local storage** (`codeonym-erebus-v1`): name, level, XP, hunter rank E to S, stat points and
   four stats, shadows, runes, titles, counters, the daily trial and its streak. It is created on first entry.
6. **Shared progress (epic decision 006):** XP earned on First Light is added once when the profile is created,
   and a project already risen on First Light arrives as a shadow soldier from the first minute.
7. **First Light stays light.** Erebus is its own lazily loaded chunk; nothing it needs is imported by the
   First Light gate. No new model or texture files: the world, the hunter and the enemies are built from
   primitives and shaders.
8. **Controls.** Keyboard and mouse (WASD, drag to turn the camera, click or J to strike, Shift to dash, R for
   the burst, E to interact, F for ARISE, C for the codex, T to speak), and on touch a stick and buttons.

## Tickets, in order

1. The world, the hunter and combat; the profile; the local director; the gate opens as rank B.
2. The model as director: the route, the prompt, the budget, speaking to the System, bargains.
3. Rewards on screen: the codex, stats, titles, the daily trial, the hunter card.

## Not in this story

Multiplayer, a server-side profile, leaderboards, voice inside Erebus, new model files or music.
