"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { world } from "@/config/world.config";
import { useSession, type TraceStep } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";

const SHOWN = 7;

function Row({ step, age }: { step: TraceStep; age: number }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: Math.max(0.28, 1 - age * 0.13), x: 0 }}
      exit={{ opacity: 0 }}
      className="trace-row"
      data-status={step.status}
    >
      <span className="grid place-items-center">
        {step.status === "running" ? <span className="spinner" /> : step.status === "failed" ? <X className="size-3 text-ember" /> : <Check className="size-3 text-system/80" />}
      </span>
      <span className="truncate">
        <span className="trace-row__name">{step.name}</span>
        <span className="trace-row__args">({step.args})</span>
      </span>
      <span className="text-[10px] text-muted-foreground/70 tabular-nums">{step.ms !== undefined ? `${step.ms}ms` : ""}</span>
    </motion.li>
  );
}

/**
 * The run, made visible. Every tool the agent calls is listed here by
 * its real name, with its real arguments and how long it took — the
 * same thing a LangSmith trace shows, live, on the page. The local
 * index and the visitor's own clicks are logged the same way.
 */
export function Trace() {
  const trace = useSession((s) => s.trace);
  const online = useSession((s) => s.online);
  const touch = useWorldStore((s) => s.touch);
  const ready = useWorldStore((s) => s.ready);
  if (touch || !ready) return null;
  const rows = trace.slice(-SHOWN);
  return (
    <aside aria-label={world.hud.traceLabel} className="pointer-events-none fixed top-24 left-[4vw] z-20 w-[min(360px,30vw)]">
      <p className="eyebrow mb-2 flex items-center gap-2">
        <span className="size-1 rounded-full bg-system shadow-[0_0_8px_var(--system)]" />
        {world.hud.traceLabel}
        <span className="text-muted-foreground/50">· {online === false ? "local index" : "agent"}</span>
      </p>
      <ol className="space-y-0.5">
        <AnimatePresence initial={false}>
          {rows.map((step, i) => (
            <Row key={step.id} step={step} age={rows.length - 1 - i} />
          ))}
        </AnimatePresence>
      </ol>
      {!rows.length && <p className="font-mono text-[11px] text-muted-foreground/45">{world.hud.traceIdle}</p>}
    </aside>
  );
}
