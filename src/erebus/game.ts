import { erebus } from "@/config/erebus.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skills } from "@/config/skills.config";
import { play } from "@/lib/audio";
import { masteryGrade } from "@/lib/rarity";
import type { Action, Directive, EventType, GameEvent, Limits, Snapshot } from "./directive";
import { useGame, type Hud } from "./game-store";
import { controls, moveVector } from "./input";
import { localDirective } from "./local-director";
import { useProfile } from "./profile-store";
import { derive, hunterRank, levelOf, rngFrom, unlockedKinds, type ProjectRank } from "./rules";
import { createSim, type Sim, type SimEvent } from "./sim";

/**
 * ── EREBUS: THE BRIDGE ────────────────────────────────────────
 * Runs the simulation and turns what it emits into everything else:
 * XP and the profile, sounds, notices, and reports to the director
 * (`direct`), whose directives it carries out. One game at a time;
 * the 3D scene reads `game.sim` and `game.fx` every frame.
 */

const RANK_ORDER: Record<ProjectRank, number> = { B: 0, A: 1, S: 2 };
/** the obelisks, weakest first around the ring */
export const projects = quests.slice().sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
export const projectById = (id: string) => projects.find((p) => p.id === id);

const jobCategories = new Set(skillCategories.filter((c) => c.set === "job").map((c) => c.id));
/** the skills that lie on the plateau as runes: the strongest of the craft */
export const runeSkills = skills
  .filter((s) => jobCategories.has(s.category))
  .sort((a, b) => b.mastery - a.mastery)
  .slice(0, 16);

/** moments the scene draws: when each last happened (seconds of game time) */
export const game = {
  sim: null as Sim | null,
  fx: { slash: -9, combo: 0, burst: -9, hurt: -9, arise: -9, level: -9, shake: 0 },
  /** how a directive is obtained; ticket GH-77 puts the model in front of the local tables */
  direct: null as null | ((event: GameEvent, snap: Snapshot, limits: Limits) => Promise<{ directive: Directive; mind: "model" | "local" } | null>),
};

const rng = rngFrom((Date.now() ^ 0x9e3779b9) >>> 0);
const said: string[] = [];
const timers = { lull: 0, pulse: 35, idle: 0, low: 0, hud: 0, seconds: 0, session: 0 };
let respawnTimer: ReturnType<typeof setTimeout> | undefined;

const profile = () => useProfile.getState();
const level = () => levelOf(profile().xp).level;
const ui = () => useGame.getState();

function syncStats() {
  const p = profile();
  game.sim?.setDerived(derive(p.stats, levelOf(p.xp).level), levelOf(p.xp).level);
}

function gain(xp: number) {
  const gained = profile().gainXp(xp);
  if (!gained) return;
  const now = level();
  syncStats();
  game.fx.level = game.sim?.time ?? 0;
  play("levelup", { volume: 0.5 });
  ui().notify({ heading: `LEVEL UP · LV.${now} · RANK ${hunterRank(now)}`, body: `+${gained * 3} stat points. Press C to spend them.`, tone: "gold" });
  report({ type: "level_up", detail: String(now) });
}

function tally(what: "kills" | "deaths" | "wardens" | "quests" | "echoes") {
  if (!profile().count(what)) return;
  play("levelup", { volume: 0.5 });
  ui().notify({ heading: "DAILY TRIAL CLEARED", body: `+150 XP. Streak: ${profile().streak} ${profile().streak === 1 ? "day" : "days"}.`, tone: "gold" });
  syncStats();
}

