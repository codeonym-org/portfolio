import assert from "node:assert/strict";
import test from "node:test";
import { soundVerdict } from "./sound-permission.ts";

test("the browser's own policy is taken at its word", () => {
  assert.equal(soundVerdict({ policy: "allowed", activated: false }), "allowed");
  assert.equal(soundVerdict({ policy: "allowed-muted", activated: true }), "blocked");
  assert.equal(soundVerdict({ policy: "disallowed", activated: true }), "blocked");
});

test("without a policy, a page nobody has acted on stays silent", () => {
  assert.equal(soundVerdict({ activated: false }), "blocked");
  assert.equal(soundVerdict({ activated: true }), "allowed");
});

test("a browser that tells nothing is trusted; a refused play is caught later", () => {
  assert.equal(soundVerdict({}), "allowed");
});
