import type { Gift, QuestType, Twist, Where } from "./directive.ts";
import { foe, warden, type Derived, type EnemyKind, type FoeKind, type ProjectRank } from "./rules.ts";

/**
 * ── EREBUS: THE SIMULATION ────────────────────────────────────
 * The whole game as plain numbers on a flat plateau (x, z): the
 * hunter, the enemies, the shadow soldiers, what lies on the ground
 * and what the System has set in motion. `step` advances it; the 3D
 * scene only draws it, and the bridge (`game.ts`) listens to what it
 * emits. No three.js, no React, no storage: unit-tested with
 * `node --test`.
 */

/** radius the hunter can walk */
export const ARENA = 38;
export const OBELISK_RING = 31;
const DASH_SPEED = 34;
const DASH_TIME = 0.18;
const BURST_RANGE = 6.5;
const BURST_CD = 9;
const MAX_FOES = 40;
const MAX_PICKUPS = 60;
const RUNES_ON_FIELD = 5;
export const MAX_SOLDIERS = 3;

export interface Input {
  /** where to walk, in world space; length up to 1 */
  mx: number;
  mz: number;
  attack: boolean;
  dash: boolean;
  burst: boolean;
}

export interface Hunter {
  x: number;
  z: number;
  yaw: number;
  hp: number;
  /** 0–1, how fast it is walking, for the legs */
  pace: number;
  attackT: number;
  attackCd: number;
  combo: number;
  comboT: number;
  dashT: number;
  dashCd: number;
  dx: number;
  dz: number;
  burstCd: number;
  burstT: number;
  invuln: number;
  hurtT: number;
  dead: boolean;
  /** seconds without moving or striking */
  idle: number;
}

export interface Foe {
  id: number;
  kind: FoeKind;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  xp: number;
  reach: number;
  windupTime: number;
  scale: number;
  cd: number;
  /** above 0 while the blow is announced */
  windup: number;
  flash: number;
  /** below 0 while alive, then seconds since it fell */
  dying: number;
  kx: number;
  kz: number;
  project?: string;
  /** Wardens: summons already called, and the next tremor */
  phase: number;
  special: number;
}

export interface Soldier {
  project: string;
  x: number;
  z: number;
  yaw: number;
  pace: number;
  cd: number;
  attackT: number;
}

export interface Pickup {
  id: number;
  kind: "echo" | "heal" | "rune";
  x: number;
  z: number;
  age: number;
  skill?: string;
}

export interface Shot {
  x: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
  dmg: number;
}

export interface Hazard {
  x: number;
  z: number;
  r: number;
  t: number;
  total: number;
}

export interface Obelisk {
  project: string;
  rank: ProjectRank;
  x: number;
  z: number;
  state: "sealed" | "raid" | "fallen" | "risen";
  revealed: boolean;
}

export interface Quest {
  type: QuestType;
  title: string;
  target: number;
  progress: number;
  /** 0 when the quest has no clock */
  seconds: number;
  left: number;
  xp: number;
  x: number;
  z: number;
}

export type SimEvent =
  | { type: "strike"; hits: number; crit: boolean; combo: number }
  | { type: "dash" }
  | { type: "burst" }
  | { type: "kill"; kind: FoeKind; xp: number }
  | { type: "hurt"; dmg: number }
  | { type: "blocked" }
  | { type: "died" }
  | { type: "pickup"; kind: Pickup["kind"]; skill?: string }
  | { type: "quest_done"; title: string; xp: number }
  | { type: "quest_failed"; title: string }
  | { type: "raid"; project: string }
  | { type: "warden_down"; project: string }
  | { type: "arise"; project: string }
  | { type: "blast" }
  | { type: "twist_end"; kind: Twist };

export interface SimOptions {
  /** every project, in the order the obelisks stand */
  projects: { id: string; rank: ProjectRank }[];
  /** project ids already raised */
  risen: string[];
  /** skill ids that can still be found as runes */
  runes: string[];
  derived: Derived;
  level: number;
  rng: () => number;
  emit: (event: SimEvent) => void;
}

export type Sim = ReturnType<typeof createSim>;