function onSim(e: SimEvent) {
  const sim = game.sim;
  if (!sim) return;
  switch (e.type) {
    case "strike":
      game.fx.slash = sim.time;
      game.fx.combo = e.combo;
      play("blade", { volume: e.hits ? 0.32 : 0.14, rate: e.combo === 2 ? 0.8 : 1 + e.combo * 0.12 });
      if (e.hits) game.fx.shake = Math.max(game.fx.shake, e.crit || e.combo === 2 ? 0.35 : 0.14);
      break;
    case "dash":
      play("open", { volume: 0.3, rate: 1.7 });
      break;
    case "burst":
      game.fx.burst = sim.time;
      game.fx.shake = 0.7;
      play("portal", { volume: 0.5, rate: 1.3 });
      break;
    case "kill":
      gain(e.xp);
      tally("kills");
      break;
    case "hurt":
      game.fx.hurt = sim.time;
      game.fx.shake = Math.max(game.fx.shake, 0.4);
      play("close", { volume: 0.4, rate: 0.7 });
      break;
    case "blocked":
      play("confirm", { volume: 0.3, rate: 1.5 });
      break;
    case "blast":
      game.fx.shake = Math.max(game.fx.shake, 0.25);
      break;
    case "died":
      tally("deaths");
      play("portal", { volume: 0.5, rate: 0.6 });
      report({ type: "died" });
      clearTimeout(respawnTimer);
      respawnTimer = setTimeout(() => game.sim?.respawn(), 3400);
      break;
    case "pickup":
      if (e.kind === "echo") {
        play("coins", { volume: 0.18, rate: 1.2 });
        gain(4 + level());
        tally("echoes");
      } else if (e.kind === "heal") play("confirm", { volume: 0.4 });
      else if (e.skill) {
        const skill = skills.find((s) => s.id === e.skill);
        const stat = profile().addRune(e.skill);
        if (skill && stat) {
          syncStats();
          play("system", { volume: 0.5 });
          ui().notify({ heading: `RUNE · ${skill.name.toUpperCase()} · GRADE ${masteryGrade(skill.mastery)}`, body: `One of Ayoub's skills. +1 ${erebus.stats[stat].name}. Press C to read it.`, tone: "system" });
        }
      }
      break;
    case "quest_done":
      play("confirm", { volume: 0.5 });
      ui().notify({ heading: "QUEST CLEARED", body: `${e.title} · +${e.xp} XP`, tone: "gold" });
      gain(e.xp);
      tally("quests");
      report({ type: "quest_done", detail: e.title });
      break;
    case "quest_failed":
      ui().notify({ heading: "QUEST FAILED", body: e.title, tone: "ember" });
      report({ type: "quest_failed", detail: e.title });
      break;
    case "raid": {
      const p = projectById(e.project);
      play("portal", { volume: 0.6, rate: 0.8 });
      ui().notify({ heading: `WARDEN · RANK ${p?.rank ?? "?"}`, body: `It guards ${p?.name ?? e.project}. Bring it down.`, tone: "ember" });
      break;
    }
    case "warden_down":
      tally("wardens");
      play("levelup", { volume: 0.5, rate: 0.8 });
      report({ type: "warden_down", detail: e.project });
      break;
    case "arise": {
      const p = projectById(e.project);
      profile().addShadow(e.project);
      sim.deploy(profile().shadows);
      game.fx.arise = sim.time;
      game.fx.shake = 0.6;
      play("arise");
      ui().notify({ heading: `ARISE · ${(p?.name ?? e.project).toUpperCase()}`, body: p ? `${p.summary.slice(0, 150)}${p.summary.length > 150 ? "…" : ""} Press C to read it.` : "It walks with you now.", tone: "arcane" });
      gain(40);
      report({ type: "arise", detail: e.project });
      break;
    }
    case "twist_end":
      break;
  }
}

function limits(): Limits {
  const sim = game.sim!;
  return { kinds: unlockedKinds(level()), level: level(), projects: sim.obelisks.filter((o) => o.state === "sealed" && !o.revealed).map((o) => o.project) };
}

export function snapshot(): Snapshot {
  const sim = game.sim!;
  const p = profile();
  const by = (state: string) => sim.obelisks.filter((o) => o.state === state).map((o) => o.project);
  return {
    name: p.name ?? "Stranger",
    level: level(),
    rank: hunterRank(level()),
    hp: Math.round((sim.hunter.hp / sim.derived.maxHp) * 100),
    enemies: sim.foes.filter((f) => f.dying < 0).length,
    kills: p.kills,
    deaths: p.deaths,
    minutes: Math.round(timers.session / 60),
    idleSeconds: Math.round(sim.hunter.idle),
    quest: sim.quest ? `${sim.quest.type}: ${sim.quest.title}` : null,
    twist: sim.twist?.kind ?? null,
    raid: sim.raid,
    sealed: by("sealed"),
    fallen: by("fallen"),
    risen: by("risen"),
    titles: p.titles,
    said: said.slice(-3),
    returning: p.seconds > 120,
  };
}

