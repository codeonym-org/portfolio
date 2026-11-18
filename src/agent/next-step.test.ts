import assert from "node:assert/strict";
import { test } from "node:test";
import { proposalKey, unseenSteps, type Seen } from "./next-step.ts";

const index = { flagship: { id: "pharma-mas", name: "the pharma system" } };
const fresh: Seen = { sectors: [], briefRead: false, cvRead: false, inspected: [] };

test("what is left to see, in the order a hiring team needs it", () => {
  assert.deepEqual(
    unseenSteps(fresh, index).map((s) => s.id),
    ["brief", "flagship", "projects", "experience", "skills", "cv", "contact"],
  );
});

test("what has been seen is not listed", () => {
  assert.deepEqual(
    unseenSteps({ ...fresh, briefRead: true, sectors: ["projects"] }, index).map((s) => s.id),
    ["flagship", "experience", "skills", "cv", "contact"],
  );
  assert.deepEqual(unseenSteps({ sectors: ["projects", "experience", "skills", "contact"], briefRead: true, cvRead: true, inspected: ["quest:pharma-mas"] }, index), []);
});

test("without a flagship the projects come after the brief", () => {
  assert.equal(unseenSteps({ ...fresh, briefRead: true }, {})[0]?.id, "projects");
});

test("an offer's key is the action and its arguments, in any order", () => {
  assert.equal(proposalKey("inspect_entity", { kind: "quest", id: "pharma-mas" }), proposalKey("inspect_entity", { id: "pharma-mas", kind: "quest" }));
  assert.notEqual(proposalKey("open_sector", { sector: "skills" }), proposalKey("open_sector", { sector: "projects" }));
  assert.equal(proposalKey("open_brief"), "open_brief");
});
