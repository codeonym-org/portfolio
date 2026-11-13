import { create } from "zustand";
import { persist } from "zustand/middleware";
import { erebus } from "@/config/erebus.config";
import { dailyTrial, dayKey, levelOf, nextStreak, POINTS_PER_LEVEL, STAT_IDS, TRIAL_XP, type StatId, type Stats } from "./rules";

/**
 * ── EREBUS: THE HUNTER'S PROFILE ──────────────────────────────
 * Everything the visitor keeps between visits, in this browser's
 * local storage (`codeonym-erebus-v1`). The level and the hunter
 * rank are never stored: they follow from the XP (`rules.ts`).
 */

type Counter = "kills" | "deaths" | "wardens" | "quests" | "echoes";

export interface Trial {
  day: string;
  kills: number;
  echoes: number;
  quests: number;
  done: boolean;
}

interface ProfileState {
  name: string | null;
  createdAt: number;
  xp: number;
  /** stat points not spent yet */
  points: number;
  stats: Stats;
  /** project ids raised as shadows */
  shadows: string[];
  /** skill ids found as runes */
  runes: string[];
  titles: string[];
  /** the title worn */
  title: string | null;
  kills: number;
  deaths: number;
  wardens: number;
  quests: number;
  echoes: number;
  /** seconds played */
  seconds: number;
  /** XP brought from First Light when the profile was made */
  carried: number;
  trial: Trial;
  streak: number;
  lastTrial: string | null;

  create: (name: string, carried: { xp: number; risen: string[] }) => void;
  /** returns how many levels were gained */
  gainXp: (amount: number) => number;
  spend: (stat: StatId) => void;
  addShadow: (project: string) => void;
  /** returns the stat the rune raised, or null if it was already known */
  addRune: (skill: string) => StatId | null;
  /** false if the hunter already has it */
  addTitle: (title: string) => boolean;
  wear: (title: string | null) => void;
  /** returns true when this completed today's trial */
  count: (what: Counter, n?: number) => boolean;
  addSeconds: (n: number) => void;
  reset: () => void;
}

const emptyTrial = (day: string): Trial => ({ day, kills: 0, echoes: 0, quests: 0, done: false });
const fresh = {
  name: null as string | null,
  createdAt: 0,
  xp: 0,
  points: 0,
  stats: { str: 0, agi: 0, vit: 0, sen: 0 } as Stats,
  shadows: [] as string[],
  runes: [] as string[],
  titles: [] as string[],
  title: null as string | null,
  kills: 0,
  deaths: 0,
  wardens: 0,
  quests: 0,
  echoes: 0,
  seconds: 0,
  carried: 0,
  trial: emptyTrial(""),
  streak: 0,
  lastTrial: null as string | null,
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...fresh,
      create: (name, carried) => {
        const xp = Math.max(0, Math.floor(carried.xp));
        set({ ...fresh, stats: { ...fresh.stats }, name, createdAt: Date.now(), xp, carried: xp, points: (levelOf(xp).level - 1) * POINTS_PER_LEVEL, shadows: carried.risen.slice(), trial: emptyTrial(dayKey(new Date())) });
      },
      gainXp: (amount) => {
        const before = levelOf(get().xp).level;
        const xp = get().xp + Math.max(0, Math.round(amount));
        const gained = levelOf(xp).level - before;
        set({ xp, points: get().points + gained * POINTS_PER_LEVEL });
        return gained;
      },
      spend: (stat) => {
        const s = get();
        if (s.points > 0) set({ points: s.points - 1, stats: { ...s.stats, [stat]: s.stats[stat] + 1 } });
      },
      addShadow: (project) => {
        if (!get().shadows.includes(project)) set({ shadows: [...get().shadows, project] });
      },
      addRune: (skill) => {
        const s = get();
        if (s.runes.includes(skill)) return null;
        const stat = STAT_IDS[s.runes.length % STAT_IDS.length];
        set({ runes: [...s.runes, skill], stats: { ...s.stats, [stat]: s.stats[stat] + 1 } });
        return stat;
      },
      addTitle: (title) => {
        const s = get();
        if (s.titles.some((t) => t.toLowerCase() === title.toLowerCase()) || s.titles.length >= 40) return false;
        set({ titles: [...s.titles, title], title: s.title ?? title });
        return true;
      },
      wear: (title) => set({ title }),
      count: (what, n = 1) => {
        const s = get();
        const today = dayKey(new Date());
        const trial = s.trial.day === today ? { ...s.trial } : emptyTrial(today);
        if (what === "kills" || what === "echoes" || what === "quests") trial[what] += n;
        const cleared = !trial.done && dailyTrial(today).every((g) => trial[g.id] >= g.target);
        if (cleared) trial.done = true;
        set({ [what]: s[what] + n, trial, ...(cleared ? { streak: nextStreak(s.streak, s.lastTrial, today), lastTrial: today } : {}) });
        if (cleared) get().gainXp(TRIAL_XP);
        return cleared;
      },
      addSeconds: (n) => set({ seconds: get().seconds + n }),
      reset: () => set({ ...fresh, stats: { ...fresh.stats } }),
    }),
    {
      name: erebus.storageKey,
      // rehydrated after mount so the server and the first client render match
      skipHydration: true,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")),
    },
  ),
);
