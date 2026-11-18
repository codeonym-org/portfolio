"use client";

import { Loader } from "@/components/system/loader";
import { world } from "@/config/world.config";
import { useWorldStore } from "@/store/world-store";

const copy = world.boot;

/** covers the first seconds, until the Monolith is up (`system/loader.tsx`) */
export function Boot() {
  const ready = useWorldStore((s) => s.ready);
  return (
    <Loader
      show={!ready}
      label={copy.label}
      name={copy.name}
      sub={copy.role}
      lines={copy.lines}
      // eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG mark
      emblem={<img src="/brand/mark-small.svg" alt="" className="ldr__mark" />}
    />
  );
}
