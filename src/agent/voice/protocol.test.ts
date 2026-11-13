import { test } from "node:test";
import assert from "node:assert/strict";
import {
  audioFormat,
  formatTaskReports,
  formatVoiceTask,
  isTaskReport,
  parseTaskEvent,
  parseVoiceTask,
} from "./protocol.ts";

test("voice tasks round-trip through the text agent's message", () => {
  const msg = formatVoiceTask(3, "Open the crypt and inspect the flagship project");
  assert.equal(msg, "[VOICE TASK #3] Open the crypt and inspect the flagship project");
  assert.deepEqual(parseVoiceTask(msg), { n: 3, task: "Open the crypt and inspect the flagship project" });
  assert.equal(parseVoiceTask("show me his skills"), null);
});

test("task reports are tagged, clipped and batched", () => {
  const text = formatTaskReports([
    { n: 1, task: "open the projects", status: "done", result: "Opened Projects." },
    { n: 2, task: "raise", status: "failed", result: "x".repeat(2000) },
  ]);
  assert.ok(isTaskReport(text));
  assert.match(text, /^\[TASK REPORT\]/);
  assert.match(text, /#1 · DONE · task: open the projects\nresult: Opened Projects\./);
  assert.match(text, /#2 · FAILED/);
  assert.ok(text.length < 1400, "long results are clipped");
  assert.equal(isTaskReport("what is his best project?"), false);
});

test("task events from the voice agent are validated", () => {
  assert.deepEqual(parseTaskEvent({ id: "t1", task: "  open the gate " }), { id: "t1", task: "open the gate" });
  assert.equal(parseTaskEvent({ id: "t1" }), null);
  assert.equal(parseTaskEvent({ id: 3, task: "x" }), null);
  assert.equal(parseTaskEvent("nope"), null);
  assert.equal(parseTaskEvent({ id: "t1", task: "" }), null);
  assert.equal(parseTaskEvent({ id: "t1", task: "y".repeat(900) })?.task.length, 600);
});

test("maps recorder mime types to OpenRouter audio formats", () => {
  assert.equal(audioFormat("audio/webm;codecs=opus"), "webm");
  assert.equal(audioFormat("audio/mp4"), "m4a");
  assert.equal(audioFormat("audio/mpeg"), "mp3");
  assert.equal(audioFormat("audio/ogg; codecs=opus"), "ogg");
  assert.equal(audioFormat("audio/wav"), "wav");
  assert.equal(audioFormat(""), "webm");
  assert.equal(audioFormat("application/octet-stream"), "webm");
});
