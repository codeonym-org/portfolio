# 001: The design of the Gate Realm and the System's presence (taken by the agent, epic decision 009)

**Date:** 2026-11-12 (story pass, run by the agent alone). The owner's request, in his words: "the gate realm
(selector) should be an interstellar selector, gates are 3d spheres (planets) each has a unique design, there
will be 7 spheres in total (like solar system) the two shown spheres are the newbie planet (or more expressive
name) and the other planet (something scary, intimidating) for the newbie (home page), hunter is the visitor,
the recruiter, agent shall persuade him/her to see and read more on player! also the map should be interactive,
zooms in from globe to city, and opens up in a holographic overlay! system messages should be styled in a custom
system font and maybe shown in a system prompt (dialog); as for voice, there shall be a better animation on
screen like a beating heart, a pulse; the index shall be a roulette like design (appear when we hover on the
left side) like the GTA L1 click".

Each point below is a question the agent would have asked, the options, and the option taken.

## The Gate Realm

1. **What are the seven planets when only two gates exist?** *Options:* (a) seven named planets, five "coming
   soon" with invented themes; (b) two charted planets and five **uncharted** ones with no name and no promise.
   **Taken: (b).** Epic decision 007 keeps gates beyond the first two out of scope; naming five future gates
   would promise them. Uncharted planets are visible and each has its own look, but they are dim, are labelled
   "Uncharted", and open nothing. A new gate later "charts" one planet by adding one entry to the config.
2. **The two names.** The owner asked for an expressive name for the newbie planet and a frightening one for the
   other. *Options for the first:* Genesis, Dawnhold, **First Light**. *For the second:* The Maw, Nyx,
   **Erebus**. **Taken: "First Light"** (rank C: a small bright world, where a Hunter awakens) **and "Erebus"**
   (rank S: in Greek myth the primordial darkness; a black ocean world under a cracked crust). They replace
   "The Surface" and "The Deep" (story GH-42, decision 001). The routes become `/gates/first-light` and
   `/gates/erebus`; nothing is live on `main`, so no redirect is needed. The names live in one file
   (`src/config/gates.config.ts`); **the owner can change them there**.
   *Consequence for story GH-44:* its gate is now called Erebus. Its dive (handoff proposal) still fits: the
   visitor dives under Erebus's crust. See decision 002.
3. **How are the planets made?** *Options:* downloaded textures or models; **generated in code**. **Taken:
   generated** (shaders and simple geometry: noise for land and cloud, rings, moons, an atmosphere rim), as the
   Monolith is. No downloaded assets, a few kilobytes, and every planet differs by its parameters. The seven
   looks: First Light (pale blue-gold ocean world with an aurora), Erebus (black crust with glowing red cracks,
   a broken ring), and five uncharted: a banded gas giant, a ringed ice world, a lava world, a crystal world, a
   small dead moon-like world.
4. **Three.js on `/gates`.** Story GH-42 kept `/gates` free of three.js (0.9 MB instead of 2.8 MB). A 3D realm
   needs it. **Taken:** the page's text, links and details are rendered as HTML first (the list of gates is
   always in the page and works without WebGL); the 3D scene loads after, in its own chunk, and fades in. The
   home page shares the three.js chunk it already loads, and loads nothing new for the realm. Selection:
   arrow keys, click, tap, swipe; Enter opens. The details panel (name, rank, state, tagline, what it holds)
   stays HTML for screen readers. The old card shelf is removed; a slim planet list replaces it.

## The System's messages

5. **Which font, and where?** *Options:* Orbitron (very wide, hard to read in sentences), Chakra Petch,
   **Rajdhani** (squared, condensed, readable in sentences; SIL Open Font Licence). **Taken: Rajdhani**, hosted
   with the site through `next/font`. It is used for everything the System **announces**: notices, prompts,
   their headings and buttons. **The System's long answers stay in the serif** (Instrument Serif): they are
   reading text, sometimes in Arabic or French, and the serif is the page's identity. *Open for the owner:*
   say if the answers should also move to the System font.
6. **What is a "system prompt (dialog)"?** **Taken: two forms of one System window.** A *notice* is today's
   toast in the new frame; it closes by itself. A *prompt* is a centred dialog with a message and up to two
   actions; it is used when the System asks something ("Accept the one-minute brief?"). Rules: one prompt at a
   time; it never blocks (Escape, "Later" or a click outside closes it); it is a real dialog for screen
   readers; a prompt carries a **command from the existing command list**, never free code.

## The agent

7. **How does the agent persuade without becoming pushy or dishonest?** **Taken:** the prompt gains a "guide"
   duty: the Hunter is a visitor weighing the Player, often a recruiter; each answer ends with **one** next
   step chosen from what the visitor has not seen (the snapshot already lists visited sectors); the step can be
   shown as a System prompt through a new frontend tool `offer`. Limits written into the prompt and enforced in
   the page: one offer per reply; after two declined offers in a row, no more offers until the visitor asks;
   only facts from the record; gaps are named. The offline brain's answers get the same closing step.
   *Not chosen:* timed pop-ups that interrupt reading; a fixed sales script.

## The index, the voice and the map

8. **The wheel.** A **half wheel docked to the left edge**, six segments in a fan. It opens when the pointer
   enters a narrow zone on the left edge, or while a key is held (the key is chosen in the ticket pass, after
   reading the existing shortcuts), or from an edge tab on touch screens. While open, the scene behind dims
   slightly (the game's slow-motion feel) — no real slow motion. Pointing lights the sector's ring (already
   built: `setHovered`). It replaces the list on desktop; keys 1–6 stay; the segments are real buttons in a
   `nav`. *Not chosen:* a full circle in the centre of the screen (it would cover the Monolith and the answer).
9. **The pulse.** A pulse line (an ECG trace) on a 2D canvas across the bottom of the stage, plus the
   Monolith's heart glowing in time, both driven by the voice level the page already measures (`voiceLive`).
   Listening = the visitor's level, violet; thinking = a slow resting beat; speaking = the System's level,
   gold. The loop runs only while the voice is live. *Not chosen:* a literal heart icon (it reads as a "like").
10. **The map.** *Options for the city level:* (a) online map tiles; (b) stay at country level; (c) **ship the
    city's main roads as data**. **Taken: (c).** Story GH-43 decided no map service and no geolocation; that
    still holds. The globe is drawn in the scene's 3D engine from Natural Earth data (land, country borders,
    public domain). The city level draws Oujda's main roads from OpenStreetMap, fetched **once** by a script
    and stored in the repository, credited "© OpenStreetMap contributors" in the overlay. If that data cannot
    be fetched when the ticket is built, the city level shows the position, coordinates and range rings only,
    and a follow-up is recorded. The overlay is its own chunk, loaded when first opened. The visitor is never
    located: their side is shown only as "your clock" (the time difference), as today.

## Order and shared rules

11. **Tickets, in order:** GH-58 the Gate Realm; GH-59 the System font and dialog; GH-60 the System persuades
    (needs GH-59's prompt); GH-61 the index wheel; GH-62 the voice pulse; GH-63 the holographic map.
12. **Rules every ticket keeps:** the home page must not load slower (new 3D and map code in lazy chunks);
    everything works by keyboard and on a phone; "reduce motion" is respected; no new runtime service and no
    new secret; copy lives in `src/config`.
