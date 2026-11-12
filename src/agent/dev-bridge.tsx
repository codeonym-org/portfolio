"use client";

import { useEffect } from "react";
import { executeSystemCommand, systemCommands } from "./system-commands";
import { useVoiceStore, type VoicePhase } from "@/components/agent/voice/voice-store";
import { getSystemSnapshot } from "./system-snapshot";

declare global {
  interface Window {
    /** console access to the agent bridge — try system.run("open_zone", { zone: "crypt" }) */
    system?: {
      snapshot: typeof getSystemSnapshot;
      run: typeof executeSystemCommand;
      commands: string[];
      /** show the voice pulse in a state without a microphone: system.pulse("speaking"), system.pulse("idle") */
      pulse: (phase: VoicePhase) => void;
    };
  }
}

/**
 * Exposes the agent bridge on `window.system` — deliberately shipped
 * to production: it is the manual test bench for every command an
 * agent will get, and a console easter egg for visitors who
 * open devtools on an AI engineer's portfolio.
 */
export function AgentDevBridge() {
  useEffect(() => {
    window.system = {
      snapshot: getSystemSnapshot,
      run: executeSystemCommand,
      commands: systemCommands.map((c) => c.name),
      pulse: (phase) => useVoiceStore.getState().set({ phase }),
    };
    return () => {
      delete window.system;
    };
  }, []);
  return null;
}
