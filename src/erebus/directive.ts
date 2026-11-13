import type { EnemyKind } from "./rules.ts";

/**
 * ── EREBUS: WHAT THE SYSTEM MAY DO ────────────────────────────
 * The director (the model, or the local tables) answers an event
 * with a directive: one line of speech and up to three actions from
 * this list. Nothing a director returns is trusted: `sanitize`
 * rebuilds it, drops what is unknown and clamps every number.
 * Pure and dependency-free (unit-tested with `node --test`).
 */

export const ENEMY_KINDS: EnemyKind[] = ["shade", "spitter", "brute"];
export const TWISTS = ["blackout", "time_slow", "frenzy", "giants", "mirror", "tremor", "calm", "echo_rain"] as const;
export type Twist = (typeof TWISTS)[number];
export const GIFTS = ["heal", "might", "haste", "ward"] as const;
export type Gift = (typeof GIFTS)[number];
export const PRICES = ["blood", "brute", "blackout", "mirror"] as const;
export type Price = (typeof PRICES)[number];
export const QUESTS = ["slay", "survive", "reach", "untouched", "collect"] as const;
export type QuestType = (typeof QUESTS)[number];
export const WHERE = ["ring", "front", "behind", "far"] as const;
export type Where = (typeof WHERE)[number];

export type Action =
  | { do: "spawn"; kind: EnemyKind; count: number; where: Where }
  | { do: "quest"; type: QuestType; target: number; seconds: number; title: string; xp: number }
  | { do: "twist"; kind: Twist; seconds: number }
  | { do: "gift"; kind: Gift }
  | { do: "bargain"; gift: Gift | "xp"; price: Price; text: string }
  | { do: "reveal"; project: string }
  | { do: "title"; text: string };

export interface Directive {
  say: string;
  actions: Action[];
}

export const EVENTS = ["enter", "lull", "pulse", "quest_done", "quest_failed", "level_up", "warden_down", "arise", "low_hp", "idle", "died", "said"] as const;
export type EventType = (typeof EVENTS)[number];

export interface GameEvent {
  type: EventType;
  /** a project id, a quest title or what the visitor said */
  detail?: string;
}

/** what a director is told about the game */
export interface Snapshot {
  name: string;
  level: number;
  rank: string;
  /** 0–100 */
  hp: number;
  enemies: number;
  kills: number;
  deaths: number;
  minutes: number;
  idleSeconds: number;
  quest: string | null;
  twist: string | null;
  raid: string | null;
  /** project ids */
  sealed: string[];
  fallen: string[];
  risen: string[];
  titles: string[];
  /** what the System said last, newest last */
  said: string[];
  returning: boolean;
}

export interface Limits {
  /** kinds the hunter's level allows */
  kinds: EnemyKind[];
  /** project ids that can still be revealed */
  projects: string[];
  level: number;
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
};
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
/** one line of plain text: no markup, no control characters, no links */
export function line(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const flat = v
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[<>`*_#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

const QUEST_SECONDS: Record<QuestType, [number, number, number]> = {
  slay: [0, 0, 0],
  collect: [0, 0, 0],
  survive: [15, 90, 40],
  untouched: [8, 40, 15],
  reach: [10, 60, 25],
};

function action(raw: unknown, limits: Limits): Action | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  switch (a.do) {
    case "spawn": {
      const kind = oneOf(ENEMY_KINDS, a.kind) ?? "shade";
      const allowed = limits.kinds.includes(kind) ? kind : "shade";
      const max = allowed === "brute" ? 3 : 8;
      return { do: "spawn", kind: allowed, count: clamp(a.count, 1, max, 3), where: oneOf(WHERE, a.where) ?? "ring" };
    }
    case "quest": {
      const type = oneOf(QUESTS, a.type);
      if (!type) return null;
      const [lo, hi, d] = QUEST_SECONDS[type];
      const target = type === "slay" || type === "collect" ? clamp(a.target, 2, 25, 5) : 1;
      return {
        do: "quest",
        type,
        target,
        seconds: hi ? clamp(a.seconds, lo, hi, d) : 0,
        title: line(a.title, 48) || "The System's errand",
        xp: clamp(a.xp, 10, 60 + limits.level * 25, 30 + limits.level * 8),
      };
    }
    case "twist": {
      const kind = oneOf(TWISTS, a.kind);
      return kind ? { do: "twist", kind, seconds: clamp(a.seconds, 6, 45, 18) } : null;
    }
    case "gift": {
      const kind = oneOf(GIFTS, a.kind);
      return kind ? { do: "gift", kind } : null;
    }
    case "bargain": {
      const gift = a.gift === "xp" ? "xp" : oneOf(GIFTS, a.gift);
      const price = oneOf(PRICES, a.price);
      const text = line(a.text, 160);
      return gift && price && text ? { do: "bargain", gift, price, text } : null;
    }
    case "reveal":
      return typeof a.project === "string" && limits.projects.includes(a.project) ? { do: "reveal", project: a.project } : null;
    case "title": {
      const text = line(a.text, 36);
      return text.length >= 3 ? { do: "title", text } : null;
    }
    default:
      return null;
  }
}

/** rebuild a directive from anything: null when there is nothing usable in it */
export function sanitize(raw: unknown, limits: Limits): Directive | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const say = line(r.say, 220);
  const seen = new Set<string>();
  const actions: Action[] = [];
  for (const item of Array.isArray(r.actions) ? r.actions.slice(0, 6) : []) {
    const a = action(item, limits);
    // one of each kind of action per directive, except spawns (two)
    if (!a) continue;
    const key = a.do === "spawn" ? `spawn:${a.kind}` : a.do;
    if (seen.has(key) || actions.length >= 3) continue;
    seen.add(key);
    actions.push(a);
  }
  return say || actions.length ? { say, actions } : null;
}

/** the first JSON object in a model's reply, whatever surrounds it */
export function parseReply(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}
