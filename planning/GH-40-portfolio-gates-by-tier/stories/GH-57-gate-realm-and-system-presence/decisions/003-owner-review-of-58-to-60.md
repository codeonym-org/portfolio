# 003 — the owner's review of tickets 58 to 60 (2026-11-12)

**Status:** taken by the agent (epic decision 009) from the owner's feedback. Revises decision 001, points 5 and 6.

## What the owner said

After seeing the page (screenshot of an answer with an offer open): "notice how the window prompt appears! also
the text is not custom font i mentioned earlier! ALSO the 3d object and the text are corrupting each other! maybe
add some zoom outs / zoom in, camera view (free movements) and when agent replies we zoom out, or something idk,
you pick and dont forget the wheel".

## What was found

1. **The prompt appeared without its window** (no background, no border, no System font). Cause: not the code.
   The agent's check builds wrote into `.next` while the owner's `next dev` was running, and the dev server kept
   serving a stylesheet from before ticket 59. Fixed in ticket 61: check builds go to `.next-verify`
   (`NEXT_DIST_DIR`). The owner's dev server needs one restart.
2. **The answers were in the serif face.** Decision 001 point 5 kept answers serif and left it as an open
   question for the owner. The owner has now answered it.
3. **The answer printed over the Monolith.** The scene was framed for the three-line greeting only.

## Decisions

1. **The System's answers use the System font (Rajdhani)**, weight 500, bold 700. Sector names in the scene stay
   serif: they are places, not the System speaking. Revises 001 point 5.
2. **The stage reads the console.** The console reports how many pixels of the bottom of the screen its words
   take. The camera pulls back (up to 1.55×) and the scene lifts so the Monolith sits in the middle of the free
   area above the words. So when the System replies, the view zooms out by as much as the reply needs. Chosen over
   a fixed "zoom out on reply" because a short reply should not move the camera much.
3. **A scrim behind the words**: the bottom of the scene fades to the void under the text, so orbiting shards and
   labels never print through it.
4. **A camera for the visitor:** drag left/right spins (as before), drag up/down tilts, wheel or pinch zooms,
   double click resets. A new answer takes the camera back from a close-up (zoom below 1 returns to 1).
5. **One new ticket, GH-68**, built right after the wheel (61) and before the voice pulse (62).
