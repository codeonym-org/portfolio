import type { Action, Directive, GameEvent, Gift, Limits, Price, Snapshot, Twist } from "./directive.ts";

/**
 * ── EREBUS: THE LOCAL DIRECTOR ────────────────────────────────
 * What pilots the game when the model does not: weighted tables and
 * a random generator. It answers every event at once, with no
 * network, so the game never waits for anyone.
 * Pure and dependency-free (unit-tested with `node --test`).
 */

type Rng = () => number;
const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];

const LINES: Record<GameEvent["type"], string[]> = {
  enter: [
    "A stranger on Erebus. Everything here was built by Ayoub. Everything here wants you gone.",
    "You walked in by yourself. Good. The obelisks hold his work; their Wardens hold the obelisks.",
    "Welcome to the dark side of the record. I will be changing the rules as we go.",
  ],
  lull: ["It is too quiet. I can fix that.", "You are still breathing. Let us test how long.", "More of them. I counted for you.", "The ground remembers you now."],
  pulse: ["I was bored. Now I am not.", "Something changes. I will not say what.", "A small adjustment to reality.", "You were getting comfortable."],
  quest_done: ["Cleared. I expected less.", "Done. The record notes it.", "Accepted. Again.", "You follow instructions well. Dangerous habit."],
  quest_failed: ["Failed. I keep those too.", "No. Try again when I say so.", "That one is gone. There will be others."],
  level_up: ["You are stronger. So is everything else.", "Level gained. Spend the points; I am watching where.", "Growth. The thing Ayoub builds his agents for."],
  warden_down: ["The Warden is down. Say the word before it cools.", "It fell. What it guarded is yours to raise.", "Stand over it. You know what to say."],
  arise: ["It answers to you now. Read what it was.", "Another one of his, walking behind you.", "A shadow with a repository. Keep it close."],
  low_hp: ["You are leaking.", "This is where most strangers stop.", "Careful. I do not carry bodies."],
  idle: ["Standing still is also a decision. A bad one.", "I dislike stillness.", "Asleep? Let me help."],
  died: ["You died. I undid it. Do not thank me.", "Dead. Again, then.", "The dark took you. I took you back."],
  said: ["I heard you. The line to my full attention is closed for now; the record below still answers."],
};

const GIFTS: Gift[] = ["heal", "might", "haste", "ward"];
const PRICES: Price[] = ["blood", "brute", "blackout", "mirror"];
const BARGAINS: Record<Price, string> = {
  blood: "A gift, for some of your blood. Accept?",
  brute: "A gift. Something heavy comes with it. Accept?",
  blackout: "A gift, and I turn off the light for a while. Accept?",
  mirror: "A gift. Your left becomes your right for a moment. Accept?",
};
const QUEST_TITLES = {
  slay: ["Thin the dark", "Put them down", "Count to zero"],
  survive: ["Do not die", "Hold the ground", "Outlast it"],
  reach: ["Go where the light is", "Reach the beacon", "Move"],
  untouched: ["Not a scratch", "Untouched", "Let nothing land"],
  collect: ["Gather the echoes", "Pick up what they left", "Echo hunt"],
};
const ARISE_TITLES: Record<number, string> = { 1: "First Extraction", 3: "Keeper of Three", 5: "Captain of Echoes", 10: "Sovereign of Erebus" };

function horde(r: Rng, limits: Limits, where: "ring" | "front" | "behind" | "far" = "ring"): Action[] {
  const size = Math.min(8, 2 + Math.floor(limits.level / 2) + Math.floor(r() * 2));
  const kind = pick(r, limits.kinds);
  if (kind === "shade") return [{ do: "spawn", kind, count: size, where }];
  const some: Action = { do: "spawn", kind, count: kind === "brute" ? 1 + Math.floor(limits.level / 6) : Math.ceil(size / 2), where: kind === "spitter" ? "far" : where };
  return [some, { do: "spawn", kind: "shade", count: Math.max(2, size - 2), where }];
}

function quest(r: Rng, limits: Limits): Action {
  const type = pick(r, ["slay", "slay", "survive", "reach", "untouched", "collect"] as const);
  const xp = 25 + limits.level * 9;
  const title = pick(r, QUEST_TITLES[type]);
  if (type === "slay") return { do: "quest", type, target: 4 + Math.floor(r() * 4) + Math.floor(limits.level / 2), seconds: 0, title, xp };
  if (type === "collect") return { do: "quest", type, target: 5 + Math.floor(r() * 4), seconds: 0, title, xp };
  if (type === "survive") return { do: "quest", type, target: 1, seconds: 30 + Math.floor(r() * 3) * 10, title, xp: xp + 10 };
  if (type === "untouched") return { do: "quest", type, target: 1, seconds: 12 + Math.floor(r() * 3) * 4, title, xp: xp + 15 };
  return { do: "quest", type, target: 1, seconds: 25, title, xp };
}

