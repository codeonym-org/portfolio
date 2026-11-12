import assert from "node:assert/strict";
import { test } from "node:test";
import { answerLocally, type BrainIndex } from "./local-brain.ts";

const index: BrainIndex = {
  player: { name: "AYOUB", title: "AI Agent Engineer", job: "Software Engineer", guild: "OpenSNZ", location: "Oujda", creed: "…" },
  sectors: [
    { id: "status", name: "The Player", section: "Status & Profile" },
    { id: "experience", name: "Chronicle", section: "Experience & Education" },
    { id: "projects", name: "Shadows", section: "Projects" },
    { id: "skills", name: "Arsenal", section: "Skills" },
    { id: "inventory", name: "Vault", section: "Inventory & CV" },
    { id: "contact", name: "The Gate", section: "Contact" },
  ],
  quests: [
    { id: "pharma-mas", name: "Multi-Agent Pharmaceutical Catalog System", summary: "A multi-agent system.", stack: ["LangGraph"] },
    { id: "mediary", name: "Mediary", summary: "A mediator library.", stack: ["Python"] },
  ],
  skills: [
    { id: "langgraph", name: "LangGraph" },
    { id: "python", name: "Python" },
  ],
  items: [{ id: "hunter-license", name: "Hunter's License" }],
  defaultCase: { title: "Why him" },
};

const actions = (q: string) => answerLocally(q, index).actions;

test("sector words open their sector, in English and French", () => {
  assert.deepEqual(actions("show me his skills"), [{ name: "open_sector", args: { sector: "skills" } }]);
  assert.deepEqual(actions("What is his experience?"), [{ name: "open_sector", args: { sector: "experience" } }]);
  assert.deepEqual(actions("Who is the Player?"), [{ name: "open_sector", args: { sector: "status" } }]);
  assert.deepEqual(actions("montre-moi ses compétences"), [{ name: "open_sector", args: { sector: "skills" } }]);
  assert.deepEqual(actions("ses projets"), [{ name: "open_sector", args: { sector: "projects" } }]);
});

test("asking for the short version opens the brief", () => {
  assert.deepEqual(actions("give me the short version"), [{ name: "open_brief", args: {} }]);
  assert.deepEqual(actions("a quick summary please"), [{ name: "open_brief", args: {} }]);
});

test("asking where he is shows the map", () => {
  assert.equal(answerLocally("Where is he based?", index).map, true);
  assert.equal(answerLocally("what time is it for him", index).map, true);
});

test("contact opens the gate and shows the channels", () => {
  const reply = answerLocally("How do I reach him?", index);
  assert.deepEqual(reply.actions, [{ name: "open_sector", args: { sector: "contact" } }]);
  assert.equal(reply.contact, true);
});

test("a named project or skill is inspected, not just its sector", () => {
  assert.deepEqual(actions("tell me about mediary"), [{ name: "inspect_entity", args: { kind: "quest", id: "mediary" } }]);
  assert.deepEqual(actions("the pharmaceutical project"), [{ name: "inspect_entity", args: { kind: "quest", id: "pharma-mas" } }]);
  assert.deepEqual(actions("does he know LangGraph?"), [{ name: "inspect_entity", args: { kind: "skill", id: "langgraph" } }]);
});

test("the CV is viewed, or downloaded when asked", () => {
  assert.deepEqual(actions("can I see the resume"), [{ name: "open_cv", args: {} }]);
  assert.deepEqual(actions("download his CV"), [{ name: "download_cv", args: {} }]);
});

test("a hiring question assembles the default case", () => {
  assert.deepEqual(actions("Build the case for hiring him"), [{ name: "assemble_case", args: { title: "Why him" } }]);
});

test("arise raises one, or all of them", () => {
  assert.deepEqual(actions("Raise a shadow for me"), [{ name: "arise", args: {} }]);
  assert.deepEqual(actions("ARISE — all of them"), [{ name: "arise_all", args: {} }]);
});

test("what it cannot answer, it says so and does nothing", () => {
  const reply = answerLocally("what is the meaning of life", index);
  assert.deepEqual(reply.actions, []);
  assert.match(reply.text, /cannot reason/);
  assert.deepEqual(answerLocally("   ", index).actions, []);
});