function carryOut(action: Action) {
  const sim = game.sim;
  if (!sim) return;
  switch (action.do) {
    case "spawn":
      if (!sim.hunter.dead && sim.twist?.kind !== "calm") sim.spawn(action.kind, action.count, action.where);
      break;
    case "quest":
      if (sim.setQuest(action)) {
        play("system", { volume: 0.45 });
        ui().notify({ heading: "QUEST", body: `${action.title} · ${action.xp} XP`, tone: "system" });
      }
      break;
    case "twist":
      sim.setTwist(action.kind, action.seconds);
      play("portal", { volume: 0.35, rate: 1.5 });
      ui().notify({ heading: erebus.twists[action.kind].name, body: erebus.twists[action.kind].body, tone: action.kind === "calm" || action.kind === "time_slow" || action.kind === "echo_rain" ? "system" : "ember" });
      break;
    case "gift":
      sim.gift(action.kind);
      play("confirm", { volume: 0.5 });
      ui().notify({ heading: erebus.gifts[action.kind].name, body: erebus.gifts[action.kind].body, tone: "gold" });
      break;
    case "bargain": {
      if (sim.hunter.dead) break;
      const reward = action.gift === "xp" ? `${level() * 25} XP` : erebus.gifts[action.gift].name.toLowerCase();
      play("system", { volume: 0.5 });
      ui().offer({
        heading: erebus.bargainHeading,
        body: action.text,
        detail: `You get: ${reward}. It ${erebus.prices[action.price]}.`,
        onAnswer: (accepted) => {
          if (!accepted || !game.sim || game.sim.hunter.dead) return;
          game.sim.pay(action.price);
          if (action.gift === "xp") gain(level() * 25);
          else {
            game.sim.gift(action.gift);
            ui().notify({ heading: erebus.gifts[action.gift].name, body: erebus.gifts[action.gift].body, tone: "gold" });
          }
        },
      });
      break;
    }
    case "reveal": {
      sim.reveal(action.project);
      const p = projectById(action.project);
      if (p) ui().notify({ heading: "AN OBELISK CALLS", body: `${p.name} · rank ${p.rank}. Follow the pillar of light.`, tone: "arcane" });
      break;
    }
    case "title":
      if (profile().addTitle(action.text)) {
        play("levelup", { volume: 0.4, rate: 1.2 });
        ui().notify({ heading: "TITLE EARNED", body: action.text, tone: "gold" });
      }
      break;
  }
}

function apply(directive: Directive, mind: "model" | "local") {
  if (directive.say) {
    said.push(directive.say);
    if (said.length > 6) said.shift();
    ui().say(directive.say, mind);
  }
  directive.actions.forEach(carryOut);
}

/** tell the director something happened; it answers with a directive that is carried out */
export function report(event: GameEvent) {
  if (!game.sim) return;
  const snap = snapshot();
  const lim = limits();
  const local = () => apply(localDirective(event, snap, lim, rng), "local");
  if (!game.direct) return local();
  void game.direct(event, snap, lim).then(
    (answer) => (game.sim ? (answer ? apply(answer.directive, answer.mind) : local()) : undefined),
    () => game.sim && local(),
  );
}

const QUIET: EventType[] = ["lull", "pulse", "idle", "low_hp"];
export const isQuiet = (type: EventType) => QUIET.includes(type);

export function startGame() {
  const p = profile();
  const lv = levelOf(p.xp).level;
  game.sim = createSim({
    projects: projects.map((q) => ({ id: q.id, rank: q.rank })),
    risen: p.shadows,
    runes: runeSkills.map((s) => s.id).filter((id) => !p.runes.includes(id)),
    derived: derive(p.stats, lv),
    level: lv,
    rng,
    emit: onSim,
  });
  game.sim.deploy(p.shadows);
  Object.assign(timers, { lull: 0, pulse: 35, idle: 0, low: 0, hud: 0, seconds: 0, session: 0 });
  said.length = 0;
  report({ type: "enter" });
  // the handle the headless playtest drives (as `window.system` is for the record)
  Object.assign(window, { erebus: game });
}

