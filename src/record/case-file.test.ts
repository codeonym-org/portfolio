import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeCase, encodeCase, resolveCase, type CaseFile } from "./case-file.ts";

const file: CaseFile = {
  title: "Fit for an agent platform role",
  thesis: "He has shipped multi-agent systems to production — العربية, français.",
  evidence: [
    { kind: "quest", id: "pharma-mas", why: "A multi-agent system delivered end to end." },
    { kind: "skill", id: "langgraph", why: "The orchestration layer he uses daily." },
  ],
  verdict: "Strong on agents; the record is silent on team size.",
};

test("a case survives the round trip through the URL hash", () => {
  const hash = `#${encodeCase(file)}`;
  assert.match(hash, /^#case=[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeCase(hash), file);
});

test("anything that is not a valid case decodes to null", () => {
  assert.equal(decodeCase(""), null);
  assert.equal(decodeCase("#other=abc"), null);
  assert.equal(decodeCase("#case=not-base64-json"), null);
  assert.equal(decodeCase(`#case=${btoa(JSON.stringify({ title: "x" }))}`), null);
  assert.equal(decodeCase(`#case=${"A".repeat(7000)}`), null);
});

test("a case with too much evidence is refused", () => {
  const big = { ...file, evidence: Array.from({ length: 8 }, () => file.evidence[0]) };
  assert.equal(decodeCase(`#${encodeCase(big as CaseFile)}`), null);
});

test("resolving drops unknown and repeated evidence and names what it dropped", () => {
  const known = new Set(["quest:pharma-mas"]);
  const { file: kept, unknown } = resolveCase(
    { ...file, evidence: [...file.evidence, file.evidence[0]] },
    (key) => known.has(key),
  );
  assert.deepEqual(kept.evidence.map((e) => e.id), ["pharma-mas"]);
  assert.deepEqual(unknown, ["skill:langgraph"]);
});
