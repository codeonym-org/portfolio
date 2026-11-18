"use client";

import { create } from "zustand";
import type { Activity } from "./activity";

/**
 * My GitHub activity on the client: read once per visit, shared by the
 * view and the agent's tool, so opening it twice costs one request.
 */

type State = { activity: Activity | null; failed: boolean };
export const useActivity = create<State>(() => ({ activity: null, failed: false }));

let asking: Promise<Activity | null> | null = null;

export function loadActivity(): Promise<Activity | null> {
  const had = useActivity.getState().activity;
  if (had) return Promise.resolve(had);
  asking ??= fetch("/api/github/activity")
    .then((r) => (r.ok ? (r.json() as Promise<Activity>) : null))
    .catch(() => null)
    .then((activity) => {
      useActivity.setState({ activity, failed: !activity });
      // a failure may pass: the next opening asks again
      if (!activity) asking = null;
      return activity;
    });
  return asking;
}
