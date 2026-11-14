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
    error: "⚠ CRITICAL FAULT",
    heading: "SYSTEM CRASH",
    title: "AN UNEXPECTED FAULT INTERRUPTED THE SYSTEM",
    body: "The connection destabilized mid-render. This has been logged — try to reconnect.",
    footer: "[ NOTHING LOST · SYSTEM RECOVERABLE ]",
    retry: "RE-ESTABLISH LINK",
  },

  notFound: {
    error: "⚠ SIGNAL LOST",
    heading: "PAGE NOT FOUND",
    title: "THIS GATE LEADS NOWHERE",
    body: "The coordinates you followed don't lead to a page of this site. It may have moved or never existed.",
    footer: "[ NAVIGATION FAILED · NO ACTIVE GATE ]",
    cta: "RETURN TO THE RECORD",
  },
};
