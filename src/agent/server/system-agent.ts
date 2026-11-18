import "server-only";
import { LangGraphAgent, type LangGraphAgentConfig } from "@ag-ui/langgraph";
import { getSystemGraph } from "./agent";
import { createInProcessClient } from "./in-process-client";
import { resolveModelId } from "./model";
import { getVoiceGraph } from "./voice-agent";
import { SYSTEM_AGENT_ID, VOICE_AGENT_ID } from "../constants";

export { SYSTEM_AGENT_ID, VOICE_AGENT_ID };

type MergeArgs = Parameters<LangGraphAgent["langGraphDefaultMergeState"]>;

/**
 * The AG-UI face of the agent. `@ag-ui/langgraph` fills
 * `state.copilotkit.actions` with the browser's frontend tools; this
 * subclass also routes the browser's `useAgentContext` entries into
 * `state.copilotkit.context`, which copilotkitMiddleware turns into
 * the "App Context" system message.
 */
class SystemAgent extends LangGraphAgent {
  constructor(config: LangGraphAgentConfig) {
    super(config);
  }

  langGraphDefaultMergeState(state: MergeArgs[0], messages: MergeArgs[1], input: MergeArgs[2]) {
    const merged = super.langGraphDefaultMergeState(state, messages, input);
    const copilotkit = (merged.copilotkit ?? {}) as Record<string, unknown>;
    return {
      ...merged,
      copilotkit: {
        ...copilotkit,
        actions: merged.tools ?? [],
        context: input.context ?? [],
      },
    };
  }
}

function inProcessAgent(id: string, getGraph: Parameters<typeof createInProcessClient>[0]["getGraph"]) {
  return new SystemAgent({
    agentId: id,
    graphId: id,
    // never dialed — the in-process client below replaces the HTTP client
    deploymentUrl: `in-process://${id}`,
    client: createInProcessClient({ graphId: id, getGraph }),
  });
}

/** the text agent: page tools, archive, the dialogue window */
export function createSystemAgent() {
  return inProcessAgent(SYSTEM_AGENT_ID, async () => getSystemGraph(await resolveModelId()));
}

/** the voice agent: talks, and delegates every action to the text agent */
export function createVoiceAgent() {
  return inProcessAgent(VOICE_AGENT_ID, async () => getVoiceGraph(await resolveModelId()));
}
