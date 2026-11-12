"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { world } from "@/config/world.config";
import { useWorldStore } from "@/store/world-store";

const copy = world.boot;

/** covers the first seconds: the models are ~120 KB, so this is brief by design */
export function Boot() {
  const ready = useWorldStore((s) => s.ready);
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => setLine((l) => (l + 1) % copy.lines.length), 900);
    return () => window.clearInterval(timer);
  }, [ready]);
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="boot"
          className="fixed inset-0 z-[70] grid place-items-center bg-[var(--void)]"
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <div className="w-[min(320px,80vw)] text-center">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="mt-3 font-display text-2xl tracking-[0.4em] text-white">{copy.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{copy.role}</p>
            <div className="bar mt-8">
              <span className="w-full animate-pulse" />
            </div>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">{copy.lines[line]}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
