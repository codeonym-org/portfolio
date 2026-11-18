import "server-only";
import { createMiddleware, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "langchain";
import { cachedSystemBlocks, markedContent } from "../prompt-cache";

/** keeps the system context plus the last N turns, never splitting a tool-call pair */
export function historyWindow(size: number) {
  return createMiddleware({
    name: "HistoryWindow",
    wrapModelCall: async (request, handler) => {
      const messages = request.messages;
      if (messages.length <= size) return handler(request);
      const head = messages.filter((m) => m.getType() === "system");
      let tail: BaseMessage[] = messages.filter((m) => m.getType() !== "system").slice(-size);
      const firstHuman = tail.findIndex((m) => HumanMessage.isInstance(m));
      if (firstHuman > 0) tail = tail.slice(firstHuman);
      // one long tool chain with no human turn in the window: at least never open on an orphaned tool result
      else if (firstHuman < 0) while (tail.length > 1 && ToolMessage.isInstance(tail[0])) tail = tail.slice(1);
      return handler({ ...request, messages: [...head, ...tail] });
    },
  });
}

type ContextEntry = { description?: string; value?: unknown };

/**
 * The browser's `useAgentContext` entries, appended to the system
 * prompt for this model call only — the App Context half of
 * copilotkitMiddleware, without its frontend tools (the voice agent
 * must see exactly one tool).
 */
export const appContextNote = createMiddleware({
  name: "AppContextNote",
  wrapModelCall: async (request, handler) => {
    const state = request.state as { copilotkit?: { context?: ContextEntry[] } };
    const entries = state.copilotkit?.context ?? [];
    if (!entries.length) return handler(request);
    const note = entries
      .map((e) => `${e.description ?? "context"}:\n${typeof e.value === "string" ? e.value : JSON.stringify(e.value)}`)
      .join("\n\n");
    return handler({ ...request, systemMessage: request.systemMessage.concat(`\n\nAPP CONTEXT (live)\n${note}`) });
  },
});

/**
 * Claude's prompt cache (`../prompt-cache.ts`): the fixed system prompt
 * and the latest human message marked, for this model call only (the
 * thread keeps its messages as they were). Last in the middleware list,
 * so it sees the system text after every note was appended.
 */
export function promptCache(fixed: string) {
  return createMiddleware({
    name: "PromptCache",
    wrapModelCall: async (request, handler) => {
      const system = request.systemMessage;
      const blocks = cachedSystemBlocks(system?.text ?? "", fixed);
      const messages = [...request.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!HumanMessage.isInstance(m)) continue;
        const content = markedContent(m.content);
        if (content) messages[i] = new HumanMessage({ content, id: m.id, name: m.name, additional_kwargs: m.additional_kwargs });
        break;
      }
      return handler({ ...request, messages, ...(blocks.length ? { systemMessage: new SystemMessage({ content: blocks }) } : {}) });
    },
  });
}
