# 007 — A lighter gate, measured on a laptop GPU

**Date:** 2026-11-13 · **Taken by:** the owner (direction), the agent (choices)

The owner found the gate too heavy for how it looks. Measured on the owner's
machine (Radeon Vega 8, 1920×1080, a horde of 17): about 33 ms a frame on
medium and 21 ms on low, and high fell back to medium within seconds.

- **What cost the frame:** soft shadow filtering (about 8 ms; hard shadows
  cost next to nothing), six point lights through the metal-and-gloss
  material on every pixel of the hall (7–9 ms), the mist (2–3 ms).
- **Quality tiers now:** high keeps soft shadows, four torch lights and the
  full material. Medium and low use hard shadows (low had none before), matte
  stone without normal maps, two torch lights (medium) or one (low), and low
  drops the second mist sheet. Pixel ratio is capped at 1.5 / 1.25 / 1.
  Result: about 20 ms on medium, 12 ms on low, same scene.
- **Download:** models 5.9 MB → 3.5 MB. The knight keeps 35% of its
  triangles and the hunter 40%; Mixamo clips keep only bone rotations and the
  hips' travel; clips the game does not play no longer leave their keyframes
  in the file; the hunter ships no clips and plays the knight's; the hall's
  normal and roughness maps are 512.
- **Not done:** the hall's 2.2 MB is mostly colour textures; GPU texture
  compression (KTX2) would cut memory further and needs a transcoder shipped.
