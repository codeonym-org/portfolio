import { create } from "zustand";
import type { Tone } from "@/config/types";
import type { Twist } from "./directive";

/**
 * ── EREBUS: WHAT THE HUD SHOWS ────────────────────────────────
 * A coarse copy of the simulation for React (refreshed ten times a
 * second, see `game.ts`), and what belongs to the interface alone:
 * the System's line, notices, the bargain window, which panel is
 * open. Nothing here is stored.
 */

export interface Hud {
  hp: number;
  maxHp: number;
  quest: { title: string; text: string; left: number; progress: number } | null;
  twist: { kind: Twist; left: number; total: number } | null;
  buffs: { might: number; haste: number; ward: number };
  /** 0 = ready, 1 = just used */
  cd: { dash: number; burst: number };
  near: { action: "raid" | "arise" | "read"; project: string } | null;
  enemies: number;
  dead: boolean;
  warden: { project: string; hp: number } | null;
  /** project ids by obelisk state, for the compass */
  revealed: string[];
}

export interface Notice {
  id: number;
  heading: string;
  body: string;
  tone: Tone;
}

export interface Bargain {
  heading: string;
  body: string;
  detail: string;
  onAnswer: (accepted: boolean) => void;
}

interface GameState {
  hud: Hud;
  /** what the System is saying */
  line: { text: string; at: number; mind: "model" | "local" } | null;
  notices: Notice[];
  bargain: Bargain | null;
  panel: null | "profile" | "help";
  /** the codex entry open inside the profile panel */
  entry: { kind: "project" | "skill"; id: string } | null;
  talking: boolean;
  /** the model is being asked */
  thinking: boolean;

  setHud: (hud: Hud) => void;
  say: (text: string, mind: "model" | "local") => void;
  notify: (notice: Omit<Notice, "id">) => void;
  dismiss: (id: number) => void;
  offer: (bargain: Bargain | null) => void;
  answer: (accepted: boolean) => void;
  open: (panel: GameState["panel"], entry?: GameState["entry"]) => void;
  setTalking: (talking: boolean) => void;
  setThinking: (thinking: boolean) => void;
}

export const emptyHud: Hud = { hp: 100, maxHp: 100, quest: null, twist: null, buffs: { might: 0, haste: 0, ward: 0 }, cd: { dash: 0, burst: 0 }, near: null, enemies: 0, dead: false, warden: null, revealed: [] };
let seq = 0;

export const useGame = create<GameState>((set, get) => ({
  hud: emptyHud,
  line: null,
  notices: [],
  bargain: null,
  panel: null,
  entry: null,
  talking: false,
  thinking: false,

  setHud: (hud) => set({ hud }),
  say: (text, mind) => text && set({ line: { text, at: Date.now(), mind } }),
  notify: (notice) => set((s) => ({ notices: [...s.notices.slice(-3), { ...notice, id: ++seq }] })),
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  offer: (bargain) => {
    // a new bargain replaces one left unanswered: that one is refused
    get().bargain?.onAnswer(false);
    set({ bargain });
  },
  answer: (accepted) => {
    const bargain = get().bargain;
    if (!bargain) return;
    set({ bargain: null });
    bargain.onAnswer(accepted);
  },
  open: (panel, entry = null) => set({ panel, entry }),
  setTalking: (talking) => set({ talking }),
  setThinking: (thinking) => set({ thinking }),
}));
