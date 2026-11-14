import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InspectTarget, SectorId, Tone } from "@/config/types";
import { sectorById } from "@/config/world.config";
import type { CaseFile } from "@/record/case-file";

/**
 * ── WORLD STATE ───────────────────────────────────────────────
 * What the scene and the interface share: which sector or case is
 * brought forward, what is being inspected, and what the stranger
 * has already seen. Per-frame data (how far the Monolith is open, beams in
 * flight) lives in the mutable `live` object instead — writing it
 * into React state 60×/s would re-render the whole interface.
 */

export type Quality = "high" | "medium" | "low";

export interface Toast {
  id: number;
  heading: string;
  body: string;
  tone: Tone;
}

/** something the System asks: a message and up to two answers. Accepting may run one command. */
export interface SystemPrompt {
  /** prompts with the same id replace each other */
  id: string;
  heading: string;
  body: string;
  accept: string;
  decline: string;
  tone: Tone;
  /** a command from the System's command list, run when the visitor accepts */
  command?: { name: string; args?: Record<string, unknown> };
  /** told to whoever raised it */
  onAnswer?: (accepted: boolean) => void;
  /** the visitor closed it without answering, or moved on; without this it counts as a "no" */
  onIgnore?: () => void;
}

/** one thing the System proposed during this visit, and what the visitor did with it */
export interface Proposal {
  /** the action and its arguments, as one string: the same key is never proposed twice */
  key: string;
  outcome: "waiting" | "accepted" | "refused" | "ignored";
}

/** a beam the Monolith fires at a shard (or a whole sector) when the System touches it */
export interface Pulse {
  /** node key, or `sector:<id>` for every shard of a sector */
  target: string;
  at: number;
}

/** per-frame channel between the scene, the agent and the voice link — never rendered directly */
export const live = {
  /** THE SYSTEM is generating — the Monolith opens while it thinks */
  agentBusy: false,
  /** the voice link's pull on the Monolith (1 = rest): it leans open while listening, pulses as it speaks */
  voiceSurge: 1,
  /** the voice's heartbeat, 0 at rest … 1 on the spike; written by the pulse monitor while the voice is live */
  heart: 0,
  pulses: [] as Pulse[],
  /** one-shot kicks, decayed by the scene: a shockwave across the floor, a lens split, a camera shake */
  shock: 0,
  aberration: 0,
  shake: 0,
  /** set once by the stage: draw one frame and hand back the canvas as a PNG */
  capture: null as null | (() => Promise<Blob | null>),
};

export function pulse(target: string) {
  live.pulses.push({ target, at: performance.now() });
  if (live.pulses.length > 24) live.pulses.shift();
}

interface WorldState {
  /** models and light are loaded; the Monolith has assembled */
  ready: boolean;
  quality: Quality;
  muted: boolean;
  /** true on coarse-pointer / small screens — set once on mount */
  touch: boolean;

  /** the sector brought forward (its window is open) */
  sector: SectorId | null;
  /** the case the System assembled, brought forward instead of a sector */
  caseFile: CaseFile | null;
  /** the one-minute brief, brought forward instead of a sector or a case */
  brief: boolean;
  inspect: InspectTarget | null;
  cvOpen: boolean;
  /** the holographic map, over everything */
  mapOpen: boolean;
  paletteOpen: boolean;
  /** node key under the pointer (or hovered in a window) */
  hovered: string | null;

  // ── persisted: what the stranger has seen, so the System can suggest the rest ──
  visited: SectorId[];
  briefRead: boolean;
  cvRead: boolean;

  toasts: Toast[];
  /** the question the System is asking right now; one at a time */
  prompt: SystemPrompt | null;
  /** entity keys (`quest:<id>`) inspected during this visit */
  inspected: string[];
  /** what the System proposed during this visit and how the visitor answered */
  offers: { declinedInARow: number; lastAt: number; log: Proposal[] };
  /** persisted: the first-visit offer has been made */
  greeted: boolean;

  setReady: () => void;
  setQuality: (q: Quality) => void;
  toggleMuted: () => void;
  setTouch: (touch: boolean) => void;
  openSector: (sector: SectorId) => void;
  setCase: (file: CaseFile | null) => void;
  openBrief: () => void;
  /** close the sector window and the case, back to the open sky */
  closeFocus: () => void;
  setInspect: (target: InspectTarget | null) => void;
  setCvOpen: (open: boolean) => void;
  setMapOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setHovered: (key: string | null) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  ask: (prompt: SystemPrompt) => void;
  /** closes the prompt; running its command is the dialog's job */
  answer: (accepted: boolean) => void;
  /** closes the prompt without an answer */
  ignore: () => void;
  setGreeted: () => void;
  /** the System proposed something */
  raiseOffer: (key: string) => void;
  /** the visitor accepted, refused or ignored the proposal that was waiting */
  settleOffer: (outcome: Exclude<Proposal["outcome"], "waiting">) => void;
  /** the visitor asked what to see next: the System may offer again */
  invite: () => void;
}

