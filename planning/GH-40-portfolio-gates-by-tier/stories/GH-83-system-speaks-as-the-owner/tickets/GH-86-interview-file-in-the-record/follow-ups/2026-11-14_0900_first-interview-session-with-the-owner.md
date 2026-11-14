---
status: open
from: agent
found-while: ticket GH-86 (the interview file), built without the owner (story decision 008)
resolved-by:
---

# Run the first interview session with the owner

`src/config/interview.config.ts` holds 8 answers drafted from the record (`from-record`) and 11 questions with no
answer (`open`). None is in the owner's own words yet.

What to do: grill him, one question at a time. For each `from-record` entry, read the draft and take his wording;
for each `open` entry, take his answer or his wish to leave it unanswered. Write the answer in his words, set
`status: "confirmed"`, and keep `binding: true` on salary, start date and contract. Remind him the repository is
public. Then close issue #86.
