/**
 * ── HIS CARD, AS A CONTACT ────────────────────────────────────
 * The business card as a vCard 3.0 file, so the stranger's phone or
 * mail program can keep it.
 */

export interface CardPerson {
  /** as on the record: family name first, in capitals */
  name: string;
  firstName: string;
  title: string;
  brand: string;
  location: string;
  email: string;
  phone: string;
  site: string;
  github: string;
  linkedin: string;
}

const proper = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** his family name: the record's name without his first name */
export function familyName(name: string, firstName: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w && w.toLowerCase() !== firstName.toLowerCase())
    .map(proper)
    .join(" ");
}

/** a web address as printed on a card: no scheme, no `www.`, no trailing slash */
export function printed(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export function vcard(p: CardPerson): string {
  const family = familyName(p.name, p.firstName);
  const [city = "", country = ""] = p.location.split(",").map((s) => s.trim());
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escape(family)};${escape(p.firstName)};;;`,
    `FN:${escape(`${p.firstName} ${family}`.trim())}`,
    `NICKNAME:${escape(p.brand)}`,
    `ORG:${escape(p.brand)}`,
    `TITLE:${escape(p.title)}`,
    `EMAIL;TYPE=INTERNET:${p.email}`,
    `TEL;TYPE=CELL:${p.phone.replace(/\s+/g, "")}`,
    `ADR;TYPE=WORK:;;;${escape(city)};;;${escape(country)}`,
    `URL:${p.site}`,
    `X-SOCIALPROFILE;TYPE=linkedin:${p.linkedin}`,
    `X-SOCIALPROFILE;TYPE=github:${p.github}`,
    "END:VCARD",
    "",
  ].join("\r\n");
}