let toastSeq = 0;
export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      ready: false,
      quality: "high",
      muted: false,
      touch: false,

      sector: null,
      caseFile: null,
      inspect: null,
      brief: false,
      cvOpen: false,
      mapOpen: false,
      paletteOpen: false,
      hovered: null,

      visited: [],
      briefRead: false,
      cvRead: false,

      toasts: [],
      prompt: null,
      inspected: [],
      offers: { declinedInARow: 0, lastAt: 0, log: [] },
      greeted: false,

      setReady: () => set({ ready: true }),
      setQuality: (quality) => set({ quality }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      setTouch: (touch) => set({ touch }),

      openSector: (sector) => {
        if (get().sector === sector && !get().caseFile) return;
        set({ sector, caseFile: null, brief: false, inspect: null, paletteOpen: false });
        pulse(`sector:${sector}`);
        if (!get().visited.includes(sector)) set({ visited: [...get().visited, sector] });
      },
      setCase: (caseFile) => {
        set(caseFile ? { caseFile, sector: null, brief: false, inspect: null, paletteOpen: false } : { caseFile: null });
        caseFile?.evidence.forEach((e, i) => setTimeout(() => pulse(`${e.kind}:${e.id}`), i * 140));
      },
      openBrief: () => {
        set({ brief: true, briefRead: true, sector: null, caseFile: null, inspect: null, paletteOpen: false });
        pulse("sector:status");
      },
      closeFocus: () => set({ sector: null, caseFile: null, brief: false, inspect: null }),

      setInspect: (inspect) => {
        set({ inspect });
        if (inspect) {
          pulse(`${inspect.kind}:${inspect.id}`);
          const key = `${inspect.kind}:${inspect.id}`;
          if (!get().inspected.includes(key)) set({ inspected: [...get().inspected, key] });
        }
        if (inspect?.kind === "item" && inspect.id === "hunter-license") set({ cvRead: true });
      },
      setMapOpen: (mapOpen) => set(mapOpen ? { mapOpen, paletteOpen: false } : { mapOpen }),
      setCvOpen: (cvOpen) => {
        set(cvOpen ? { cvOpen, cvRead: true } : { cvOpen });
      },
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setHovered: (hovered) => {
        if (get().hovered !== hovered) set({ hovered });
      },

      pushToast: (toast) =>
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id: ++toastSeq }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      ask: (prompt) => {
        // a new question replaces an unanswered one: the old one was ignored
        const waiting = get().prompt;
        if (waiting) (waiting.onIgnore ?? (() => waiting.onAnswer?.(false)))();
        set({ prompt });
      },
      answer: (accepted) => {
        const prompt = get().prompt;
        if (!prompt) return;
        set({ prompt: null });
        prompt.onAnswer?.(accepted);
      },
      ignore: () => {
        const prompt = get().prompt;
        if (!prompt) return;
        set({ prompt: null });
        (prompt.onIgnore ?? (() => prompt.onAnswer?.(false)))();
      },
      setGreeted: () => set({ greeted: true }),
      raiseOffer: (key) => set((s) => ({ offers: { ...s.offers, lastAt: Date.now(), log: [...s.offers.log.slice(-11), { key, outcome: "waiting" }] } })),
      settleOffer: (outcome) =>
        set((s) => ({
          offers: {
            ...s.offers,
            // only a clear "no" counts against further proposals; ignoring one does not
            declinedInARow: outcome === "accepted" ? 0 : outcome === "refused" ? s.offers.declinedInARow + 1 : s.offers.declinedInARow,
            log: s.offers.log.map((p) => (p.outcome === "waiting" ? { ...p, outcome } : p)),
          },
        })),
      invite: () => set((s) => ({ offers: { ...s.offers, declinedInARow: 0, lastAt: 0 } })),
    }),
    {
      name: "codeonym-record-v9",
      // rehydrated after mount (Shell) so SSR and first client render match
      skipHydration: true,
      version: 2,
      // before version 2 the visitor had quests, XP and risen projects: keep only what was seen
      migrate: (old) => {
        const o = (old ?? {}) as { visited?: SectorId[]; completed?: string[]; muted?: boolean; quality?: Quality; greeted?: boolean };
        const done = o.completed ?? [];
        return { visited: o.visited ?? [], briefRead: done.includes("brief"), cvRead: done.includes("license"), muted: !!o.muted, quality: o.quality ?? "high", greeted: !!o.greeted };
      },
      partialize: (s) => ({
        visited: s.visited,
        briefRead: s.briefRead,
        cvRead: s.cvRead,
        muted: s.muted,
        quality: s.quality,
        greeted: s.greeted,
      }),
    },
  ),
);

/** what the focus is called, for labels and the agent's context */
export function focusLabel(s: Pick<WorldState, "sector" | "caseFile">): string | null {
  if (s.caseFile) return `case file "${s.caseFile.title}"`;
  return s.sector ? `${s.sector} (${sectorById[s.sector].section})` : null;
}
