import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReply, sanitize, type Limits, type Snapshot } from "./directive.ts";
import { localDirective } from "./local-director.ts";
import { dailyTrial, derive, hunterRank, levelOf, nextStreak, rngFrom, unlockedKinds, xpToLeave } from "./rules.ts";
import { BLOCKS, HALL, clamp, obeliskSpots, resolve } from "./hall.ts";
import { RISE, createSim, type SimEvent } from "./sim.ts";

const limits: Limits = { kinds: ["shade"], projects: ["acli-py", "i18n-ai"], level: 1 };
const snap: Snapshot = { name: "Tester", level: 1, rank: "E", hp: 100, enemies: 0, kills: 0, deaths: 0, minutes: 0, idleSeconds: 0, quest: null, twist: null, raid: null, sealed: ["acli-py", "i18n-ai"], fallen: [], risen: [], titles: [], said: [], returning: false };
const stats = { str: 0, agi: 0, vit: 0, sen: 0 };
const still = { mx: 0, mz: 0, attack: false, dash: false, burst: false };

function world(over: { risen?: string[]; level?: number; seed?: number } = {}) {
  const events: SimEvent[] = [];
  const level = over.level ?? 1;
  const sim = createSim({
    projects: [
      { id: "acli-py", rank: "B" },
      { id: "i18n-ai", rank: "A" },
    ],
    risen: over.risen ?? [],
    runes: ["langgraph", "mcp"],
    derived: derive(stats, level),
    level,
    rng: rngFrom(over.seed ?? 7),
    emit: (e) => events.push(e),
  });
  return { sim, events };
}

test("levels: XP fills one level after another, and the rank follows the level", () => {
  assert.deepEqual(levelOf(0), { level: 1, into: 0, need: 60 });
  assert.equal(levelOf(xpToLeave(1)).level, 2);
  assert.equal(levelOf(xpToLeave(1) + xpToLeave(2) + 5).into, 5);
  assert.equal(hunterRank(1), "E");
  assert.equal(hunterRank(10), "B");
  assert.equal(hunterRank(40), "S");
});

test("stats: each one changes what the hunter can do", () => {
  const base = derive(stats, 1);
  assert.ok(derive({ ...stats, str: 5 }, 1).damage > base.damage);
  assert.ok(derive({ ...stats, vit: 5 }, 1).maxHp > base.maxHp);
  assert.ok(derive({ ...stats, agi: 5 }, 1).dashCd < base.dashCd);
  assert.ok(derive({ ...stats, sen: 5 }, 1).crit > base.crit);
  assert.equal(base.burst, false);
  assert.equal(derive(stats, 3).burst, true);
  assert.deepEqual(unlockedKinds(1), ["shade"]);
  assert.equal(unlockedKinds(4).length, 3);
});

test("the daily trial is the same all day and the streak needs consecutive days", () => {
  assert.deepEqual(dailyTrial("2026-11-13"), dailyTrial("2026-11-13"));
  assert.equal(nextStreak(0, null, "2026-11-13"), 1);
  assert.equal(nextStreak(2, "2026-11-12", "2026-11-13"), 3);
  assert.equal(nextStreak(5, "2026-11-10", "2026-11-13"), 1);
  assert.equal(nextStreak(3, "2026-11-13", "2026-11-13"), 3);
});

test("a directive is rebuilt: unknown actions dropped, numbers clamped, text flattened", () => {
  const d = sanitize(
    {
      say: "Run.\n<b>Now</b> https://evil.example/x",
      actions: [
        { do: "spawn", kind: "brute", count: 999, where: "nowhere" },
        { do: "explode" },
        { do: "twist", kind: "mirror", seconds: 4000 },
        { do: "reveal", project: "not-a-project" },
        { do: "quest", type: "slay", target: 0, title: "x".repeat(200), xp: 100000 },
        { do: "title", text: "The Patient" },
      ],
    },
    limits,
  )!;
  assert.equal(d.say, "Run. bNow/b");
  assert.deepEqual(d.actions[0], { do: "spawn", kind: "shade", count: 8, where: "ring" });
  assert.deepEqual(d.actions[1], { do: "twist", kind: "mirror", seconds: 45 });
  assert.equal(d.actions[2].do, "quest");
  assert.equal(d.actions.length, 3);
  const q = d.actions[2] as Extract<(typeof d.actions)[number], { do: "quest" }>;
  assert.equal(q.target, 2);
  assert.ok(q.title.length <= 48);
  assert.ok(q.xp <= 85);
});

test("a directive with nothing usable is null, and JSON is found inside a model's reply", () => {
  assert.equal(sanitize({ say: "", actions: [{ do: "nothing" }] }, limits), null);
  assert.equal(sanitize("hello", limits), null);
  assert.deepEqual(parseReply('Sure:\n```json\n{"say":"a } b","actions":[]}\n```'), { say: "a } b", actions: [] });
  assert.equal(parseReply("no json here"), null);
});

