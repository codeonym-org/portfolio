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
      heading: "QUEST UPDATE",
      body: "Daily quest [ SHIP SOMETHING GREAT ] is in progress.",
      tone: "system",
    },
    {
      heading: "SKILL PROFICIENCY",
      body: "Passive skill [ CONTEXT ENGINEERING ] increased by +1.",
      tone: "arcane",
    },
    {
      heading: "DUNGEON SCAN",
      body: "New S-rank gate detected: multi-agent orchestration.",
      tone: "gold",
    },
    {
      heading: "PARTY REQUEST",
      body: "A visitor wishes to form a party. The Gate is open.",
      tone: "system",
    },
    {
      heading: "ARISE",
      body: "A shadow bent the knee. The legion grows by one.",
      tone: "arcane",
    },
    {
      heading: "MANA SURGE",
      body: "Prompt cache warmed. Inference latency -34%.",
      tone: "arcane",
    },
    {
      heading: "GUILD TRANSMISSION",
      body: "OpenSNZ-Technology: agent fleet reporting nominal.",
      tone: "system",
    },
    {
      heading: "TITLE VERIFIED",
      body: "Title [ AGENTIC SYSTEMS DEVELOPER ] resonates with the vessel.",
      tone: "gold",
    },
  ],
  runtimeError: {
    error: "⚠ CRITICAL FAULT",
    heading: "SYSTEM CRASH",
    title: "AN UNEXPECTED FAULT INTERRUPTED THE SYSTEM",
    body: "The connection destabilized mid-render. This has been logged — attempt a reconnect, Player.",
    footer: "[ VESSEL INTACT · SYSTEM RECOVERABLE ]",
    retry: "RE-ESTABLISH LINK",
  },

  notFound: {
    error: "⚠ SIGNAL LOST",
    heading: "SECTOR NOT FOUND",
    title: "THIS GATE LEADS NOWHERE",
    body: "The coordinates you followed don't resolve to a sector within the System. It may have been sealed or never existed.",
    footer: "[ NAVIGATION FAILED · NO ACTIVE GATE ]",
    cta: "RETURN TO THE RECORD",
  },
};
