/**
 * ── HOW LONG A CONVERSATION IS KEPT ───────────────────────────
 * Seven days from its first message, everywhere it is kept: the
 * server's memory (the runner's threads, the graph's checkpoints) and
 * the stranger's own browser. After that it is forgotten.
 */

export const RETENTION_MS = 7 * 24 * 60 * 60_000;

/** true once something created at `createdAt` has outlived its time */
export const lapsed = (createdAt: number, now: number, maxAgeMs = RETENTION_MS) => now - createdAt >= maxAgeMs;

/**
 * Which threads a store of bounded size and age must forget. It keeps
 * when each thread was first written, and the order they were last
 * written in.
 */
export class Lifetimes {
  /** thread → when it was first written; the order of the map is the order of last writing */
  private readonly born = new Map<string, number>();

  private readonly maxThreads: number;
  private readonly maxAgeMs: number;

  constructor(maxThreads: number, maxAgeMs = RETENTION_MS) {
    this.maxThreads = maxThreads;
    this.maxAgeMs = maxAgeMs;
  }

  /** a thread was written: returns the other threads to forget, the ones too old and the ones over the count */
  touch(id: string, now: number): string[] {
    const birth = this.born.get(id) ?? now;
    this.born.delete(id);
    this.born.set(id, birth);
    const drop: string[] = [];
    for (const [other, at] of this.born) if (other !== id && lapsed(at, now, this.maxAgeMs)) drop.push(other);
    for (const other of drop) this.born.delete(other);
    while (this.born.size > this.maxThreads) {
      const oldest = this.born.keys().next().value as string;
      if (oldest === id) break;
      this.born.delete(oldest);
      drop.push(oldest);
    }
    return drop;
  }

  /** a thread is about to be read: true when it has outlived its time. It is forgotten here; the caller clears what it kept */
  expire(id: string, now: number): boolean {
    const at = this.born.get(id);
    if (at === undefined || !lapsed(at, now, this.maxAgeMs)) return false;
    this.born.delete(id);
    return true;
  }
}

/** the slice of the runner's thread store the sweep needs */
export interface ThreadStoreLike {
  listThreads(): { id: string; createdAt: string }[];
  peek(id: string): { isRunning: boolean } | undefined;
}

/** the runner's threads that have outlived their time and are not running */
export function lapsedThreads(store: ThreadStoreLike, now: number, maxAgeMs = RETENTION_MS): string[] {
  return store
    .listThreads()
    .filter((t) => lapsed(Date.parse(t.createdAt), now, maxAgeMs) && !store.peek(t.id)?.isRunning)
    .map((t) => t.id);
}
