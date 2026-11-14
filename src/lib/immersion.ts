import { useSyncExternalStore } from "react";

/** Fullscreen ("immersive mode"): the F key, the top-bar toggle and the agent's `set_fullscreen`. */

const onFullscreenChange = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};
const noSubscribe = () => () => {};

/** true while the page is fullscreen */
export function useImmersive() {
  return useSyncExternalStore(onFullscreenChange, () => !!document.fullscreenElement, () => false);
}

/** iPhone Safari has no element fullscreen — the toggle hides there */
export function useCanImmerse() {
  return useSyncExternalStore(noSubscribe, () => !!document.fullscreenEnabled, () => false);
}

/** must run inside a user gesture (click / key press) */
export async function toggleImmersion() {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {
    // refused (no gesture, iframe without allowfullscreen) — stay windowed
  }
}

/** enter / leave fullscreen from code; false when the browser refuses (no recent gesture) */
export async function setImmersion(on: boolean) {
  if (!!document.fullscreenElement === on) return true;
  if (!document.fullscreenEnabled) return false;
  await toggleImmersion();
  return !!document.fullscreenElement === on;
}
