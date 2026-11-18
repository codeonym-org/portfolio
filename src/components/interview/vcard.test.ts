import assert from "node:assert/strict";
import { test } from "node:test";
import { familyName, printed, vcard } from "./vcard.ts";

const him = {
  name: "DOE JOHN",
  firstName: "John",
  title: "Engineer; agents",
  brand: "acme",
  location: "Oujda, Morocco",
  email: "john@example.com",
  phone: "+212 600 000 000",
  site: "https://example.com",
  github: "https://github.com/acme",
  linkedin: "https://www.linkedin.com/in/acme/",
};

test("the family name is the record's name without the first name", () => {
  assert.equal(familyName("DOE JOHN", "John"), "Doe");
  assert.equal(familyName("VAN DOE JOHN", "john"), "Van Doe");
});

test("an address is printed without its scheme, www or last slash", () => {
  assert.equal(printed("https://www.linkedin.com/in/acme/"), "linkedin.com/in/acme");
  assert.equal(printed("https://github.com/acme"), "github.com/acme");
});

test("the card is a vCard a phone can read", () => {
  const lines = vcard(him).split("\r\n");
  assert.equal(lines[0], "BEGIN:VCARD");
  assert.equal(lines.at(-2), "END:VCARD");
  assert.ok(lines.includes("N:Doe;John;;;"));
  assert.ok(lines.includes("FN:John Doe"));
  assert.ok(lines.includes("TITLE:Engineer\\; agents"));
  assert.ok(lines.includes("TEL;TYPE=CELL:+212600000000"));
  assert.ok(lines.includes("ADR;TYPE=WORK:;;;Oujda;;;Morocco"));
});
