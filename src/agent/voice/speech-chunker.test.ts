import { test } from "node:test";
import assert from "node:assert/strict";
import { createSpeechChunker, speakable } from "./speech-chunker.ts";

const feed = (deltas: string[]) => {
  const chunker = createSpeechChunker();
  const out: string[] = [];
  for (const d of deltas) out.push(...chunker.push(d));
  out.push(...chunker.flush());
  return out;
};

test("emits each sentence as soon as it is complete", () => {
  const chunker = createSpeechChunker();
  assert.deepEqual(chunker.push("The section holds my projects. The ar"), ["The section holds my projects."]);
  assert.deepEqual(chunker.push("mory holds his skills! Anything"), ["The armory holds his skills!"]);
  assert.deepEqual(chunker.flush(), ["Anything"]);
});

test("streams token by token", () => {
  const text = "Understood, sure. I have sent the order to the archive. It will report back shortly.";
  assert.deepEqual(feed([...text]), [
    "Understood, sure.",
    "I have sent the order to the archive.",
    "It will report back shortly.",
  ]);
});

test("keeps short fragments with the next sentence", () => {
  assert.deepEqual(feed(["Yes. ", "The Contact section lists every channel."]), ["Yes. The Contact section lists every channel."]);
});

test("does not split decimals or common abbreviations", () => {
  assert.deepEqual(feed(["Version 3.5 ships agents, e.g. the agent itself. Done here."]), [
    "Version 3.5 ships agents, e.g. the agent itself.",
    "Done here.",
  ]);
});

test("splits on newlines and non-latin sentence ends", () => {
  assert.deepEqual(feed(["مرحبا أيها الصياد، كيف حالك؟ ", "النظام في الخدمة."]), ["مرحبا أيها الصياد، كيف حالك؟", "النظام في الخدمة."]);
  assert.deepEqual(feed(["First line without a stop\nSecond line without one"]), ["First line without a stop", "Second line without one"]);
});

test("breaks a run-on sentence at a comma before it grows too long", () => {
  const long = `${"word ".repeat(40)}, and then ${"more ".repeat(20)}`;
  const out = feed([long]);
  assert.ok(out.length >= 2, "split into several chunks");
  for (const c of out) assert.ok(c.length <= 260, `chunk too long: ${c.length}`);
});

test("speakable strips markdown, links, brackets and emoji", () => {
  assert.equal(speakable("**Bold** and `code` — see [GitHub](https://github.com/x) 🚀"), "Bold and code — see GitHub");
  assert.equal(speakable("[ ON SCREEN ] Walking now."), "ON SCREEN. Walking now.");
  assert.equal(speakable("- first item"), "first item");
  assert.equal(speakable("### "), "");
});

test("speakable drops leaked model control tokens but keeps comparisons", () => {
  assert.equal(speakable("Opening the projects now, sure.<return"), "Opening the projects now, sure.");
  assert.equal(speakable("Done.<|return|>"), "Done.");
  assert.equal(speakable("Rank A < rank S."), "Rank A < rank S.");
});

test("drops chunks with nothing to say", () => {
  assert.deepEqual(feed(["... ", "— ", "\n\n"]), []);
});

test("the first chunk breaks early at a comma so the voice starts sooner", () => {
  const chunker = createSpeechChunker();
  const first = chunker.push(
    "Indeed, the flagship project is the multi-agent pharmaceutical catalog, a system that automates extraction and decision support",
  );
  assert.equal(first.length, 1);
  assert.match(first[0], /,$/);
  assert.ok(first[0].length >= 40 && first[0].length <= 100, `first chunk length ${first[0].length}`);
  // later sentences wait for their full stop
  assert.deepEqual(chunker.push(" using LangChain, a knowledge graph, and retrieval over the raw catalog data"), []);
});

test("splits sentences glued together without a space", () => {
  assert.deepEqual(feed(["Its details are in the projects view.Then, the project is open. Next up."]), [
    "Its details are in the projects view.",
    "Then, the project is open.",
    "Next up.",
  ]);
  // but not initials or versions
  assert.deepEqual(feed(["Built with Node.JS and v3.5 in the U.S. today."]), ["Built with Node.JS and v3.5 in the U.S. today."]);
});
