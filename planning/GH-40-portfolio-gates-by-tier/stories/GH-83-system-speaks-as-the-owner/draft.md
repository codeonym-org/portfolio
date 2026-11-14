# The System speaks as the owner: his replica answers a stranger, without the Solo Leveling persona

## Problem

The portfolio borrows a Solo Leveling persona. Projects are "shadows" the visitor must "ARISE", the visitor is a
hunter with XP, levels and quests, and the agent is a narrator that talks about "the Player". A hiring person has
to learn that vocabulary before getting a straight answer, and never feels they are talking to the owner.

## Change

The dark theme and the System stay. The persona goes, and the agent becomes the owner's replica.

- **A plain record** (decision 001). Sectors are Profile, Experience, Projects, Skills, Documents and Contact;
  "guilds" are organisations; the visitor is the **stranger**. Gates and ranks stay as navigation.
- **No game over the interview** (decisions 004 and 005). No ARISE, XP, levels, quests or sync percentage. Every
  project is lit when the page loads. The site only remembers what the stranger has opened, so the agent can
  suggest what they have not seen.
- **The replica** (decisions 002 and 003). The agent says once that it is Ayoub's replica, then answers in the
  first person, as in an HR interview. It answers from the record and from an **interview file**: the owner's own
  answers to common HR questions, tracked in git and refreshed by grilling sessions. It never invents, and it never
  agrees to anything binding; for that it sends the stranger to the real Ayoub.
- **Plain commands.** "Show me your projects", "walk me through your experience", in place of the raise commands.
- **A hologram for the chosen project** (decision 005): a holographic display and an aura.
- **Voice** (decision 006): the current pipeline with the closest stock voice. A clone of the owner's voice is a
  follow-up, not part of this story.

## Rules every ticket keeps

- Nothing the stranger reads or hears uses: arise, shadow, hunter, player, quest, level, XP, guild.
- The agent states only what the record and the interview file hold.
- The repository is public: the interview file holds nothing the owner would not publish.
- The home page does not load slower than before this story.
- The Gate Realm, the map, the run trace and the voice keep working.

## Tickets, in the order they ship (decision 007)

1. **Plain names.** Sectors, organisations and "stranger" in the record, the interface and the docs.
2. **No arise, no progress.** Projects lit on load; ARISE, XP, levels, quests and the sync percentage removed.
3. **The interview file.** A tracked part of the record, filled by a first grilling session with the owner.
4. **The replica.** The text and voice agents speak as the owner, with plain commands and the closest stock voice.
5. **The hologram.** The chosen project as a holographic display with an aura.

## Not part of this story

- A clone of the owner's voice (follow-up).
- What the Erebus planet in the Gate Realm becomes, now that its world is dropped (story GH-44, decision 001).
- New content in the record itself (jobs, projects, skills).

## Done when

- A stranger who opens the site and asks "tell me about yourself" is told once that this is Ayoub's replica, then
  gets a first-person answer from the record.
- "Why are you looking for a new role?" is answered from the interview file; "can you start on the 1st at 50k?" is
  handed to the real Ayoub with the contact card.
- A search of what the site shows and says finds none of the words listed in the rules.
- Every project is lit on load, and the chosen one shows its hologram and aura.
- Lint, type check, tests and build pass.
