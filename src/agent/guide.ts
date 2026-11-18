import { quests } from "@/config/quests.config";
import { world } from "@/config/world.config";
import { useWorldStore } from "@/store/world-store";
import { MAX_DECLINED, unseenSteps, type Seen, type StepIndex, type Unseen } from "./next-step";

/**
 * This visit, as the agent's context sees it: what the stranger has
 * seen, what is left, and whether the agent may still offer anything
 * (two refusals in a row end the offers until the stranger asks).
 */

const flagship = quests.find((q) => q.id === world.agent.flagship);
const index: StepIndex = { flagship: flagship && { id: flagship.id, name: flagship.name } };

type State = ReturnType<typeof useWorldStore.getState>;

function seenBy(s: Pick<State, "visited" | "briefRead" | "cvRead" | "inspected">): Seen {
  return { sectors: s.visited, briefRead: s.briefRead, cvRead: s.cvRead, inspected: s.inspected };
}

export const mayOffer = (s: Pick<State, "offers">) => s.offers.declinedInARow < MAX_DECLINED;

/** everything left to see, for the agent to choose from (or not) */
export function unseen(s: Pick<State, "visited" | "briefRead" | "cvRead" | "inspected">): Unseen[] {
  return unseenSteps(seenBy(s), index);
}
