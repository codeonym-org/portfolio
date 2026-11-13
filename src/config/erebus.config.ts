import type { Gift, Price, Twist } from "@/erebus/directive";
import type { StatId } from "@/erebus/rules";

/**
 * ── EREBUS (rank B gate) ──────────────────────────────────────
 * Every word the game shows that is not the record itself. The
 * numbers the game runs on are in `src/erebus/rules.ts`; what the
 * System may do is in `src/erebus/directive.ts`.
 */
export const erebus = {
  storageKey: "codeonym-erebus-v1",
  awakening: {
    eyebrow: "Rank B gate · Erebus",
    title: "You are about to be registered",
    body: "Erebus is the record as a world to fight through. Ayoub's projects stand here as sealed obelisks; each has a Warden. The System runs this place and it does not follow a script. It needs a name to call you.",
    label: "Hunter name",
    placeholder: "Your name",
    submit: "AWAKEN",
    note: "Your profile is kept in this browser only. Nothing is sent anywhere except what you say to the System.",
    carried: (xp: number, shadows: number) =>
      `Carried from First Light: ${xp} XP${shadows ? ` and ${shadows} ${shadows === 1 ? "shadow" : "shadows"} already risen` : ""}.`,
  },
  stats: {
    str: { name: "Strength", short: "STR", effect: "Damage of every blow" },
    agi: { name: "Agility", short: "AGI", effect: "Speed, and a shorter wait between dashes" },
    vit: { name: "Vitality", short: "VIT", effect: "Health" },
    sen: { name: "Sense", short: "SEN", effect: "Critical blows, and echoes come to you from further" },
  } satisfies Record<StatId, { name: string; short: string; effect: string }>,
  twists: {
    blackout: { name: "BLACKOUT", body: "The light is gone. Kills are worth half as much again." },
    time_slow: { name: "SLOW TIME", body: "Everything but you moves through water." },
    frenzy: { name: "FRENZY", body: "They are faster. Kills are worth double." },
    giants: { name: "GIANTS", body: "They grew. So did what they are worth." },
    mirror: { name: "MIRROR", body: "Your left is your right. Your forward is your back." },
    tremor: { name: "TREMOR", body: "The ground breaks where it glows. Do not stand there." },
    calm: { name: "CALM", body: "Nothing hunts you. You heal. Enjoy it." },
    echo_rain: { name: "ECHO RAIN", body: "Echoes fall. Gather them." },
  } satisfies Record<Twist, { name: string; body: string }>,
  gifts: {
    heal: { name: "RESTORED", body: "Your health is full." },
    might: { name: "MIGHT", body: "Half again as much damage, for forty seconds." },
    haste: { name: "HASTE", body: "A third faster, for forty seconds." },
    ward: { name: "WARD", body: "The next three blows do nothing." },
  } satisfies Record<Gift, { name: string; body: string }>,
  prices: {
    blood: "costs 40% of your health",
    brute: "a brute arrives",
    blackout: "twenty seconds of blackout",
    mirror: "fifteen seconds of mirrored controls",
  } satisfies Record<Price, string>,
  quest: {
    slay: (left: number) => `Put down ${left} more`,
    collect: (left: number) => `Gather ${left} more echoes`,
    survive: "Stay alive",
    untouched: "Take no blow",
    reach: "Reach the pillar of light",
  },
  hints: {
    raid: (name: string, rank: string) => `Challenge the Warden of ${name} · rank ${rank}`,
    arise: "ARISE",
    read: (name: string) => `Read ${name}`,
  },
  controls: [
    ["W A S D", "Move"],
    ["Drag", "Turn the camera"],
    ["Click · J · Space", "Strike (third blow is heavier)"],
    ["Shift", "Dash through them"],
    ["R", "Burst (from level 3)"],
    ["E", "Challenge an obelisk"],
    ["F", "ARISE"],
    ["C", "Your profile"],
    ["T", "Speak to the System"],
  ] as [string, string][],
  /** CC BY 4.0 asks for the authors to be named where the work is shown */
  credits:
    "Models: Throne Room by Uğur Yakışık · Shadow Wraith by patromes · Drugdör the Golem by Phons · Obelisk by Ankledot · Dark Hooded Rogue by SagePeeker · the sword by missafe (Sketchfab, CC BY 4.0) · knights and all motion: Mixamo.",
  dead: { title: "YOU DIED", body: "The System is undoing it." },
  bargainHeading: "THE SYSTEM OFFERS A BARGAIN",
  accept: "Accept",
  decline: "Refuse",
};
