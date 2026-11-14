/**
 * ── AGENT BRIDGE ──────────────────────────────────────────────
 * The world's contract with AI agents.
 *
 *  read side  — system-snapshot: serializable state + dossier
 *  write side — system-commands: zod tool registry, registered as
 *               CopilotKit v2 frontend tools in
 *               components/agent/system-tools.tsx
 *  server     — server/: THE SYSTEM, a LangChain `createAgent` with
 *               CopilotKit state + middleware, run in-process behind
 *               the v2 runtime at app/api/copilotkit
 */

export type { SystemSnapshot, SectorSnapshot } from "./system-snapshot";
export { getSystemSnapshot, useSystemSnapshot } from "./system-snapshot";
export type { SystemCommand } from "./system-commands";
export { executeSystemCommand, systemCommands } from "./system-commands";
