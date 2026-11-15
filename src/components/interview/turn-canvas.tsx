"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Check, LoaderCircle, X } from "lucide-react";
import { converse } from "@/agent/converse";
import { executeSystemCommand } from "@/agent/system-commands";
import type { TaskRecord } from "@/agent/voice/task-queue";
import { Markdown } from "@/components/agent/markdown";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { BriefPanel } from "@/components/interface/brief-panel";
import { Cards } from "@/components/interface/cards";
import { CasePanel } from "@/components/interface/case-panel";
import { useReveal } from "@/components/interface/console";
import { InspectBody } from "@/components/interface/inspect";
import { ArsenalPanel, ChroniclePanel, GatePanel, ShadowsPanel, StatusPanel, VaultPanel } from "@/components/interface/sector-panels";
import type { SectorId } from "@/config/types";
import { sectorById, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useSession, type TraceStep } from "@/store/session-store";
import { useWorldStore, type SystemPrompt } from "@/store/world-store";
import { AirWindow } from "./air-window";
import { useInterview } from "./interview-store";
import { TurnPreview } from "./turn-preview";
import { nextQuestions } from "./turns";
import { useTurns } from "./use-turns";

const copy = world.interview;

const SECTOR_BODY: Record<SectorId, () => ReactNode> = {
  status: StatusPanel,
  experience: ChroniclePanel,
  projects: ShadowsPanel,
  skills: ArsenalPanel,
  inventory: VaultPanel,
  contact: GatePanel,
};

const TINT = {
  you: "oklch(0.78 0.13 232)",
  him: "oklch(0.74 0.17 300)",
  shown: "oklch(0.8 0.12 160)",
  event: "oklch(0.8 0.14 80)",
  ask: "oklch(0.7 0.19 40)",
  next: "oklch(0.75 0.02 260)",
};

/** a finished tool call or task stays this long, then leaves */
const SETTLED_MS = 2600;
/** what one turn may put on the canvas */
const KEEP = { cards: 2, events: 5, next: 3 };
/** how far the windows stand from his face */
const BESIDE = 28;

function Words({ id, text, live }: { id: string; text: string; live: boolean }) {
  const { visible, done } = useReveal(text, id);
  return (
    <div className="oracle max-h-[min(46dvh,420px)] overflow-y-auto overscroll-contain pr-1 text-[15px]" aria-live="polite">
      <Markdown text={visible} />
      {(!done || live) && <span className="caret" aria-hidden />}
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex h-6 items-center gap-1.5" aria-label={copy.phases.thinking}>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-white/70" animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.16 }} />
      ))}
    </div>
  );
}

/** runs `then` once, `after` ms after `settled` becomes true */
function useSettled(settled: boolean, then: () => void, after = SETTLED_MS) {
  // the canvas re-renders while a reply streams: the timer must not restart with it
  const latest = useRef(then);
  useEffect(() => {
    latest.current = then;
  });
  useEffect(() => {
    if (!settled) return;
    const timer = window.setTimeout(() => latest.current(), after);
    return () => window.clearTimeout(timer);
  }, [settled, after]);
}

function Status({ status }: { status: "running" | "done" | "failed" | "queued" }) {
  if (status === "running" || status === "queued") return <LoaderCircle className="size-3.5 shrink-0 animate-spin text-system" />;
  if (status === "failed") return <X className="size-3.5 shrink-0 text-ember" />;
  return <Check className="size-3.5 shrink-0 text-emerald-300" />;
}

/** an event of the turn: a small chip in the row under the top bar, gone a moment after it settles */
function Chip({ children, settled, leave, after }: { children: ReactNode; settled: boolean; leave: () => void; after?: number }) {
  useSettled(settled, leave, after);
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -14, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="air pointer-events-auto flex max-w-full items-center gap-2 !rounded-full px-3 py-1.5 font-mono text-[11px] text-white/85"
      style={{ ["--air-tint" as string]: TINT.event }}
    >
      {children}
    </motion.div>
  );
}

