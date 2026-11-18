/**
 * ── MAY THIS TAB MAKE SOUND? ──────────────────────────────────
 * A browser plays sound from a page only once the stranger has done
 * something on it (a press, a key), or when they allowed it for the
 * site. Before the agent speaks a reply it asks here; when the
 * answer is no, the reply stays in text.
 *
 * Where the browser says outright (`navigator.getAutoplayPolicy`,
 * Firefox), its word is taken. Elsewhere, a page the stranger has
 * acted on may play sound (`navigator.userActivation`). A browser that
 * tells neither is trusted, and a refused play is caught later.
 *
 * Pure and dependency-free (unit-tested with `node --test`).
 */

export type SoundVerdict = "allowed" | "blocked";

/** what the browser tells about sound on this tab */
export interface SoundSignals {
  /** `navigator.getAutoplayPolicy("mediaelement")`, where there is one */
  policy?: "allowed" | "allowed-muted" | "disallowed";
  /** `navigator.userActivation.hasBeenActive`, where there is one */
  activated?: boolean;
}

export function soundVerdict({ policy, activated }: SoundSignals): SoundVerdict {
  if (policy === "allowed") return "allowed";
  if (policy) return "blocked";
  return activated === false ? "blocked" : "allowed";
}

/** read the signals from this browser */
export function soundSignals(): SoundSignals {
  if (typeof navigator === "undefined") return { activated: false };
  const nav = navigator as Navigator & {
    getAutoplayPolicy?: (type: "mediaelement") => SoundSignals["policy"];
    userActivation?: { hasBeenActive: boolean };
  };
  let policy: SoundSignals["policy"];
  try {
    policy = nav.getAutoplayPolicy?.("mediaelement");
  } catch {
    policy = undefined;
  }
  return { policy, activated: nav.userActivation?.hasBeenActive };
}
