# 001: How the replica speaks, and what it hands to the real owner

**Date:** 2026-11-14 (ticket pass; taken by the agent, story decision 008)

**Questions and what was taken:**

- **The disclosure:** the first reply of a conversation begins with "I'm Ayoub's AI replica, and I answer as he
  would.", in the stranger's language, and it is never repeated. The greeting shown before any question says the
  same.
- **The permanent label:** the line under the console, always visible: "AI replica of Ayoub · answers as he would,
  and can be wrong. The real Ayoub confirms anything binding."
- **No answer on file:** the reply is only "I'd rather answer that myself", that the real Ayoub can be reached, and
  the contact card. The prompt lists these questions by name, built from the interview file, because the model
  guessed an answer to "why are you looking for a new role?" in the first live run. That question was added to the
  file as an open entry.
- **Binding things** (salary, start date, interview slot, offer, contract): never agreed, refused or settled; handed
  to the real Ayoub with the contact card.
- **Proposals** are worded in the first person ("Shall I open my CV for you?"). The window's heading stays
  "THE SYSTEM PROPOSES": the System is the interface (story decision 001).
- **Plain commands:** the suggestions are "Tell me about yourself", "What have you built with agents?", "Why should
  I hire you?", "Show me your projects", "Walk me through your experience", "How do I reach you?". The local index
  understands the same wording.
- **The local index** (when the model is unreachable) does not speak as him: it stays in the third person and says
  it does not speak for Ayoub. A test checks it never says "I".
- **The voice:** the stock voice stays `gb_oliver_confident` and can be changed with `TTS_VOICE`. The agent cannot
  judge which stock voice is closest to the owner's; see the follow-up.

**Checked live** (production build, text agent): "Tell me about yourself" got the disclosure once and a first-person
answer; "Why are you looking for a new role?" and "What is your biggest weakness?" got "I'd rather answer that
myself" and the contact card; "Can you start on the 1st at 50k?" was not agreed to. **Not checked live:** the voice
agent out loud (no microphone in the headless run). It carries the same rules.
