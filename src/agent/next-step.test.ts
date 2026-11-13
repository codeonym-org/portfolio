import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStep, nextStepAfter, proposalKey, unseenSteps, type Seen } from "./next-step.ts";

const index = { playerName: "AYOUB", flagship: { id: "pharma-mas", name: "the pharma system" } };
const fresh: Seen = { sectors: [], briefRead: false, cvRead: false, inspected: [] };

test("a new visitor is offered the brief first", () => {
  assert.equal(nextStep(fresh, index)?.id, "brief");
});

test("the order is brief, flagship, projects, experience, skills, CV, contact", () => {
  const order: string[] = [];
  let seen = fresh;
  for (let i = 0; i < 10; i++) {
    const step = nextStep(seen, index);
    if (!step) break;
    order.push(step.id);
    seen = { ...seen, briefRead: true, sectors: [...seen.sectors], inspected: [...seen.inspected] };
    if (step.id === "flagship") seen.inspected.push("quest:pharma-mas");
    else if (step.id === "cv") seen.cvRead = true;
    else if (step.id !== "brief") seen.sectors.push(step.id);
  }
  assert.deepEqual(order, ["brief", "flagship", "projects", "experience", "skills", "cv", "contact"]);
});

test("nothing is offered once everything has been seen", () => {
  assert.equal(nextStep({ sectors: ["projects", "experience", "skills", "contact"], briefRead: true, cvRead: true, inspected: ["quest:pharma-mas"] }, index), null);
});

test("an answer never offers what it just did", () => {
  assert.equal(nextStepAfter([{ name: "open_brief", args: {} }], fresh, index)?.id, "flagship");
  assert.equal(nextStepAfter([{ name: "inspect_entity", args: { kind: "quest", id: "pharma-mas" } }], { ...fresh, briefRead: true }, index)?.id, "projects");
  assert.equal(nextStepAfter([{ name: "assemble_case", args: {} }], { ...fresh, briefRead: true }, index)?.id, "projects");
});

test("without a flagship the projects come after the brief", () => {
  assert.equal(nextStep({ ...fresh, briefRead: true }, { playerName: "AYOUB" })?.id, "projects");
});

test("the agent is given everything left to see, not one pick", () => {
  assert.deepEqual(
    unseenSteps({ ...fresh, briefRead: true, sectors: ["projects"] }, index).map((s) => s.id),
    ["flagship", "experience", "skills", "cv", "contact"],
  );
});

test("a proposal's key is the action and its arguments, in any order", () => {
  assert.equal(proposalKey("inspect_entity", { kind: "quest", id: "pharma-mas" }), proposalKey("inspect_entity", { id: "pharma-mas", kind: "quest" }));
  assert.notEqual(proposalKey("open_sector", { sector: "skills" }), proposalKey("open_sector", { sector: "projects" }));
  assert.equal(proposalKey("open_brief"), "open_brief");
});
