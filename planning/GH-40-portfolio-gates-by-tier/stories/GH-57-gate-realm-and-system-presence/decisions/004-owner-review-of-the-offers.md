# 004 — the owner's review of the offers (2026-11-13)

**Status:** taken by the agent (epic decision 009) from the owner's feedback. Revises decision 001 (the System
persuades: "one next step per answer") and ticket GH-60.

## What the owner said

With a screenshot of "THE SYSTEM OFFERS: His strongest work is Multi-Agent Pharmaceutical Catalog System. Shall I
open it?" at SYNC 100%: "the suggestion system is broken! it always returns the same window! I need to make it
more intelligent: after each agent invocation the agent decides whether to PROPOSE an ACTION to the user; the
user accepts / ignores / refuses. Proposals are not always shown, just when the agent decides. Also refine the
instructions of the agent, and tell him to call me by my name Ayoub (Bouarour is a bit unfamiliar and seems
generic), the agent is my companion so naturally he addresses me Ayoub, or Player Ayoub; and he should not call
the visitor by the term Hunter (sounds ridiculous), maybe foreigner? something more distant?"

## What was found

1. The prompt told the System to end **every** reply with a next step.
2. The System was handed **one** fixed suggestion (`guide.suggestedNext`): the first unseen step in a fixed
   order. The strongest project stays "unseen" until the visitor inspects it in this visit, so it came back on
   every reply, even at SYNC 100%.
3. Nothing recorded what had already been proposed.
4. A proposal had two outcomes only; closing it counted as a refusal.

## Decisions

1. **The System decides.** After answering, it judges whether one action follows from the exchange. No proposal
   is a normal outcome. The prompt says when to propose and when not to.
2. **A menu, not an order.** The System receives everything left to see (`guide.notSeenYet`) and what it already
   proposed with each outcome (`guide.proposedThisVisit`).
3. **Never twice.** The same action with the same arguments is refused by the tool for the rest of the visit,
   whatever the model does. So is something already open.
4. **Three outcomes:** accepted; refused ("Not now", N); ignored (Escape, the cross, sending a new message, a
   new proposal, or 40 s without an answer). Only refusals count toward "two in a row stop the proposals".
5. **A proposal lives only in the window.** The reply's text does not end with an invitation.
6. **The tool is renamed `propose_action`**, the window is headed "THE SYSTEM PROPOSES", and the map
   (`open_map`) can be proposed. The time between two proposals goes from 45 s to 20 s.
7. **Names.** The System calls the owner "Ayoub", "Player Ayoub" or "the Player" (`player.firstName`); the full
   name, written "Bouarour Ayoub", only when asked. Page titles and metadata keep the full name.
8. **The visitor is "Stranger"**, used rarely (`world.agent.visitor`, one word to change). The owner proposed
   "foreigner"; "Stranger" keeps the same distance and reads better in English. "Hunter" stays only for the
   Player's own things (the Hunter's License, his Hunter rank). Open for the owner.
9. **Without a model** (the local index) there is no judgement: it invites on every other answer and never
   twice to the same thing.
