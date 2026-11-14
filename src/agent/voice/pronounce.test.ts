import assert from "node:assert/strict";
import { test } from "node:test";
import { pronounce } from "./pronounce.ts";

test("the name is respelled for the voice, possessives and capitals included", () => {
  assert.equal(pronounce("I'm Ayoub's AI replica.", "Ayoub", "A-yoob"), "I'm A-yoob's AI replica.");
  assert.equal(pronounce("BOUAROUR AYOUB", "Ayoub", "A-yoob"), "BOUAROUR A-yoob");
  assert.equal(pronounce("la réplique IA d'Ayoub", "Ayoub", "A-yoob"), "la réplique IA d'A-yoob");
});

test("other words are left alone", () => {
  assert.equal(pronounce("Ayoubi and Bayoub stay.", "Ayoub", "A-yoob"), "Ayoubi and Bayoub stay.");
  assert.equal(pronounce("No name here.", "Ayoub", ""), "No name here.");
});
