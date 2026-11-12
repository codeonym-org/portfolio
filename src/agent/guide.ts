import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { world } from "@/config/world.config";
import { useWorldStore } from "@/store/world-store";
import { MAX_DECLINED, nextStep, nextStepAfter, OFFER_GAP_MS, type NextStep, type Seen, type StepIndex } from "./next-step";

/**
 * The guide's view of this visit: what the Hunter has seen, the step
 * the System should lead them to next, and whether it may still
 * offer anything (two declined offers in a row end the offers).
 */

const flagship = quests.find((q) => q.id === world.agent.flagship);
const index: StepIndex = { playerName: player.name, flagship: flagship && { id: flagship.id, name: flagship.name } };

type State = ReturnType<typeof useWorldStore.getState>;

export function seenBy(s: Pick<State, "visited" | "completed" | "inspected">): Seen {
  return { sectors: s.visited, briefRead: s.completed.includes("brief"), cvRead: s.completed.includes("license"), inspected: s.inspected };
}

export const mayOffer = (s: Pick<State, "offers">) => s.offers.declinedInARow < MAX_DECLINED;
export const offerTooSoon = (s: Pick<State, "offers">) => Date.now() - s.offers.lastAt < OFFER_GAP_MS;

export function suggestedNext(s: Pick<State, "visited" | "completed" | "inspected">): NextStep | null {
  return nextStep(seenBy(s), index);
}

/** the step after the actions an answer has just taken */
export function suggestedAfter(taken: { name: string; args: Record<string, unknown> }[]): NextStep | null {
  return nextStepAfter(taken, seenBy(useWorldStore.getState()), index);
}
