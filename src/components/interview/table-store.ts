import { create } from "zustand";
import type { InspectTarget, SectorId } from "@/config/types";
import type { CaseFile } from "@/record/case-file";
import { useHistory } from "@/store/history-store";
import { useWorldStore } from "@/store/world-store";

/**
 * ── WHAT IS ON THE TABLE ──────────────────────────────────────
 * The record has one place for what is brought forward: a section, a
 * case file, the brief or one entry, each replacing the last. The
 * interview keeps them all instead: everything he opens during the
 * conversation is laid on the table and stays there, with the time
 * it came (which tells the question it answered), until the stranger
 * puts it away or another conversation begins. Cards drawn under a
 * reply (skill badges, the map) stay with their turn and are not
 * kept here.
 *
 * What the stranger opens from inside a thing on the table (a skill in
 * the Skills section, a project named by a skill) opens in that same
 * place, on its trail: a back button returns along it. It is not a
 * new thing on the table, and belongs to no question.
 */

export type Laid =
  | { id: string; at: number; kind: "sector"; sector: SectorId }
  | { id: string; at: number; kind: "case"; file: CaseFile }
  | { id: string; at: number; kind: "brief" }
  | { id: string; at: number; kind: "github" }
  | { id: string; at: number; kind: "inspect"; target: InspectTarget };

type Bare<T> = T extends unknown ? Omit<T, "id" | "at"> : never;
export type Shown = Bare<Laid>;

const idOf = (s: Shown): string =>
  s.kind === "sector" ? `sector:${s.sector}` : s.kind === "case" ? `case:${s.file.title}` : s.kind === "brief" || s.kind === "github" ? s.kind : `inspect:${s.target.kind}:${s.target.id}`;

interface TableState {
  /** oldest first */
  laid: Laid[];
  /** by the id of a thing on the table (or of a card): what was opened from it, deepest last */
  trails: Record<string, InspectTarget[]>;
  /** open an entry from inside a thing on the table, on its trail */
  drill: (from: string, target: InspectTarget) => void;
  /** one step back along its trail */
  back: (from: string) => void;
  /** put it on the table; again, it comes back to the front with this question */
  lay: (shown: Shown) => void;
  /** put it away (and close it in the record if it is what the record brings forward) */
  take: (id: string) => void;
  clear: () => void;
}

const same = (a: InspectTarget, b: InspectTarget | undefined) => !!b && a.kind === b.kind && a.id === b.id;

export const useTable = create<TableState>((set, get) => ({
  laid: [],
  trails: {},
  drill: (from, target) => {
    const trail = get().trails[from] ?? [];
    if (same(target, trail.at(-1))) return;
    // an entry already on the trail: go back to it rather than around in a circle
    const at = trail.findIndex((t) => same(target, t));
    set({ trails: { ...get().trails, [from]: at >= 0 ? trail.slice(0, at + 1) : [...trail, target] } });
  },
  back: (from) => {
    const trail = get().trails[from];
    if (!trail?.length) return;
    set({ trails: { ...get().trails, [from]: trail.slice(0, -1) } });
  },
  lay: (shown) => {
    const id = idOf(shown);
    set({ laid: [...get().laid.filter((l) => l.id !== id), { ...shown, id, at: Date.now() } as Laid] });
  },
  take: (id) => {
    const trails = { ...get().trails };
    delete trails[id];
    set({ laid: get().laid.filter((l) => l.id !== id), trails });
    const w = useWorldStore.getState();
    const front = [w.sector && `sector:${w.sector}`, w.caseFile && `case:${w.caseFile.title}`, w.brief && "brief", w.github && "github"].filter(Boolean);
    if (front.includes(id)) w.closeFocus();
    else if (w.inspect && id === `inspect:${w.inspect.kind}:${w.inspect.id}`) w.setInspect(null);
  },
  clear: () => set({ laid: [], trails: {} }),
}));

/** lay on the table whatever the record brings forward, for as long as the interview is open; returns how to stop */
export function followTable() {
  const { lay, clear } = useTable.getState();
  const from = (w: ReturnType<typeof useWorldStore.getState>, before?: ReturnType<typeof useWorldStore.getState>) => {
    if (w.sector && w.sector !== before?.sector) lay({ kind: "sector", sector: w.sector });
    if (w.caseFile && w.caseFile !== before?.caseFile) lay({ kind: "case", file: w.caseFile });
    if (w.brief && !before?.brief) lay({ kind: "brief" });
    if (w.github && !before?.github) lay({ kind: "github" });
    if (w.inspect && (w.inspect.kind !== before?.inspect?.kind || w.inspect.id !== before?.inspect?.id)) lay({ kind: "inspect", target: w.inspect });
  };
  clear();
  from(useWorldStore.getState());
  const stopWorld = useWorldStore.subscribe((w, before) => from(w, before));
  // another conversation: a clean table
  const stopHistory = useHistory.subscribe((s, prev) => {
    if (s.current !== prev.current) clear();
  });
  return () => {
    stopWorld();
    stopHistory();
  };
}
