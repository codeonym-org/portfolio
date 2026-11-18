"use client";

import { createContext, useContext } from "react";
import type { InspectTarget } from "@/config/types";
import { useWorldStore } from "@/store/world-store";

/**
 * ── OPENING AN ENTRY ──────────────────────────────────────────
 * A skill, a project or a document named inside a panel opens its
 * inspect card on the home page. On the interview's table it opens in
 * the same place instead, with a way back (`interview/table-store.ts`):
 * the table provides how.
 */
export const OpenEntry = createContext<((target: InspectTarget) => void) | null>(null);

/** how to open an entry from here */
export function useOpenEntry(): (target: InspectTarget) => void {
  const here = useContext(OpenEntry);
  const inspect = useWorldStore((s) => s.setInspect);
  return here ?? inspect;
}
