import type { SystemConfig } from "./types";

/**
 * ── SITE SETTINGS ─────────────────────────────────────────────
 * The release number and the copy for the error and 404 pages.
 * Everything else the page says lives in world.config.
 * Edit freely — the types in ./types.ts keep the UI safe.
 */
export const systemConfig: SystemConfig = {
  version: "9.0",
  runtimeError: {
    code: "ERR",
    kicker: "Something broke",
    title: "That should not have happened.",
    body: "A part of this page failed while it was drawing. Nothing you did caused it, and nothing is lost: try again, or start over from the record.",
    retry: "Try again",
    home: "Back to the record",
    ref: "Reference",
    copy: "Copy the reference",
    copied: "Copied",
  },

  notFound: {
    code: "404",
    kicker: "Not on the record",
    title: "This page isn't here.",
    body: "The link you followed leads nowhere on my site. It may have moved, or never existed. Everything I have is one click away.",
    home: "Back to the record",
    interview: "Interview me",
    plain: "Plain record",
    tried: "You asked for",
    site: "portfolio.codeonym.work",
  },
};