function ToolChip({ step, leave }: { step: TraceStep; leave: () => void }) {
  return (
    <Chip settled={step.status !== "running"} leave={leave}>
      <Status status={step.status} />
      <span className="truncate">
        {step.name}
        <span className="text-white/40">({step.args})</span>
      </span>
      {step.ms !== undefined && <span className="shrink-0 text-white/35">{step.ms} ms</span>}
    </Chip>
  );
}

function TaskChip({ task, leave }: { task: TaskRecord; leave: () => void }) {
  const over = task.status === "done" || task.status === "failed";
  return (
    <Chip settled={over} leave={leave}>
      <Status status={task.status === "done" || task.status === "failed" ? task.status : "running"} />
      <span className="truncate font-sans text-[12px]">{task.task}</span>
    </Chip>
  );
}

function QuestionBody({ prompt }: { prompt: SystemPrompt }) {
  const reply = (accepted: boolean) => {
    const command = useWorldStore.getState().prompt?.command;
    play(accepted ? "confirm" : "close", { volume: 0.5 });
    useWorldStore.getState().answer(accepted);
    if (accepted && command) void executeSystemCommand(command.name, command.args);
  };
  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-relaxed text-white/85">{prompt.body}</p>
      <div className="flex gap-2">
        <button type="button" data-active="true" onClick={() => reply(true)} className="hud-chip px-4 py-1.5 text-sm">
          {prompt.accept}
        </button>
        <button type="button" onClick={() => reply(false)} className="hud-chip px-4 py-1.5 text-sm">
          {prompt.decline}
        </button>
      </div>
    </div>
  );
}