const twist = (r: Rng, kinds: readonly Twist[]): Action => {
  const kind = pick(r, kinds);
  return { do: "twist", kind, seconds: kind === "mirror" ? 12 : kind === "calm" ? 10 : 18 };
};

/** the next obelisk worth pointing at: the weakest sealed one first (the list is ordered weakest first) */
const reveal = (limits: Limits): Action[] => (limits.projects.length ? [{ do: "reveal", project: limits.projects[0] }] : []);

export function localDirective(event: GameEvent, snap: Snapshot, limits: Limits, r: Rng): Directive {
  const last = snap.said[snap.said.length - 1];
  const options = LINES[event.type].filter((l) => l !== last);
  const say = pick(r, options.length ? options : LINES[event.type]);
  const needsQuest = !snap.quest && !snap.raid;
  let actions: Action[] = [];

  switch (event.type) {
    case "enter":
      actions = [{ do: "spawn", kind: "shade", count: 3, where: "front" }, { do: "quest", type: "slay", target: 3, seconds: 0, title: "First blood", xp: 30 }, ...reveal(limits)];
      break;
    case "lull": {
      const roll = r();
      if (snap.raid) actions = [];
      else if (needsQuest && roll < 0.45) actions = [quest(r, limits), ...horde(r, limits).slice(0, 1)];
      else if (roll < 0.85) actions = horde(r, limits, pick(r, ["ring", "front", "behind"] as const));
      else actions = [twist(r, ["frenzy", "giants", "tremor", "echo_rain"]), ...horde(r, limits).slice(0, 1)];
      break;
    }
    case "pulse": {
      const roll = r();
      if (roll < 0.3) actions = [{ do: "bargain", gift: r() < 0.25 ? "xp" : pick(r, GIFTS), price: pick(r, PRICES), text: "" }];
      else if (roll < 0.75) actions = [twist(r, ["blackout", "time_slow", "frenzy", "giants", "mirror", "tremor", "echo_rain"])];
      else actions = needsQuest ? [quest(r, limits)] : horde(r, limits, "behind");
      break;
    }
    case "quest_done":
      actions = [...(r() < 0.35 ? [{ do: "gift", kind: pick(r, GIFTS) } as Action] : []), ...(r() < 0.5 ? [quest(r, limits)] : horde(r, limits)), ...(snap.sealed.length && !snap.raid && r() < 0.4 ? reveal(limits) : [])];
      break;
    case "quest_failed":
      actions = horde(r, limits).slice(0, 1);
      break;
    case "level_up":
      actions = [{ do: "gift", kind: "heal" }];
      break;
    case "warden_down":
      actions = [];
      break;
    case "arise": {
      const title = ARISE_TITLES[snap.risen.length];
      actions = [{ do: "twist", kind: "calm", seconds: 10 }, ...reveal(limits), ...(title && !snap.titles.includes(title) ? [{ do: "title", text: title } as Action] : [])];
      break;
    }
    case "low_hp":
      actions = r() < 0.5 ? [{ do: "bargain", gift: "heal", price: pick(r, ["brute", "blackout", "mirror"] as const), text: "" }] : [{ do: "twist", kind: "time_slow", seconds: 8 }];
      break;
    case "idle":
      actions = [r() < 0.5 ? { do: "twist", kind: "tremor", seconds: 8 } : { do: "spawn", kind: "shade", count: 4, where: "behind" }, ...(snap.titles.includes("The One Who Waits") ? [] : [{ do: "title", text: "The One Who Waits" } as Action])];
      break;
    case "died":
      actions = snap.deaths === 3 && !snap.titles.includes("Thrice Returned") ? [{ do: "title", text: "Thrice Returned" }] : [];
      break;
    case "said":
      actions = [];
      break;
  }

  // a bargain with no words gets the stock sentence for its price
  actions = actions.map((a) => (a.do === "bargain" && !a.text ? { ...a, text: BARGAINS[a.price] } : a));
  return { say, actions: actions.slice(0, 3) };
}