const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
/** shortest way from angle `a` to angle `b` */
const turn = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createSim(opts: SimOptions) {
  const { rng, emit } = opts;
  let ids = 0;

  const hunter: Hunter = { x: 0, z: 0, yaw: 0, hp: opts.derived.maxHp, pace: 0, attackT: 0, attackCd: 0, combo: 0, comboT: 0, dashT: 0, dashCd: 0, dx: 0, dz: 1, burstCd: 0, burstT: 0, invuln: 1.5, hurtT: 0, dead: false, idle: 0 };
  const foes: Foe[] = [];
  const soldiers: Soldier[] = [];
  const pickups: Pickup[] = [];
  const shots: Shot[] = [];
  const hazards: Hazard[] = [];
  const obelisks: Obelisk[] = opts.projects.map((p, i) => {
    const a = (i / opts.projects.length) * Math.PI * 2;
    return { project: p.id, rank: p.rank, x: Math.sin(a) * OBELISK_RING, z: Math.cos(a) * OBELISK_RING, state: opts.risen.includes(p.id) ? "risen" : "sealed", revealed: false };
  });
  const runePool = opts.runes.slice();
  const dashed = new Set<number>();

  const sim = {
    hunter,
    foes,
    soldiers,
    pickups,
    shots,
    hazards,
    obelisks,
    derived: opts.derived,
    level: opts.level,
    quest: null as Quest | null,
    twist: null as { kind: Twist; left: number; total: number } | null,
    buffs: { might: 0, haste: 0, ward: 0 },
    /** project id of the Warden being fought */
    raid: null as string | null,
    /** what E or F would do here */
    near: null as { action: "raid" | "arise" | "read"; project: string } | null,
    kills: 0,
    time: 0,
    twistT: 0,

    setDerived(derived: Derived, level: number) {
      const grew = derived.maxHp - sim.derived.maxHp;
      sim.derived = derived;
      sim.level = level;
      if (grew > 0 && !hunter.dead) hunter.hp = Math.min(derived.maxHp, hunter.hp + grew);
    },

    /** the soldiers that walk with the hunter: the last ones raised */
    deploy(projects: string[]) {
      const want = projects.slice(-MAX_SOLDIERS);
      for (let i = soldiers.length - 1; i >= 0; i--) if (!want.includes(soldiers[i].project)) soldiers.splice(i, 1);
      for (const project of want) {
        if (soldiers.some((s) => s.project === project)) continue;
        soldiers.push({ project, x: hunter.x - 1.5 + rng() * 3, z: hunter.z - 1.5 + rng() * 3, yaw: hunter.yaw, pace: 0, cd: 0, attackT: 0 });
      }
    },

    spawn(kind: EnemyKind, count: number, where: Where) {
      const giant = sim.twist?.kind === "giants";
      for (let i = 0; i < count && foes.length < MAX_FOES; i++) {
        const base = hunter.yaw + (where === "front" ? 0 : where === "behind" ? Math.PI : rng() * Math.PI * 2);
        const a = where === "ring" ? (i / count) * Math.PI * 2 + rng() * 0.5 : base + (rng() - 0.5) * 1.4;
        const d = where === "far" ? 16 + rng() * 6 : 9 + rng() * 5;
        const [x, z] = inside(hunter.x + Math.sin(a) * d, hunter.z + Math.cos(a) * d);
        const f = add(kind, foe(kind, sim.level), x, z);
        if (giant) enlarge(f);
      }
    },

    setQuest(q: { type: QuestType; target: number; seconds: number; title: string; xp: number }): boolean {
      if (sim.quest || hunter.dead) return false;
      let [x, z] = [0, 0];
      if (q.type === "reach") {
        const a = rng() * Math.PI * 2;
        const d = 22 + rng() * 10;
        [x, z] = inside(hunter.x + Math.sin(a) * d, hunter.z + Math.cos(a) * d, ARENA - 5);
        // a point pushed back inside the plateau can land too close: go the other way
        if (dist(x, z, hunter.x, hunter.z) < 14) [x, z] = inside(hunter.x - Math.sin(a) * d, hunter.z - Math.cos(a) * d, ARENA - 5);
      }
      if (q.type === "collect") scatter("echo", q.target + 3, 6, 16);
      sim.quest = { ...q, progress: 0, left: q.seconds, x, z };
      return true;
    },

    setTwist(kind: Twist, seconds: number) {
      if (sim.twist) emit({ type: "twist_end", kind: sim.twist.kind });
      sim.twist = { kind, left: seconds, total: seconds };
      sim.twistT = 0;
      if (kind === "calm") {
        for (const f of foes) if (f.kind !== "warden" && f.dying < 0) f.dying = 0;
        shots.length = 0;
        hazards.length = 0;
      }
      if (kind === "giants") for (const f of foes) if (f.kind !== "warden" && f.dying < 0 && f.scale < 1.8) enlarge(f);
    },

    gift(kind: Gift) {
      if (kind === "heal") hunter.hp = sim.derived.maxHp;
      else if (kind === "might") sim.buffs.might = 40;
      else if (kind === "haste") sim.buffs.haste = 40;
      else sim.buffs.ward = 3;
    },

    /** the price of a bargain */
    pay(price: "blood" | "brute" | "blackout" | "mirror") {
      if (price === "blood") hunter.hp = Math.max(1, Math.round(hunter.hp * 0.6));
      else if (price === "brute") sim.spawn("brute", sim.level >= 8 ? 2 : 1, "front");
      else sim.setTwist(price, price === "mirror" ? 15 : 20);
    },

    reveal(project: string) {
      const o = obelisks.find((x) => x.project === project);
      if (o && o.state === "sealed") o.revealed = true;
    },

    /** E: challenge the Warden of the obelisk the hunter stands at */
    interact(): boolean {
      const near = sim.near;
      if (!near || near.action !== "raid" || sim.raid || hunter.dead) return false;
      const o = obelisks.find((x) => x.project === near.project)!;
      o.state = "raid";
      o.revealed = false;
      sim.raid = o.project;
      const inward = Math.atan2(-o.x, -o.z);
      const w = add("warden", warden(o.rank, sim.level), o.x + Math.sin(inward) * 5, o.z + Math.cos(inward) * 5);
      w.project = o.project;
      const escorts = o.rank === "S" ? 4 : o.rank === "A" ? 3 : 2;
      for (let i = 0; i < escorts; i++) add("shade", foe("shade", sim.level), w.x + (rng() - 0.5) * 6, w.z + (rng() - 0.5) * 6);
      emit({ type: "raid", project: o.project });
      return true;
    },

    /** F: raise what the fallen Warden guarded */
    arise(): boolean {
      const near = sim.near;
      if (!near || near.action !== "arise" || hunter.dead) return false;
      const o = obelisks.find((x) => x.project === near.project)!;
      o.state = "risen";
      emit({ type: "arise", project: o.project });
      return true;
    },

    respawn() {
      foes.length = 0;
      shots.length = 0;
      hazards.length = 0;
      sim.twist = null;
      hunter.x = 0;
      hunter.z = 0;
      hunter.hp = sim.derived.maxHp;
      hunter.dead = false;
      hunter.invuln = 2.5;
      hunter.idle = 0;
      for (const s of soldiers) {
        s.x = rng() * 3 - 1.5;
        s.z = rng() * 3 - 1.5;
      }
    },

    step(dt: number, input: Input) {
      sim.time += dt;
      stepTwist(dt);
      stepHunter(dt, input);
      stepFoes(dt);
      stepSoldiers(dt);
      stepShots(dt);
      stepHazards(dt);
      stepPickups(dt);
      stepQuest(dt);
      findNear();
    },
  };

  function inside(x: number, z: number, radius = ARENA - 1): [number, number] {
    const d = Math.hypot(x, z);
    return d > radius ? [(x / d) * radius, (z / d) * radius] : [x, z];
  }

  function add(kind: FoeKind, s: ReturnType<typeof foe>, x: number, z: number): Foe {
    const f: Foe = { id: ++ids, kind, x, z, yaw: 0, hp: s.hp, maxHp: s.hp, dmg: s.dmg, speed: s.speed, xp: s.xp, reach: s.reach, windupTime: s.windup, scale: s.scale, cd: 0.6 + rng() * 0.6, windup: 0, flash: 0, dying: -1, kx: 0, kz: 0, phase: 0, special: 5 };
    foes.push(f);
    return f;
  }

  function enlarge(f: Foe) {
    f.scale *= 1.9;
    f.maxHp *= 3;
    f.hp *= 3;
    f.xp *= 3;
    f.reach *= 1.4;
  }

  function scatter(kind: "echo" | "heal", count: number, from: number, to: number) {
    for (let i = 0; i < count && pickups.length < MAX_PICKUPS; i++) {
      const a = rng() * Math.PI * 2;
      const d = from + rng() * (to - from);
      const [x, z] = inside(hunter.x + Math.sin(a) * d, hunter.z + Math.cos(a) * d);
      pickups.push({ id: ++ids, kind, x, z, age: 0 });
    }
  }

  function placeRunes() {
    while (runePool.length && pickups.filter((p) => p.kind === "rune").length < RUNES_ON_FIELD) {
      const a = rng() * Math.PI * 2;
      const d = 10 + rng() * 38;
      pickups.push({ id: ++ids, kind: "rune", x: Math.sin(a) * d, z: Math.cos(a) * d, age: 0, skill: runePool.shift() });
    }
  }
  placeRunes();

  function strike(f: Foe, dmg: number, push: number) {
    if (f.dying >= 0) return;
    f.hp -= dmg;
    f.flash = 0.14;
    const heavy = f.kind === "warden" ? 0.12 : f.kind === "brute" ? 0.4 : 1;
    const d = dist(f.x, f.z, hunter.x, hunter.z) || 1;
    f.kx += ((f.x - hunter.x) / d) * push * heavy;
    f.kz += ((f.z - hunter.z) / d) * push * heavy;
    if (f.hp > 0) return;
    f.dying = 0;
    f.windup = 0;
    sim.kills++;
    const bonus = sim.twist?.kind === "frenzy" ? 2 : sim.twist?.kind === "blackout" ? 1.5 : 1;
    emit({ type: "kill", kind: f.kind, xp: Math.round(f.xp * bonus) });
    if (sim.quest?.type === "slay") sim.quest.progress++;
    if (f.kind === "warden" && f.project) {
      const o = obelisks.find((x) => x.project === f.project);
      if (o) o.state = "fallen";
      sim.raid = null;
      for (const other of foes) if (other.dying < 0) other.dying = 0;
      scatter("echo", 8, 1, 5);
      emit({ type: "warden_down", project: f.project });
      return;
    }
    const roll = rng();
    if (roll < 0.06) pickups.push({ id: ++ids, kind: "heal", x: f.x, z: f.z, age: 0 });
    else if (roll < 0.4 && pickups.length < MAX_PICKUPS) pickups.push({ id: ++ids, kind: "echo", x: f.x, z: f.z, age: 0 });
  }

  function hurt(dmg: number) {
    if (hunter.dead || hunter.invuln > 0) return;
    if (sim.buffs.ward > 0) {
      sim.buffs.ward--;
      hunter.invuln = 0.35;
      emit({ type: "blocked" });
      return;
    }
    hunter.hp -= dmg;
    hunter.hurtT = 0.3;
    hunter.invuln = 0.4;
    emit({ type: "hurt", dmg });
    if (sim.quest?.type === "untouched") failQuest();
    if (hunter.hp > 0) return;
    hunter.hp = 0;
    hunter.dead = true;
    if (sim.quest) failQuest();
    if (sim.raid) {
      const o = obelisks.find((x) => x.project === sim.raid);
      if (o) o.state = "sealed";
      sim.raid = null;
    }
    emit({ type: "died" });
  }

  function failQuest() {
    if (!sim.quest) return;
    emit({ type: "quest_failed", title: sim.quest.title });
    sim.quest = null;
  }

  function stepTwist(dt: number) {
    const t = sim.twist;
    for (const key of ["might", "haste"] as const) if (sim.buffs[key] > 0) sim.buffs[key] = Math.max(0, sim.buffs[key] - dt);
    if (!t) return;
    t.left -= dt;
    sim.twistT += dt;
    if (t.kind === "tremor" && sim.twistT > 0.8 && !hunter.dead) {
      sim.twistT = 0;
      const on = rng() < 0.4;
      const a = rng() * Math.PI * 2;
      const d = on ? 0 : 2 + rng() * 5;
      hazards.push({ x: hunter.x + Math.sin(a) * d, z: hunter.z + Math.cos(a) * d, r: 2.4, t: 1.3, total: 1.3 });
    }
    if (t.kind === "echo_rain" && sim.twistT > 0.45) {
      sim.twistT = 0;
      scatter("echo", 1, 1, 9);
    }
    if (t.kind === "calm" && !hunter.dead) hunter.hp = Math.min(sim.derived.maxHp, hunter.hp + sim.derived.maxHp * 0.04 * dt);
    if (t.left <= 0) {
      sim.twist = null;
      emit({ type: "twist_end", kind: t.kind });
    }
  }

  function stepHunter(dt: number, input: Input) {
    const h = hunter;
    for (const key of ["attackT", "attackCd", "comboT", "dashCd", "burstCd", "burstT", "invuln", "hurtT"] as const) if (h[key] > 0) h[key] = Math.max(0, h[key] - dt);
    if (h.dead) {
      h.pace = 0;
      return;
    }
    const mirror = sim.twist?.kind === "mirror" ? -1 : 1;
    let mx = input.mx * mirror;
    let mz = input.mz * mirror;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const moving = len > 0.08;
    h.idle = moving || input.attack || input.dash || input.burst ? 0 : h.idle + dt;

    if (input.dash && h.dashCd <= 0 && h.dashT <= 0) {
      h.dashT = DASH_TIME;
      h.dashCd = sim.derived.dashCd;
      h.invuln = Math.max(h.invuln, 0.32);
      [h.dx, h.dz] = moving ? [mx, mz] : [Math.sin(h.yaw), Math.cos(h.yaw)];
      const dl = Math.hypot(h.dx, h.dz) || 1;
      h.dx /= dl;
      h.dz /= dl;
      h.yaw = Math.atan2(h.dx, h.dz);
      dashed.clear();
      emit({ type: "dash" });
    }

    if (h.dashT > 0) {
      h.dashT -= dt;
      [h.x, h.z] = inside(h.x + h.dx * DASH_SPEED * dt, h.z + h.dz * DASH_SPEED * dt);
      for (const f of foes) {
        if (f.dying >= 0 || dashed.has(f.id) || dist(f.x, f.z, h.x, h.z) > 1.5 + f.scale * 0.4) continue;
        dashed.add(f.id);
        strike(f, damage() * 1.2, 5);
      }
      h.pace = 1;
    } else {
      const speed = sim.derived.speed * (sim.buffs.haste > 0 ? 1.35 : 1) * (h.attackT > 0 ? 0.45 : 1);
      [h.x, h.z] = inside(h.x + mx * speed * dt, h.z + mz * speed * dt);
      h.pace += ((moving ? Math.min(1, len) : 0) - h.pace) * Math.min(1, dt * 12);
      if (moving && h.attackT <= 0) h.yaw += turn(h.yaw, Math.atan2(mx, mz)) * Math.min(1, dt * 14);
    }

    if (input.attack && h.attackCd <= 0 && h.dashT <= 0) {
      let best: Foe | null = null;
      let bestD = 6.5;
      for (const f of foes) {
        const d = dist(f.x, f.z, h.x, h.z) - f.scale * 0.4;
        if (f.dying < 0 && d < bestD) [best, bestD] = [f, d];
      }
      if (best) h.yaw = Math.atan2(best.x - h.x, best.z - h.z);
      h.combo = h.comboT > 0 ? (h.combo + 1) % 3 : 0;
      h.comboT = 0.9;
      const finisher = h.combo === 2;
      let hits = 0;
      let anyCrit = false;
      for (const f of foes) {
        if (f.dying >= 0) continue;
        const d = dist(f.x, f.z, h.x, h.z);
        const range = 3 + f.scale * 0.45 + (finisher ? 0.6 : 0);
        if (d > range) continue;
        if (d > 1.2 && Math.abs(turn(h.yaw, Math.atan2(f.x - h.x, f.z - h.z))) > 1.1) continue;
        const crit = rng() < sim.derived.crit;
        anyCrit ||= crit;
        strike(f, damage() * (finisher ? 1.7 : 1) * (crit ? 2 : 1), finisher ? 9 : 5);
        hits++;
      }
      h.attackT = 0.26;
      h.attackCd = finisher ? 0.46 : 0.3;
      emit({ type: "strike", hits, crit: anyCrit, combo: h.combo });
    }

    if (input.burst && sim.derived.burst && h.burstCd <= 0) {
      h.burstCd = BURST_CD;
      h.burstT = 0.6;
      for (const f of foes) if (f.dying < 0 && dist(f.x, f.z, h.x, h.z) < BURST_RANGE + f.scale * 0.4) strike(f, damage() * 2.5, 14);
      shots.length = 0;
      emit({ type: "burst" });
    }
  }

  const damage = () => sim.derived.damage * (sim.buffs.might > 0 ? 1.5 : 1);

  function stepFoes(dt: number) {
    const slow = sim.twist?.kind === "time_slow" ? 0.4 : 1;
    const fast = sim.twist?.kind === "frenzy" ? 1.5 : 1;
    const edt = dt * slow;
    const h = hunter;
    for (let i = foes.length - 1; i >= 0; i--) {
      const f = foes[i];
      if (f.flash > 0) f.flash -= dt;
      if (f.dying >= 0) {
        f.dying += dt;
        if (f.dying > 0.6) foes.splice(i, 1);
        continue;
      }
      // knockback
      f.x += f.kx * dt;
      f.z += f.kz * dt;
      f.kx *= Math.max(0, 1 - dt * 7);
      f.kz *= Math.max(0, 1 - dt * 7);
      if (h.dead) continue;

      const dx = h.x - f.x;
      const dz = h.z - f.z;
      const d = Math.hypot(dx, dz) || 0.001;
      f.yaw += turn(f.yaw, Math.atan2(dx, dz)) * Math.min(1, edt * 8);
      if (f.cd > 0) f.cd -= edt;

      if (f.windup > 0) {
        f.windup -= edt;
        if (f.windup <= 0) {
          if (f.kind === "spitter") shots.push({ x: f.x, z: f.z, vx: (dx / d) * 11, vz: (dz / d) * 11, life: 2.2, dmg: f.dmg });
          else if (d <= f.reach + 0.8) hurt(f.dmg);
          f.cd = f.kind === "brute" || f.kind === "warden" ? 1.7 : f.kind === "spitter" ? 2.4 : 1.1;
        }
        continue;
      }

      const step = f.speed * fast * edt;
      if (f.kind === "spitter") {
        const want = d > 10 ? 1 : d < 6 ? -1 : 0;
        f.x += (dx / d) * step * want;
        f.z += (dz / d) * step * want;
        if (f.cd <= 0 && d < 15) f.windup = f.windupTime;
      } else {
        if (d > f.reach * 0.8) {
          f.x += (dx / d) * step;
          f.z += (dz / d) * step;
        }
        if (d <= f.reach && f.cd <= 0) f.windup = f.windupTime;
      }

      if (f.kind === "warden") {
        f.special -= edt;
        if (f.special <= 0) {
          f.special = 7;
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2;
            hazards.push({ x: h.x + Math.sin(a) * 3.2 * (k ? 1 : 0), z: h.z + Math.cos(a) * 3.2 * (k ? 1 : 0), r: 2.4, t: 1.4, total: 1.4 });
          }
        }
        const share = f.hp / f.maxHp;
        if ((share < 0.66 && f.phase === 0) || (share < 0.33 && f.phase === 1)) {
          f.phase++;
          for (let k = 0; k < 3; k++) add("shade", foe("shade", sim.level), f.x + (rng() - 0.5) * 5, f.z + (rng() - 0.5) * 5);
        }
      }
      [f.x, f.z] = inside(f.x, f.z, ARENA + 2);
    }
    // enemies do not stand inside each other
    for (let i = 0; i < foes.length; i++) {
      const a = foes[i];
      if (a.dying >= 0) continue;
      for (let j = i + 1; j < foes.length; j++) {
        const b = foes[j];
        if (b.dying >= 0) continue;
        const min = (a.scale + b.scale) * 0.5;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d >= min || d === 0) continue;
        const push = (min - d) / 2;
        const wa = a.kind === "warden" ? 0 : 1;
        const wb = b.kind === "warden" ? 0 : 1;
        a.x -= (dx / d) * push * wa;
        a.z -= (dz / d) * push * wa;
        b.x += (dx / d) * push * wb;
        b.z += (dz / d) * push * wb;
      }
    }
  }

  function stepSoldiers(dt: number) {
    const h = hunter;
    soldiers.forEach((s, i) => {
      if (s.cd > 0) s.cd -= dt;
      if (s.attackT > 0) s.attackT -= dt;
      let target: Foe | null = null;
      let best = 14;
      for (const f of foes) {
        if (f.dying >= 0 || dist(f.x, f.z, h.x, h.z) > 15) continue;
        const d = dist(f.x, f.z, s.x, s.z);
        if (d < best) [target, best] = [f, d];
      }
      let tx: number;
      let tz: number;
      let stop: number;
      if (target && !h.dead) {
        [tx, tz, stop] = [target.x, target.z, 1.6 + target.scale * 0.45];
        if (best <= stop + 0.3 && s.cd <= 0) {
          s.cd = 0.9;
          s.attackT = 0.26;
          strike(target, sim.derived.damage * 0.6, 3);
        }
      } else {
        const a = h.yaw + Math.PI + (i - (soldiers.length - 1) / 2) * 0.9;
        [tx, tz, stop] = [h.x + Math.sin(a) * 2.6, h.z + Math.cos(a) * 2.6, 0.5];
      }
      const dx = tx - s.x;
      const dz = tz - s.z;
      const d = Math.hypot(dx, dz);
      const go = d > stop;
      if (go) {
        const speed = Math.min(d > 9 ? 18 : 8.5, (d - stop) / dt);
        s.x += (dx / d) * speed * dt;
        s.z += (dz / d) * speed * dt;
      }
      if (d > 0.3) s.yaw += turn(s.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10);
      s.pace += ((go ? 1 : 0) - s.pace) * Math.min(1, dt * 10);
    });
  }

  function stepShots(dt: number) {
    const slow = sim.twist?.kind === "time_slow" ? 0.4 : 1;
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt * slow;
      s.z += s.vz * dt * slow;
      s.life -= dt * slow;
      if (dist(s.x, s.z, hunter.x, hunter.z) < 0.9) {
        hurt(s.dmg);
        shots.splice(i, 1);
      } else if (s.life <= 0) shots.splice(i, 1);
    }
  }

  function stepHazards(dt: number) {
    for (let i = hazards.length - 1; i >= 0; i--) {
      const z = hazards[i];
      z.t -= dt;
      if (z.t > 0) continue;
      emit({ type: "blast" });
      if (dist(z.x, z.z, hunter.x, hunter.z) < z.r) hurt(10 + sim.level * 2);
      hazards.splice(i, 1);
    }
  }

  function stepPickups(dt: number) {
    const h = hunter;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.age += dt;
      if (p.kind === "echo" && p.age > 45) {
        pickups.splice(i, 1);
        continue;
      }
      if (h.dead) continue;
      const d = dist(p.x, p.z, h.x, h.z);
      // echoes and heals are drawn to the hunter
      if (p.kind !== "rune" && d < sim.derived.reach * 2.4 && d > 0.01) {
        p.x += ((h.x - p.x) / d) * 13 * dt;
        p.z += ((h.z - p.z) / d) * 13 * dt;
      }
      if (d > (p.kind === "rune" ? 1.7 : Math.max(1, sim.derived.reach * 0.6))) continue;
      pickups.splice(i, 1);
      if (p.kind === "heal") h.hp = Math.min(sim.derived.maxHp, h.hp + sim.derived.maxHp * 0.3);
      if (p.kind === "echo" && sim.quest?.type === "collect") sim.quest.progress++;
      emit({ type: "pickup", kind: p.kind, skill: p.skill });
      if (p.kind === "rune") placeRunes();
    }
  }

  function stepQuest(dt: number) {
    const q = sim.quest;
    if (!q || hunter.dead) return;
    let done = false;
    if (q.seconds) q.left -= dt;
    if (q.type === "slay" || q.type === "collect") done = q.progress >= q.target;
    else if (q.type === "survive" || q.type === "untouched") done = q.left <= 0;
    else if (q.type === "reach") {
      done = dist(q.x, q.z, hunter.x, hunter.z) < 3;
      if (!done && q.left <= 0) return failQuest();
    }
    if (!done) return;
    sim.quest = null;
    emit({ type: "quest_done", title: q.title, xp: q.xp });
  }

  function findNear() {
    sim.near = null;
    let best = 7;
    for (const o of obelisks) {
      const d = dist(o.x, o.z, hunter.x, hunter.z);
      if (d >= best) continue;
      if (o.state === "fallen") [sim.near, best] = [{ action: "arise", project: o.project }, d];
      else if (d < 5.5 && o.state === "sealed" && !sim.raid) [sim.near, best] = [{ action: "raid", project: o.project }, d];
      else if (d < 5.5 && o.state === "risen") [sim.near, best] = [{ action: "read", project: o.project }, d];
    }
  }

  return sim;
}
