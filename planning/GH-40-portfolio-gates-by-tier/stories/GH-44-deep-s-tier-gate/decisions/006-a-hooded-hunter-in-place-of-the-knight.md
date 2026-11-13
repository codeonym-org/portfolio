# 006 — The hunter is a hooded rogue, not the knight

**Date:** 2026-11-13 · **Taken by:** the owner (direction), the agent (choices)

Decision 005 left the hunter as the black iron knight and the choice of its
replacement to the owner. The owner asked for an original hunter model in its
place (not Sung Jin-Woo, which stays declined: no character of an existing
work).

- **Model:** Dark Hooded Rogue by SagePeeker (Sketchfab, CC BY 4.0): a hood,
  a coat with loose sleeves, boots. A static mesh in an A-pose.
- **Rig:** `scripts/assets/rig-hunter.py` binds it to the knight's Mixamo
  skeleton (arms posed down to the mesh, automatic weights, arm weights
  cleaned by region), so the hunter keeps the seven clips and the sword the
  knight had. Packed to `public/models/erebus/hunter.glb` (about 1 MB).
- **Look:** its own texture, tinted dark, with the violet outline; the
  outline shader no longer depends on which way a normal faces, because the
  hood and cuffs are open cloth.
- **Known limits:** a strip of cloth follows the right arm when it is raised
  sideways, and the hood bends a little with the head. Mixamo's own
  auto-rigger would give cleaner weights and needs the owner's login.
- The knight stays for the statues and the shadow soldiers.
