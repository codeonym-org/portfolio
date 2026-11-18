import assert from "node:assert/strict";
import { test } from "node:test";
import { sameThing, skillNamed, usedIn } from "./exhibit-links.ts";

test("names written differently are the same thing", () => {
  assert.ok(sameThing("LangChain / LangGraph", "LangChain/LangGraph"));
  assert.ok(sameThing("RAG Systems", "RAG"));
  assert.ok(sameThing("MCP Protocol", "MCP"));
  assert.ok(sameThing("Docker / Compose", "Docker · Traefik · Authentik"));
  assert.ok(sameThing("CopilotKit / AG-UI", "CopilotKit (AG-UI)"));
  assert.ok(sameThing("Next.js / React", "Next.js"));
});

test("a word inside a word is not a match", () => {
  assert.equal(sameThing("Java", "JavaScript"), false);
  assert.equal(sameThing("Context Engineering", "Prompt Engineering"), false);
  assert.equal(sameThing("Python", "CLI · TUI"), false);
});

test("projects by skill, and the skill a stack entry names", () => {
  const projects = [
    { id: "a", stack: ["Python", "MCP"] },
    { id: "b", stack: ["TypeScript"] },
  ];
  assert.deepEqual(
    usedIn("MCP Protocol", projects).map((p) => p.id),
    ["a"],
  );
  assert.equal(skillNamed("LangChain/LangGraph", [{ name: "Python" }, { name: "LangChain / LangGraph" }])?.name, "LangChain / LangGraph");
  assert.equal(skillNamed("Blender", [{ name: "Python" }]), undefined);
});