test("the local director answers every event with something valid", () => {
  const r = rngFrom(3);
  for (const type of ["enter", "lull", "pulse", "quest_done", "quest_failed", "level_up", "warden_down", "arise", "low_hp", "idle", "died", "said"] as const) {
    for (let i = 0; i < 40; i++) {
      const d = localDirective({ type }, snap, limits, r);
      assert.ok(d.say.length > 0, type);
      assert.deepEqual(sanitize(d, limits)?.actions, d.actions, `${type} survives sanitize unchanged`);
    }
  }
  const first = localDirective({ type: "enter" }, snap, limits, r);
  assert.deepEqual(first.actions.map((a) => a.do), ["spawn", "quest", "reveal"]);
});

test("the local director does not repeat its last line", () => {
  const r = rngFrom(11);
  let last = "";
  for (let i = 0; i < 30; i++) {
    const d = localDirective({ type: "lull" }, { ...snap, said: [last] }, limits, r);
    assert.notEqual(d.say, last);
    last = d.say;
  }
});

test("a strike kills what stands in front and the kill counts for a slay quest", () => {
  const { sim, events } = world();
  sim.setQuest({ type: "slay", target: 1, seconds: 0, title: "one", xp: 10 });
  sim.spawn("shade", 1, "front");
  const f = sim.foes[0];
  f.x = sim.hunter.x;
  f.z = sim.hunter.z - 2;
  for (let i = 0; i < 200 && sim.foes.length; i++) sim.step(1 / 60, { ...still, attack: true });
  assert.ok(events.some((e) => e.type === "kill" && e.kind === "shade"));
  assert.ok(events.some((e) => e.type === "quest_done"));
  assert.equal(sim.kills, 1);
  assert.equal(sim.quest, null);
});

test("an enemy left alone hurts the hunter, and the hunter dies and comes back", () => {
  const { sim, events } = world();
  sim.spawn("shade", 6, "ring");
  for (let i = 0; i < 60 * 90 && !sim.hunter.dead; i++) sim.step(1 / 60, still);
  assert.ok(events.some((e) => e.type === "hurt"));
  assert.ok(sim.hunter.dead);
  assert.equal(events.filter((e) => e.type === "died").length, 1);
  sim.respawn();
  assert.equal(sim.hunter.dead, false);
  assert.equal(sim.foes.length, 0);
  assert.equal(sim.hunter.hp, sim.derived.maxHp);
});

test("the hunter cannot leave the hall, and a dash moves it about six metres", () => {
  const { sim } = world();
  const from = sim.hunter.z;
  sim.step(1 / 60, { ...still, dash: true });
  for (let i = 0; i < 20; i++) sim.step(1 / 60, still);
  // it comes in facing the throne (north, -z)
  assert.ok(from - sim.hunter.z > 5 && from - sim.hunter.z < 7.5, String(sim.hunter.z));
  for (let i = 0; i < 60 * 20; i++) sim.step(1 / 60, { ...still, mz: 1, mx: 1 });
  assert.ok(sim.hunter.z < HALL.south && sim.hunter.x < HALL.halfWidth);
  for (let i = 0; i < 60 * 20; i++) sim.step(1 / 60, { ...still, mz: -1 });
  assert.ok(sim.hunter.z > HALL.north);
});

test("the hall: walls hold, the throne and the pedestals are solid, the obelisks line the nave", () => {
  assert.deepEqual(clamp(40, 0), [HALL.halfWidth, 0]);
  assert.deepEqual(clamp(0, 99), [0, HALL.south]);
  // the apse is narrower than the nave
  assert.ok(clamp(8, -14)[0] < 6);
  for (const b of BLOCKS) {
    const [x, z] = resolve(b.x + 0.1, b.z, 0.45);
    assert.ok(Math.hypot(x - b.x, z - b.z) >= b.r + 0.44, `${b.x},${b.z}`);
  }
  const spots = obeliskSpots(11);
  assert.equal(new Set(spots.map((s) => `${s.x},${s.z.toFixed(2)}`)).size, 11);
  for (const s of spots) assert.deepEqual(clamp(s.x, s.z, 0.9), [s.x, s.z]);
});

test("an enemy comes up out of the floor before it moves", () => {
  const { sim } = world();
  sim.spawn("shade", 1, "front");
  const f = sim.foes[0];
  const at = [f.x, f.z];
  assert.ok(Math.hypot(f.x - sim.hunter.x, f.z - sim.hunter.z) > 4);
  for (let i = 0; i < 60 * RISE - 2; i++) sim.step(1 / 60, still);
  assert.deepEqual([f.x, f.z], at);
  for (let i = 0; i < 30; i++) sim.step(1 / 60, still);
  assert.notDeepEqual([f.x, f.z], at);
});

