"use client";

import dynamic from "next/dynamic";

/** Erebus is its own chunk, loaded in the browser only: First Light never pays for it. */
const ErebusGate = dynamic(() => import("./erebus-gate"), {
  ssr: false,
  loading: () => <main className="grid h-dvh place-items-center bg-[#06040a] font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">Erebus is waking…</main>,
});

export function ErebusLoader() {
  return <ErebusGate />;
}
