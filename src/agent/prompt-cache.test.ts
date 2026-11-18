import { test } from "node:test";
import assert from "node:assert/strict";
import { cachedSystemBlocks, cachesPrompt, markedContent } from "./prompt-cache.ts";

test("the fixed prompt is marked and what was appended after it stays out of the prefix", () => {
  const blocks = cachedSystemBlocks("RULES\n\nAPP CONTEXT (live)\nx", "RULES");
  assert.deepEqual(blocks, [
    { type: "text", text: "RULES", cache_control: { type: "ephemeral" } },
    { type: "text", text: "\n\nAPP CONTEXT (live)\nx" },
  ]);
});

test("a system text that is not the fixed prompt is marked whole; an empty one gives nothing", () => {
  assert.deepEqual(cachedSystemBlocks("RULES", "RULES"), [{ type: "text", text: "RULES", cache_control: { type: "ephemeral" } }]);
  assert.deepEqual(cachedSystemBlocks("OTHER", "RULES"), [{ type: "text", text: "OTHER", cache_control: { type: "ephemeral" } }]);
  assert.deepEqual(cachedSystemBlocks("", "RULES"), []);
});

test("the last non-empty text block of a message is marked, nothing else", () => {
  assert.deepEqual(markedContent("hi"), [{ type: "text", text: "hi", cache_control: { type: "ephemeral" } }]);
  assert.equal(markedContent("  "), null);
  assert.equal(markedContent(undefined), null);
  const blocks = [
    { type: "text", text: "a" },
    { type: "image_url", image_url: { url: "x" } },
    { type: "text", text: "b" },
    { type: "text", text: " " },
  ];
  const out = markedContent(blocks);
  assert.deepEqual(out?.[2], { type: "text", text: "b", cache_control: { type: "ephemeral" } });
  assert.equal((out?.[0] as { cache_control?: unknown }).cache_control, undefined);
  assert.equal((blocks[2] as { cache_control?: unknown }).cache_control, undefined, "the input is not changed");
});

test("only Claude models are asked to cache", () => {
  assert.equal(cachesPrompt("anthropic/claude-haiku-5.5"), true);
  assert.equal(cachesPrompt("openai/gpt-oss-120b"), false);
});
