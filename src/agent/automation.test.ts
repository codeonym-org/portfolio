import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, channelTarget, snapshotFileName } from "./automation.ts";

const links = { github: "https://github.com/x", linkedin: "https://linkedin.com/in/x", email: "x@y.dev", phone: "+212 600 000 000" };

test("the phone channel copies the number as written and dials it without spaces", () => {
  assert.deepEqual(channelTarget("phone", links, "https://site.dev"), {
    label: "phone number",
    text: "+212 600 000 000",
    href: "tel:+212600000000",
  });
});

test("resolves each channel to what to copy and where to go", () => {
  assert.deepEqual(channelTarget("email", links, "https://site.dev"), {
    label: "email address",
    text: "x@y.dev",
    href: "mailto:x@y.dev",
  });
  assert.deepEqual(channelTarget("github", links, "https://site.dev"), {
    label: "GitHub profile",
    text: "https://github.com/x",
    href: "https://github.com/x",
  });
  assert.equal(channelTarget("portfolio", links, "https://site.dev/").text, "https://site.dev/");
  assert.deepEqual([...CHANNELS], ["email", "phone", "github", "linkedin", "portfolio"]);
});

test("names snapshots by local date and time, filesystem-safe", () => {
  const name = snapshotFileName(new Date(2026, 8, 24, 7, 5, 9));
  assert.equal(name, "codeonym-record-2026-09-24-070509.png");
});
