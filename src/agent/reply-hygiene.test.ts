import assert from "node:assert/strict";
import { test } from "node:test";
import { besideAnOffer, cleanReply, joinPieces, withoutDegenerateTail, withoutPreamble, withoutTrailingQuestion } from "./reply-hygiene.ts";

test("a degenerate tail is cut, and a leftover fragment dropped", () => {
  assert.equal(withoutDegenerateTail("I will \u200b … \u200b … ... ... … …"), "");
  assert.equal(withoutDegenerateTail("I can start after my notice period. … … ... …"), "I can start after my notice period.");
});

test("ordinary text is unchanged, a single ellipsis included", () => {
  const text = "Well… it depends on the role. Ask me more.";
  assert.equal(withoutDegenerateTail(text), text);
  assert.equal(withoutDegenerateTail("Done"), "Done");
});

test("a tool call written as text is never shown", () => {
  const leaked = 'I have opened the projects. --- { "tool": "propose_action", "arguments": { "message": "Open AiCA?", "kind": "quest" } }';
  assert.equal(cleanReply(leaked), "I have opened the projects.");
  assert.equal(cleanReply('I am based in Oujda. --- { "tool": "show_map", "arguments": {} }'), "I am based in Oujda.");
  assert.equal(cleanReply('I am based in Oujda. proposeaction({"message":"Shall I show you a map?","action":"openmap"})'), "I am based in Oujda.");
  assert.equal(cleanReply("Braces in prose {like this} stay."), "Braces in prose {like this} stay.");
});


test("other leak shapes seen live are cleaned too", () => {
  assert.equal(cleanReply("I am based in Oujda, Morocco. show_map<|constrain|>json<|message|>{}"), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply("I am based in Oujda, Morocco. [show_map]"), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply("I am based in Oujda, Morocco.\n\nshow_map"), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply('I am based in Oujda, Morocco. { "tools": [, ] }'), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply('{ "response": "I\'m Ayoub.\\nAfter my notice period." }'), "I'm Ayoub.\nAfter my notice period.");
  // still streaming in: no closing quote yet
  assert.equal(cleanReply('{ "response": "After my notice'), "After my notice");
  assert.equal(cleanReply("Done.<|return|>"), "Done.");
  // a bracket that is not a tool name stays
  assert.equal(cleanReply("See [the brief] first."), "See [the brief] first.");
});


test("a call opened like a tag is cut with everything after it", () => {
  assert.equal(cleanReply('Shall I show you a map? <proposeaction{ "message":"Shall I show you a map?", "a'), "Shall I show you a map?");
});

test("an unfinished fragment written before a tool call is dropped, a sentence is kept", () => {
  assert.equal(withoutPreamble("I will the the ..."), "");
  assert.equal(withoutPreamble("Let me open"), "");
  assert.equal(withoutPreamble("Opening my projects now."), "Opening my projects now.");
  assert.equal(withoutPreamble("I would rather discuss that with you directly."), "I would rather discuss that with you directly.");
});

test("a reply with an offer window does not ask the question again", () => {
  assert.equal(withoutTrailingQuestion("That one I'd rather discuss with you directly. Shall I give you my card?"), "That one I'd rather discuss with you directly.");
  assert.equal(withoutTrailingQuestion("I'd prefer to discuss it directly. Shall ?"), "I'd prefer to discuss it directly.");
  assert.equal(withoutTrailingQuestion("I am based in Oujda."), "I am based in Oujda.");
  // nothing would be left: kept as it is
  assert.equal(withoutTrailingQuestion("Shall I give you my card?"), "Shall I give you my card?");
});

test("what is said again after a tool call is shown once", () => {
  const said = "These answers are generated from my record. That one I’d rather discuss with you directly.";
  assert.equal(joinPieces(said, "These answers are generated from my record. That one I'd rather discuss with you directly."), said);
  assert.equal(joinPieces("I am based in Oujda.", "I am based in Oujda. It is 3 pm here."), "I am based in Oujda. It is 3 pm here.");
  assert.equal(joinPieces("Opening my projects.", "AiCA is the one to read first."), "Opening my projects.\n\nAiCA is the one to read first.");
  assert.equal(joinPieces("", "Done."), "Done.");
});

test("broken words beside an offer give way to the statement in the offer", () => {
  const offer = "That one I'd rather discuss with you directly. Shall I give you my card?";
  assert.equal(besideAnOffer(cleanReply("I’m \u200b \u200b \u200b ?"), offer), "That one I'd rather discuss with you directly.");
  assert.equal(besideAnOffer("I'd rather discuss salary with you directly. Shall I?", offer), "I'd rather discuss salary with you directly.");
  assert.equal(besideAnOffer("", offer), "That one I'd rather discuss with you directly.");
  // an offer worded as a statement stands in as it is
  assert.equal(besideAnOffer("I … … This ... The", "You might also explore my experience timeline."), "You might also explore my experience timeline.");
  // words that are whole stay
  assert.equal(besideAnOffer("Salary is something I discuss directly.", offer), "Salary is something I discuss directly.");
});