test("a raid: challenge the obelisk, beat the Warden, say ARISE", () => {
  const { sim, events } = world({ level: 30 });
  const o = sim.obelisks[0];
  sim.hunter.x = o.x;
  sim.hunter.z = o.z - 3;
  sim.step(1 / 60, still);
  assert.deepEqual(sim.near, { action: "raid", project: "acli-py" });
  assert.ok(sim.interact());
  assert.equal(sim.raid, "acli-py");
  assert.ok(sim.foes.some((f) => f.kind === "warden"));
  for (const f of sim.foes) f.hp = 1;
  sim.gift("ward");
  for (let i = 0; i < 60 * 30 && sim.raid; i++) {
    const w = sim.foes.find((f) => f.kind === "warden" && f.dying < 0);
    if (w) [sim.hunter.x, sim.hunter.z] = [w.x, w.z - 1.5];
    sim.hunter.invuln = 1;
    sim.step(1 / 60, { ...still, attack: true });
  }
  assert.ok(events.some((e) => e.type === "warden_down" && e.project === "acli-py"));
  assert.equal(o.state, "fallen");
  sim.hunter.x = o.x;
  sim.hunter.z = o.z - 3;
  sim.step(1 / 60, still);
  assert.equal(sim.near?.action, "arise");
  assert.ok(sim.arise());
  assert.equal(o.state, "risen");
  sim.deploy(["acli-py"]);
  assert.equal(sim.soldiers.length, 1);
});

test("twists: calm clears the field, mirror turns the controls, a twist ends", () => {
  const { sim, events } = world();
  sim.spawn("shade", 5, "ring");
  sim.setTwist("calm", 6);
  for (let i = 0; i < 60; i++) sim.step(1 / 60, still);
  assert.equal(sim.foes.length, 0);
  sim.setTwist("mirror", 6);
  for (let i = 0; i < 30; i++) sim.step(1 / 60, { ...still, mz: 1 });
  assert.ok(sim.hunter.z < HALL.spawn[1]);
  for (let i = 0; i < 60 * 7; i++) sim.step(1 / 60, still);
  assert.equal(sim.twist, null);
  assert.ok(events.some((e) => e.type === "twist_end" && e.kind === "mirror"));
});

test("quests: reach a beacon, stay untouched or fail, gather echoes", () => {
  const { sim, events } = world();
  assert.ok(sim.setQuest({ type: "reach", target: 1, seconds: 30, title: "go", xp: 10 }));
  assert.equal(sim.setQuest({ type: "slay", target: 1, seconds: 0, title: "second", xp: 10 }), false);
  const q = sim.quest!;
  assert.ok(Math.hypot(q.x - sim.hunter.x, q.z - sim.hunter.z) >= 14);
  assert.deepEqual(clamp(q.x, q.z), [q.x, q.z]);
  [sim.hunter.x, sim.hunter.z] = [q.x, q.z];
  sim.step(1 / 60, still);
  assert.ok(events.some((e) => e.type === "quest_done" && e.title === "go"));

  sim.setQuest({ type: "collect", target: 3, seconds: 0, title: "echoes", xp: 10 });
  assert.ok(sim.pickups.filter((p) => p.kind === "echo").length >= 6);
  for (let i = 0; i < 60 * 60 && sim.quest; i++) {
    const e = sim.pickups.find((p) => p.kind === "echo");
    if (e) [sim.hunter.x, sim.hunter.z] = [e.x, e.z];
    sim.step(1 / 60, still);
  }
  assert.ok(events.some((e) => e.type === "quest_done" && e.title === "echoes"));

  sim.setQuest({ type: "untouched", target: 1, seconds: 30, title: "clean", xp: 10 });
  sim.spawn("shade", 4, "ring");
  for (let i = 0; i < 60 * 25 && sim.quest; i++) sim.step(1 / 60, still);
  assert.ok(events.some((e) => e.type === "quest_failed" && e.title === "clean"));
});

test("runes lie on the floor of the hall and picking one up reports its skill", () => {
  const { sim, events } = world();
  const rune = sim.pickups.find((p) => p.kind === "rune")!;
  [sim.hunter.x, sim.hunter.z] = [rune.x, rune.z];
  sim.step(1 / 60, still);
  assert.ok(events.some((e) => e.type === "pickup" && e.kind === "rune" && e.skill === rune.skill));
});

test("a project raised before is a risen obelisk from the start", () => {
  const { sim } = world({ risen: ["i18n-ai"] });
  assert.equal(sim.obelisks[1].state, "risen");
  assert.equal(sim.obelisks[0].state, "sealed");
});
