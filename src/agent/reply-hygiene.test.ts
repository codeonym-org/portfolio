import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanReply, withDisclosure, withoutDegenerateTail, withoutRepeatedDisclosure } from "./reply-hygiene.ts";

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

test("the first reply is disclosed even when the model forgot", () => {
  assert.equal(withDisclosure("After my notice period.", "Ayoub"), "I'm Ayoub's AI replica, and I answer as he would. After my notice period.");
  assert.equal(withDisclosure("Je suis la réplique IA d'Ayoub. Bonjour.", "Ayoub"), "Je suis la réplique IA d'Ayoub. Bonjour.");
  assert.equal(withDisclosure("", "Ayoub"), "");
});

test("other leak shapes seen live are cleaned too", () => {
  assert.equal(cleanReply("I am based in Oujda, Morocco. show_map<|constrain|>json<|message|>{}"), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply("I am based in Oujda, Morocco. [show_map]"), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply("I am based in Oujda, Morocco.\n\nshow_map"), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply('I am based in Oujda, Morocco. { "tools": [, ] }'), "I am based in Oujda, Morocco.");
  assert.equal(cleanReply('{ "response": "I\'m Ayoub\'s AI replica.\\nAfter my notice period." }'), "I'm Ayoub's AI replica.\nAfter my notice period.");
  // still streaming in: no closing quote yet
  assert.equal(cleanReply('{ "response": "After my notice'), "After my notice");
  assert.equal(cleanReply("Done.<|return|>"), "Done.");
  // a bracket that is not a tool name stays
  assert.equal(cleanReply("See [the brief] first."), "See [the brief] first.");
});

test("a later reply does not repeat the disclosure", () => {
  assert.equal(withoutRepeatedDisclosure("I'm Ayoub's AI replica, and I answer as he would. I am based in Oujda."), "I am based in Oujda.");
  assert.equal(withoutRepeatedDisclosure("Je suis la réplique IA d'Ayoub. Je vis à Oujda."), "Je vis à Oujda.");
  assert.equal(withoutRepeatedDisclosure("I am based in Oujda. I built a replica of the catalog."), "I am based in Oujda. I built a replica of the catalog.");
});

test("a call opened like a tag is cut with everything after it", () => {
  assert.equal(cleanReply('Shall I show you a map? <proposeaction{ "message":"Shall I show you a map?", "a'), "Shall I show you a map?");
});
