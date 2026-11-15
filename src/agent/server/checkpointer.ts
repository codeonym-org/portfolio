import "server-only";
import { MemorySaver, type Checkpoint, type CheckpointMetadata } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { Lifetimes, RETENTION_MS } from "../retention";

/**
 * ── BOUNDED MEMORY ────────────────────────────────────────────
 * MemorySaver keeps every checkpoint of every thread for the life of
 * the process — on a warm serverless instance that only grows. This
 * one keeps the most recently written `maxThreads` conversations, and
 * none for longer than the retention period (seven days from its
 * first message). A forgotten visitor's browser still holds the
 * conversation and sends it again with the next message.
 */
export class BoundedMemorySaver extends MemorySaver {
  private readonly lives: Lifetimes;

  constructor(maxThreads: number, maxAgeMs = RETENTION_MS) {
    super();
    this.lives = new Lifetimes(maxThreads, maxAgeMs);
  }

  async getTuple(config: RunnableConfig) {
    const threadId = config.configurable?.thread_id as string | undefined;
    // read at the start of a run: a conversation past its time begins again
    if (threadId && this.lives.expire(threadId, Date.now())) await this.deleteThread(threadId);
    return super.getTuple(config);
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata) {
    const threadId = config.configurable?.thread_id as string | undefined;
    if (threadId) for (const gone of this.lives.touch(threadId, Date.now())) await this.deleteThread(gone);
    return super.put(config, checkpoint, metadata);
  }
}
