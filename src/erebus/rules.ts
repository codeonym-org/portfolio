/**
 * ── EREBUS: THE RULES ─────────────────────────────────────────
 * Every number the game runs on: levels, hunter ranks, what a stat
 * is worth, how strong an enemy is. Pure and dependency-free
 * (unit-tested with `node --test`).
 */

export type StatId = "str" | "agi" | "vit" | "sen";
export type Stats = Record<StatId, number>;
export const STAT_IDS: StatId[] = ["str", "agi", "vit", "sen"];
export const POINTS_PER_LEVEL = 3;

export type HunterRank = "E" | "D" | "C" | "B" | "A" | "S";
export type EnemyKind = "shade" | "spitter" | "brute";
export type FoeKind = EnemyKind | "warden";
export type ProjectRank = "S" | "A" | "B";

/** XP needed to leave `level` */
export const xpToLeave = (level: number) => 60 + (level - 1) * 45;

export function levelOf(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let left = Math.max(0, Math.floor(xp));
  while (left >= xpToLeave(level) && level < 99) {
    left -= xpToLeave(level);
    level++;
  }
  return { level, into: left, need: xpToLeave(level) };
}

const RANK_FROM: [number, HunterRank][] = [
  [22, "S"],
  [15, "A"],
  [10, "B"],
  [6, "C"],
  [3, "D"],
  [1, "E"],
];
export const hunterRank = (level: number): HunterRank => RANK_FROM.find(([from]) => level >= from)![1];

/** the level the burst is learned at */
export const BURST_LEVEL = 3;

export interface Derived {
  maxHp: number;
  damage: number;
  speed: number;
  dashCd: number;
  crit: number;
  reach: number;
  burst: boolean;
}

/** what the hunter can do with these stats at this level */
export function derive(stats: Stats, level: number): Derived {
  return {
    maxHp: Math.round(100 + stats.vit * 12 + (level - 1) * 6),
    damage: 14 + stats.str * 2.2 + (level - 1) * 0.8,
    speed: 8.2 + Math.min(stats.agi, 40) * 0.12,
    dashCd: Math.max(1, 2.6 - stats.agi * 0.06),
    crit: Math.min(0.6, 0.05 + stats.sen * 0.015),
    reach: 1.6 + Math.min(stats.sen, 30) * 0.15,
    burst: level >= BURST_LEVEL,
  };
}

export interface FoeStats {
  hp: number;
  dmg: number;
  speed: number;
  xp: number;
  /** how close it must be to strike */
  reach: number;
  /** seconds between the warning and the blow */
  windup: number;
  scale: number;
}

const BASE: Record<EnemyKind, FoeStats> = {
  shade: { hp: 34, dmg: 8, speed: 5.2, xp: 8, reach: 1.5, windup: 0.45, scale: 1 },
  spitter: { hp: 24, dmg: 7, speed: 4, xp: 10, reach: 10, windup: 0.5, scale: 0.85 },
  brute: { hp: 120, dmg: 20, speed: 2.9, xp: 26, reach: 2.2, windup: 0.8, scale: 1.45 },
};

const WARDEN: Record<ProjectRank, FoeStats> = {
  // sized for a hall, not a plain: the largest still leaves room to get round it
  B: { hp: 420, dmg: 20, speed: 3.6, xp: 120, reach: 2.6, windup: 0.75, scale: 1.9 },
  A: { hp: 700, dmg: 26, speed: 3.8, xp: 200, reach: 2.8, windup: 0.7, scale: 2.2 },
  S: { hp: 1100, dmg: 32, speed: 4, xp: 320, reach: 3, windup: 0.65, scale: 2.5 },
};

/** an enemy's numbers against a hunter of `level` */
export function foe(kind: EnemyKind, level: number): FoeStats {
  const b = BASE[kind];
  return { ...b, hp: Math.round(b.hp * (1 + 0.09 * (level - 1))), dmg: Math.round(b.dmg * (1 + 0.05 * (level - 1))) };
}

/** a Warden follows its project's rank, and a little the hunter's level */
export function warden(rank: ProjectRank, level: number): FoeStats {
  const b = WARDEN[rank];
  return { ...b, hp: Math.round(b.hp * (1 + 0.05 * (level - 1))), dmg: Math.round(b.dmg * (1 + 0.03 * (level - 1))) };
}

/** which enemies the System may send at this level */
export function unlockedKinds(level: number): EnemyKind[] {
  return level >= 4 ? ["shade", "spitter", "brute"] : level >= 2 ? ["shade", "spitter"] : ["shade"];
}

/** a small deterministic generator, so a run can be replayed in tests */
export function rngFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TrialGoal {
  id: "kills" | "echoes" | "quests";
  label: string;
  target: number;
}

/** the daily trial: the same three goals for everyone on a given day */
export function dailyTrial(day: string): TrialGoal[] {
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const r = rngFrom(seed);
  return [
    { id: "kills", label: "Shades put down", target: 20 + Math.floor(r() * 4) * 5 },
    { id: "echoes", label: "Echoes gathered", target: 10 + Math.floor(r() * 3) * 5 },
    { id: "quests", label: "System quests cleared", target: 2 + Math.floor(r() * 3) },
  ];
}
export const TRIAL_XP = 150;

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** the streak after clearing today's trial */
export function nextStreak(streak: number, lastDone: string | null, today: string): number {
  if (lastDone === today) return streak;
  if (!lastDone) return 1;
  const gap = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDone}T00:00:00Z`)) / 86_400_000);
  return gap === 1 ? streak + 1 : 1;
}