export function stopGame() {
  clearTimeout(respawnTimer);
  game.sim = null;
}

/** E, F: whatever the hunter stands next to */
export function interact(kind: "interact" | "arise") {
  const sim = game.sim;
  if (!sim?.near) return;
  if (sim.near.action === "read") ui().open("profile", { kind: "project", id: sim.near.project });
  else if (kind === "arise" || sim.near.action === "arise") sim.arise();
  else sim.interact();
}

export function spendPoint(stat: Parameters<ReturnType<typeof profile>["spend"]>[0]) {
  profile().spend(stat);
  syncStats();
}

function hud(sim: Sim): Hud {
  const q = sim.quest;
  const left = q ? Math.max(0, q.target - q.progress) : 0;
  const w = sim.raid ? sim.foes.find((f) => f.kind === "warden") : null;
  return {
    hp: Math.max(0, Math.round(sim.hunter.hp)),
    maxHp: sim.derived.maxHp,
    quest: q ? { title: q.title, text: q.type === "slay" ? erebus.quest.slay(left) : q.type === "collect" ? erebus.quest.collect(left) : erebus.quest[q.type], left: q.seconds ? Math.max(0, Math.ceil(q.left)) : 0, progress: q.target > 1 ? q.progress / q.target : q.seconds ? 1 - q.left / q.seconds : 0 } : null,
    twist: sim.twist ? { ...sim.twist } : null,
    buffs: { ...sim.buffs },
    cd: { dash: sim.hunter.dashCd / sim.derived.dashCd, burst: sim.derived.burst ? sim.hunter.burstCd / 9 : 1 },
    near: sim.near,
    enemies: sim.foes.length,
    dead: sim.hunter.dead,
    warden: w && sim.raid ? { project: sim.raid, hp: Math.max(0, w.hp / w.maxHp) } : null,
    revealed: sim.obelisks.filter((o) => o.revealed).map((o) => o.project),
  };
}

/** one frame of the game; called by the scene before it draws */
export function frame(delta: number) {
  const sim = game.sim;
  if (!sim) return;
  const state = ui();
  if (state.panel || document.hidden) return;
  // time bends while the visitor speaks to the System
  const dt = Math.min(delta, 0.05) * (state.talking ? 0.12 : 1);
  const [mx, mz] = moveVector();
  sim.step(dt, { mx, mz, attack: controls.attack || controls.holding, dash: controls.dash, burst: controls.burst });
  controls.attack = controls.dash = controls.burst = false;
  game.fx.shake = Math.max(0, game.fx.shake - dt * 2.2);

  timers.session += dt;
  timers.seconds += dt;
  if (timers.seconds >= 10) {
    profile().addSeconds(Math.round(timers.seconds));
    timers.seconds = 0;
  }
  const alive = !sim.hunter.dead;
  const empty = !sim.foes.some((f) => f.dying < 0);
  timers.lull = alive && empty && !sim.raid && sim.twist?.kind !== "calm" ? timers.lull + dt : 0;
  if (timers.lull > 5) {
    timers.lull = 0;
    report({ type: "lull" });
  }
  timers.pulse -= alive && !sim.raid ? dt : 0;
  if (timers.pulse <= 0) {
    timers.pulse = 45 + rng() * 30;
    report({ type: "pulse" });
  }
  timers.idle -= dt;
  if (sim.hunter.idle > 20 && timers.idle <= 0 && alive) {
    timers.idle = 60;
    report({ type: "idle" });
  }
  timers.low -= dt;
  if (alive && sim.hunter.hp / sim.derived.maxHp < 0.3 && timers.low <= 0) {
    timers.low = 45;
    report({ type: "low_hp" });
  }
  timers.hud += delta;
  if (timers.hud > 0.1) {
    timers.hud = 0;
    state.setHud(hud(sim));
  }
}
