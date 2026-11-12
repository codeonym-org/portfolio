import { create } from "zustand";
import { persist } from "zustand/middleware";
import { quests } from "@/config/quests.config";
import type { InspectTarget, SectorId, Tone } from "@/config/types";
import { sectorById, sectorIds, visitorQuests, world, xpPerLevel } from "@/config/world.config";
import type { CaseFile } from "@/record/case-file";

/**
 * ── WORLD STATE ───────────────────────────────────────────────
 * What the scene and the interface share: which sector or case is
 * brought forward, what is being inspected, and the visitor's
 * progress. Per-frame data (how far the Monolith is open, beams in
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

/** how long one ARISE takes, start to bound */
export const ARISE_MS = 1700;

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
  paletteOpen: boolean;
  /** node key under the pointer (or hovered in a window) */
  hovered: string | null;
  /** quest id currently mid-ARISE */
  rising: string | null;

  // ── persisted visitor progress ──
  visited: SectorId[];
  risen: string[];
  completed: string[];
  xp: number;

  toasts: Toast[];
  /** the question the System is asking right now; one at a time */
  prompt: SystemPrompt | null;
  /** entity keys (`quest:<id>`) inspected during this visit */
  inspected: string[];
  /** how the visitor has answered the System's offers during this visit */
  offers: { declinedInARow: number; lastAt: number };
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
  setPaletteOpen: (open: boolean) => void;
  setHovered: (key: string | null) => void;
  arise: (questId: string) => void;
  finishRising: () => void;
  completeQuest: (id: string) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  ask: (prompt: SystemPrompt) => void;
  /** closes the prompt; running its command is the dialog's job */
  answer: (accepted: boolean) => void;
  setGreeted: () => void;
  /** an offer was raised (`null`) or answered */
  noteOffer: (accepted: boolean | null) => void;
  /** the visitor asked what to see next: the System may offer again */
  invite: () => void;
  resetProgress: () => void;
}

let toastSeq = 0;
let riseTimer: ReturnType<typeof setTimeout> | undefined;

export function levelFor(xp: number) {
  return Math.floor(xp / xpPerLevel) + 1;
}

/** share of the record the visitor has uncovered, 0–100 */
export function syncPercent(s: Pick<WorldState, "visited" | "risen" | "completed">) {
  const done = s.visited.length + s.risen.length + s.completed.length;
  return Math.round((done / (sectorIds.length + quests.length + visitorQuests.length)) * 100);
}

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
      paletteOpen: false,
      hovered: null,
      rising: null,

      visited: [],
      risen: [],
      completed: [],
      xp: 0,

      toasts: [],
      prompt: null,
      inspected: [],
      offers: { declinedInARow: 0, lastAt: 0 },
      greeted: false,

      setReady: () => set({ ready: true }),
      setQuality: (quality) => set({ quality }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      setTouch: (touch) => set({ touch }),

      openSector: (sector) => {
        if (get().sector === sector && !get().caseFile) return;
        set({ sector, caseFile: null, brief: false, inspect: null, paletteOpen: false });
        pulse(`sector:${sector}`);
        if (get().visited.includes(sector)) return;
        const visited = [...get().visited, sector];
        set({ visited });
        if (sector === "contact") get().completeQuest("party");
        if (sectorIds.every((id) => visited.includes(id))) get().completeQuest("explore");
      },
      setCase: (caseFile) => {
        set(caseFile ? { caseFile, sector: null, brief: false, inspect: null, paletteOpen: false } : { caseFile: null });
        caseFile?.evidence.forEach((e, i) => setTimeout(() => pulse(`${e.kind}:${e.id}`), i * 140));
      },
      openBrief: () => {
        set({ brief: true, sector: null, caseFile: null, inspect: null, paletteOpen: false });
        pulse("sector:status");
        get().completeQuest("brief");
      },
      closeFocus: () => set({ sector: null, caseFile: null, brief: false, inspect: null }),

      setInspect: (inspect) => {
        set({ inspect });
        if (inspect) {
          pulse(`${inspect.kind}:${inspect.id}`);
          const key = `${inspect.kind}:${inspect.id}`;
          if (!get().inspected.includes(key)) set({ inspected: [...get().inspected, key] });
        }
        if (inspect?.kind === "item" && inspect.id === "hunter-license") get().completeQuest("license");
      },
      setCvOpen: (cvOpen) => {
        set({ cvOpen });
        if (cvOpen) get().completeQuest("license");
      },
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setHovered: (hovered) => {
        if (get().hovered !== hovered) set({ hovered });
      },

      // The extraction is timed here, not by the render loop, so a
      // hidden tab or a slow GPU can never leave a shadow half-risen.
      arise: (questId) => {
        const { risen, rising } = get();
        if (rising || risen.includes(questId) || !quests.some((q) => q.id === questId)) return;
        set({ rising: questId });
        pulse(`quest:${questId}`);
        clearTimeout(riseTimer);
        riseTimer = setTimeout(() => get().finishRising(), ARISE_MS);
      },
      finishRising: () => {
        const { rising, risen } = get();
        if (!rising) return;
        clearTimeout(riseTimer);
        const next = [...risen, rising];
        set({ rising: null, risen: next });
        const quest = quests.find((q) => q.id === rising);
        get().pushToast({
          heading: world.toasts.arise,
          body: `[ ${quest?.name ?? rising} ] ${world.toasts.ariseBody}`,
          tone: "arcane",
        });
        if (quests.every((q) => next.includes(q.id))) get().completeQuest("arise");
      },

      completeQuest: (id) => {
        const { completed, xp } = get();
        const quest = visitorQuests.find((q) => q.id === id);
        if (!quest || completed.includes(id)) return;
        const nextXp = xp + quest.xp;
        const leveled = levelFor(nextXp) > levelFor(xp);
        const done = [...completed, id];
        set({ completed: done, xp: nextXp });
        get().pushToast({
          heading: leveled ? `${world.toasts.levelUp} · LV.${levelFor(nextXp)}` : world.toasts.questComplete,
          body: `${quest.name} — +${quest.xp} XP`,
          tone: "gold",
        });
        if (done.length === visitorQuests.length) {
          get().pushToast({ heading: "SYSTEM", body: world.toasts.allComplete, tone: "system" });
        }
      },

      pushToast: (toast) =>
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id: ++toastSeq }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      ask: (prompt) => {
        // a new question replaces an unanswered one: the old one counts as declined
        const waiting = get().prompt;
        if (waiting && waiting.id !== prompt.id) waiting.onAnswer?.(false);
        set({ prompt });
      },
      answer: (accepted) => {
        const prompt = get().prompt;
        if (!prompt) return;
        set({ prompt: null });
        prompt.onAnswer?.(accepted);
      },
      setGreeted: () => set({ greeted: true }),
      noteOffer: (accepted) =>
        set((s) => ({
          offers:
            accepted === null
              ? { ...s.offers, lastAt: Date.now() }
              : { ...s.offers, declinedInARow: accepted ? 0 : s.offers.declinedInARow + 1 },
        })),
      invite: () => set({ offers: { declinedInARow: 0, lastAt: 0 } }),
      resetProgress: () => {
        clearTimeout(riseTimer);
        set({ visited: [], risen: [], completed: [], xp: 0, rising: null });
      },
    }),
    {
      name: "codeonym-record-v9",
      // rehydrated after mount (Shell) so SSR and first client render match
      skipHydration: true,
      partialize: (s) => ({
        visited: s.visited,
        risen: s.risen,
        completed: s.completed,
        xp: s.xp,
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
