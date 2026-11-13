# 005 — Erebus is the throne hall of the live record, and the rules know its walls

**Date:** 2026-11-13 · **Taken by:** the owner (direction), the agent (choices)

The owner rejected the cavern of decision 004 ("this world logic is broken,
redo it from scratch") and asked for a cave or a hall like the deployed
version, with Sung Jin-Woo as the player. This replaces the setting of
decisions 003 and 004 and the geometry of the simulation.

- **Setting:** the throne room the live record on `main` already uses
  (Throne Room by Uğur Yakışık, CC BY 4.0, trimmed by `hall.py`), repacked
  with meshopt and WebP (3.1 MB, no Draco decoder) as
  `public/models/erebus/hall.glb`. Restyled at runtime as on `main`: grey
  stone, a black carpet, stained glass lit by the moon, wall torches, two
  fire bowls, mist, one shadow-casting moon light, ambient occlusion on
  high quality. The cavern, its textures and its generated rock are removed.
- **The rules know the hall** (`src/erebus/hall.ts`, pure and tested): the
  floor is the nave and the apse, not a circle. Walls, the throne, the four
  pedestals, the fire bowls, the colossus and the obelisks are solid for the
  hunter, the enemies and the soldiers. Spawns, runes, echoes and beacons
  are put on free floor; a shot ends at a wall.
- **The floor is not flat** (sunken side floors, steps, the dais). The scene
  measures it once from the model and every body, marker and the camera
  stand on it (`floorAt`). The simulation stays flat.
- **Obelisks:** eleven, 4.4 high, in two ranks along the walls of the nave,
  the weakest nearest the door. A Warden comes up in the middle of the nave
  in front of its stone. Wardens and brutes are smaller (a hall, not a plain).
- **Enemies come up out of the floor** over 0.8 s and do nothing until they
  are up, instead of appearing.
- **The hunter comes in at the door,** facing the throne; the camera stays
  inside the walls and rises when a wall pushes it close.
- **Statues:** four stone knights on the hall's own pedestals, the colossus
  in the apse behind the throne.
- **Not done: Sung Jin-Woo as the player.** The agent does not put a
  character of an existing work into the game; the hunter stays the black
  iron knight, now with a lit outline. The owner decides what replaces it.
