# Plain names: sectors, organisations and the stranger

## Problem

The record is named like a game: The Player, Chronicle, Shadows, Arsenal, Vault, The Gate; the owner's
organisations are "guilds"; the visitor is a hunter. A hiring person has to translate each word.

## Change

Rename what the stranger reads and hears (story decision 001): the sectors become Profile, Experience, Projects,
Skills, Documents and Contact; guilds become organisations; the visitor is the stranger. This covers the record's
config, the interface, the command palette, the local index, `/record`, `/llms.txt` and the docs. "The System", the
gates and the ranks keep their names. Behaviour does not change in this ticket: ARISE and the progress are removed
in the next one.

## Left to the ticket pass

- Whether the sector ids in code and in shared case links (`#case=…`) change, or only the labels.
- The plain wording of each title, stat and heading in the Profile window.
- What a visitor with saved state from before sees.

## Done when

- The index wheel, the windows, the palette and the agent's replies use the six plain sector names.
- "Guild", "hunter" and the old sector names appear nowhere on the page, in `/record` or in `/llms.txt`.
- A case link made before this ticket still opens.
- Lint, type check, tests and build pass.
