"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { SYSTEM_AGENT_ID } from "@/agent/constants";
import { world } from "@/config/world.config";
import { useSession } from "@/store/session-store";
import { AgentBridge } from "./agent-bridge";
import { SystemTools } from "./system-tools";
import { VoiceLink } from "./voice/voice-link";

/**
 * The link between the record and THE SYSTEM: a CopilotKit v2 provider
 * on the single-endpoint runtime (`/api/copilotkit`), the frontend
 * tools, the bridge that turns the text agent into the session the
 * interface shows, and the hold-to-talk voice link (the voice agent,
 * which delegates to the text agent). It renders nothing — the
 * console, the trace and the windows read the session store. Loaded
 * lazily once the scene is up, so the chat stack never delays it.
 */
export default function SystemLink() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      useSingleEndpoint
      agentId={SYSTEM_AGENT_ID}
      showDevConsole={false}
      enableInspector={false}
      onError={(event) => {
        console.error("[system] link error", event);
        useSession.getState().set({ online: false, notice: world.agent.offline });
      }}
    >
      <SystemTools />
      <AgentBridge />
      <VoiceLink />
    </CopilotKit>
  );
}