/** what he could be asked next: chips to press */
function Next({ questions, ask }: { questions: string[]; ask: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => (
        <motion.button
          key={q}
          type="button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.08 } }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => ask(q)}
          className="rounded-full border border-dashed border-white/25 bg-white/5 px-3 py-1 text-[12.5px] text-white/80 transition-colors hover:border-white/50 hover:bg-white/12 hover:text-white"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}

/**
 * ── THE TURN ON THE CANVAS ────────────────────────────────────
 * Only the turn in progress is on the canvas, and everything has its
 * place, so nothing collides: the question at the bottom centre,
 * above the input; his words and what to ask next on his left; what
 * he shows and opens on his right; what he is doing (tool calls,
 * tasks, notes) as a row of chips under the top bar. Every window
 * can be moved by its top and put away with its cross. When the next
 * question is asked, this turn's question and answer fly into the
 * small preview of the turn before (bottom left; above the question
 * on a phone), and the rest leaves. The transcript keeps every turn.
 */
export function TurnCanvas() {
  const turns = useTurns();
  const active = turns.at(-1);
  const before = turns.at(-2);
  const face = useInterview((s) => s.face);
  const mode = useInterview((s) => s.mode);
  const openTranscript = useInterview((s) => s.toggleTranscript);
  const running = useSession((s) => s.running);
  const trace = useSession((s) => s.trace);
  const notice = useSession((s) => s.notice);
  const tasks = useVoiceStore((s) => s.tasks);
  const phase = useVoiceStore((s) => s.phase);
  const sector = useWorldStore((s) => s.sector);
  const caseFile = useWorldStore((s) => s.caseFile);
  const brief = useWorldStore((s) => s.brief);
  const inspect = useWorldStore((s) => s.inspect);
  const prompt = useWorldStore((s) => s.prompt);
  const toasts = useWorldStore((s) => s.toasts);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const hide = useCallback((id: string) => setHidden((h) => new Set(h).add(id)), []);
  const shown = (id: string) => !hidden.has(id);

  useEffect(() => {
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const world$ = useWorldStore.getState();
  const records: { id: string; title: string; body: ReactNode; close: () => void }[] = [];
  if (sector) {
    const def = sectorById[sector];
    const Body = SECTOR_BODY[sector];
    records.push({ id: `record:sector:${sector}`, title: `${def.name} · ${def.section}`, body: <Body />, close: world$.closeFocus });
  }
  if (caseFile) records.push({ id: `record:case:${caseFile.title}`, title: caseFile.title, body: <CasePanel file={caseFile} />, close: world$.closeFocus });
  if (brief) records.push({ id: "record:brief", title: "The record in one minute", body: <BriefPanel />, close: world$.closeFocus });
  if (inspect) records.push({ id: `record:inspect:${inspect.kind}:${inspect.id}`, title: inspect.kind === "quest" ? "Project" : inspect.kind === "item" ? "Document" : "Skill", body: <InspectBody target={inspect} />, close: () => world$.setInspect(null) });

  // Escape puts everything on the canvas away
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useWorldStore.getState();
      if (s.mapOpen || s.cvOpen || useInterview.getState().transcript) return;
      if (active) setHidden((h) => new Set([...h, `q:${active.id}`, `a:${active.id}`, `next:${active.id}`, ...active.cards.map((_, n) => `card:${active.id}:${n}`)]));
      if (s.sector || s.caseFile || s.brief) s.closeFocus();
      if (s.inspect) s.setInspect(null);
      if (s.prompt) s.ignore();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!viewport.w) return null;

  const live = !!active && (active.spoken ? phase === "decoding" || phase === "thinking" || phase === "speaking" : running);
  const wide = viewport.w >= 900 && viewport.w / viewport.h >= 0.85;
  const head = face ?? { x: viewport.w / 2 - 110, y: viewport.h * 0.2, w: 220, h: 240 };
  const questions = nextQuestions(turns, world.agent.suggestions, KEEP.next);
  const ask = (q: string) => {
    if (running) return;
    play("confirm", { volume: 0.35 });
    void converse(q);
  };
  /** the room the input takes at the bottom */
  const floor = mode === "text" ? 128 : 236;

  const events = [
    ...trace.filter((s) => s.name !== "agent.run" && s.name !== "local_index.route").slice(-KEEP.events).map((step) => ({ id: `tool:${step.id}`, node: <ToolChip step={step} leave={() => hide(`tool:${step.id}`)} /> })),
    ...tasks.map((task) => ({ id: `task:${task.id}`, node: <TaskChip task={task} leave={() => hide(`task:${task.id}`)} /> })),
    ...toasts.map((toast) => ({
      id: `toast:${toast.id}`,
      node: (
        <Chip settled after={6000} leave={() => { hide(`toast:${toast.id}`); useWorldStore.getState().dismissToast(toast.id); }}>
          <span className="truncate font-sans text-[12px]">
            <b>{toast.heading}</b> {toast.body}
          </span>
        </Chip>
      ),
    })),
    ...(notice ? [{ id: `notice:${notice}`, node: <Chip settled after={6000} leave={() => hide(`notice:${notice}`)}><span className="truncate font-sans text-[12px]">{notice}</span></Chip> }] : []),
  ].filter((e) => shown(e.id));

  /** his side: his words, then what to ask next */
  const his: ReactNode[] = [];
  if (active && shown(`a:${active.id}`) && (active.him || live)) {
    his.push(
      <AirWindow key={`a:${active.id}`} layoutId={`a:${active.id}`} label={copy.panes.words} tint={TINT.him} movable={wide} onClose={() => hide(`a:${active.id}`)}>
        {active.him ? <Words id={active.id} text={active.him} live={live} /> : <Thinking />}
      </AirWindow>,
    );
  }
  const nextId = `next:${active?.id ?? "start"}`;
  if (questions.length && shown(nextId) && (!active || (!!active.him && !live))) {
    his.push(
      <AirWindow key={nextId} label={active ? copy.next : copy.start} tint={TINT.next} small movable={wide} onClose={() => hide(nextId)}>
        <Next questions={questions} ask={ask} />
      </AirWindow>,
    );
  }

  /** the other side: what he shows, what he opens, what he asks */
  const theirs: ReactNode[] = [];
  active?.cards.slice(-KEEP.cards).forEach((card, n) => {
    const id = `card:${active.id}:${n}`;
    if (!shown(id)) return;
    theirs.push(
      <AirWindow key={id} label={`${copy.panes.card} · ${card.type}`} tint={TINT.shown} movable={wide} onClose={() => hide(id)}>
        <Cards cards={[card]} />
      </AirWindow>,
    );
  });
  for (const r of records) {
    theirs.push(
      <AirWindow key={r.id} label={`${copy.panes.record} · ${r.title}`} tint={TINT.shown} movable={wide} onClose={r.close}>
        <div className="max-h-[min(44dvh,440px)] overflow-y-auto overscroll-contain pr-1">{r.body}</div>
      </AirWindow>,
    );
  }
  if (prompt) {
    theirs.push(
      <AirWindow key={`ask:${prompt.id}`} label={prompt.heading || copy.panes.question} tint={TINT.ask} movable={wide} onClose={() => useWorldStore.getState().ignore()}>
        <QuestionBody prompt={prompt} />
      </AirWindow>,
    );
  }

  const column = "pointer-events-none fixed flex flex-col gap-3";
  const top = 78;
  const bottom = floor + 72;

  return (
    <LayoutGroup>
      <div className="pointer-events-none fixed inset-0 z-20" role="region" aria-label="The reply">
        {/* what he is doing */}
        <div className="pointer-events-none fixed top-[66px] left-1/2 flex w-[min(760px,calc(100vw-1.5rem))] -translate-x-1/2 flex-wrap justify-center gap-2">
          <AnimatePresence mode="popLayout">
            {events.map((e) => (
              <div key={e.id} className="max-w-full">
                {e.node}
              </div>
            ))}
          </AnimatePresence>
        </div>

        {wide ? (
          <>
            <div className={cn(column, "items-end justify-center")} style={{ top, bottom, right: viewport.w - head.x + BESIDE, width: Math.min(400, head.x - BESIDE - 16) }}>
              <AnimatePresence mode="popLayout">{his}</AnimatePresence>
            </div>
            <div className={cn(column, "items-start justify-center")} style={{ top, bottom, left: head.x + head.w + BESIDE, width: Math.min(440, viewport.w - head.x - head.w - BESIDE - 16) }}>
              <AnimatePresence mode="popLayout">{theirs}</AnimatePresence>
            </div>
          </>
        ) : (
          // a phone: one column under his face, his words first
          <div
            className={cn(column, "inset-x-3 justify-start overflow-y-auto overscroll-contain pb-6 [mask-image:linear-gradient(180deg,#000_calc(100%-28px),transparent)]")}
            style={{ top: head.y + head.h + 24, bottom: bottom + (before ? 66 : 8), pointerEvents: "auto" }}
          >
            <AnimatePresence mode="popLayout">{[...his, ...theirs]}</AnimatePresence>
          </div>
        )}

        {/* the question, at the bottom centre; on a phone the turn before sits just above it */}
        <div className="pointer-events-none fixed left-1/2 flex w-[min(520px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-center gap-2" style={{ bottom: floor }}>
          <AnimatePresence mode="popLayout">
            {!wide && before && <TurnPreview key={`pre:${before.id}`} turn={before} compact onOpen={openTranscript} />}
            {active && shown(`q:${active.id}`) && (
              <AirWindow key={`q:${active.id}`} layoutId={`q:${active.id}`} label={active.spoken ? copy.panes.heard : copy.panes.you} tint={TINT.you} small movable={wide} onClose={() => hide(`q:${active.id}`)} className="!w-auto max-w-full min-w-[min(260px,100%)]">
                <p className="text-[14.5px] leading-snug text-white/90">{active.you}</p>
              </AirWindow>
            )}
          </AnimatePresence>
        </div>

        {/* the turn before, small, in the corner */}
        {wide && (
          <div className="pointer-events-none fixed bottom-5 left-4">
            <AnimatePresence mode="popLayout">{before && <TurnPreview key={`pre:${before.id}`} turn={before} onOpen={openTranscript} />}</AnimatePresence>
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}
