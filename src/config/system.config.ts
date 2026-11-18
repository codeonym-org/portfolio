import { Gem, Heart } from "lucide-react";
import type { SystemConfig } from "./types";

/**
 * ── SYSTEM SETTINGS ───────────────────────────────────────────
 * Version, vitals, ambient System notifications and the copy for
 * the error / 404 screens. World + HUD copy lives in world.config.
 * Edit freely — the types in ./types.ts keep the UI safe.
 */
export const systemConfig: SystemConfig = {
  version: "9.0",
  vitals: [
    {
      code: "HP",
      label: "CONTEXT WINDOW",
      reading: "128K / 128K",
      percent: 100,
      tone: "ember",
      icon: Heart,
    },
    {
      code: "SP",
      label: "OUTPUT CAPACITY",
      reading: "32K / 32K",
      percent: 100,
      tone: "system",
      icon: Gem,
    },
  ],

  eventIntervalMs: 40000,
  ambientEvents: [
    {
      heading: "IN PROGRESS",
      body: "Today's work [ SHIP SOMETHING GREAT ] is under way.",
      tone: "system",
    },
    {
      heading: "SKILL IN USE",
      body: "[ CONTEXT ENGINEERING ] is in daily use.",
      tone: "arcane",
    },
    {
      heading: "FOCUS",
      body: "Current focus: multi-agent orchestration.",
      tone: "gold",
    },
    {
      heading: "OPEN TO TALK",
      body: "Contact details are in the Contact section.",
      tone: "system",
    },
    {
      heading: "PROJECTS",
      body: "Ten projects are on record. Ask the System about any of them.",
      tone: "arcane",
    },
    {
      heading: "CACHE",
      body: "Prompt cache warmed.",
      tone: "arcane",
    },
    {
      heading: "EMPLOYER",
      body: "OpenSNZ-Technology: software engineer since 2025/09.",
      tone: "system",
    },
    {
      heading: "ROLE",
      body: "[ AI AGENT ENGINEER ] building multi-agent systems in production.",
      tone: "gold",
    },
  ],
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
