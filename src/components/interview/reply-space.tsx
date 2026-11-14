"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, LoaderCircle, X } from "lucide-react";
import { executeSystemCommand } from "@/agent/system-commands";
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
import { useSession, type Card, type TraceStep } from "@/store/session-store";
import { useWorldStore, type SystemPrompt, type Toast } from "@/store/world-store";
import type { TaskRecord } from "@/agent/voice/task-queue";
import { useInterview } from "./interview-store";
import { placePanes, type Box, type Placement } from "./pane-layout";

const copy = world.interview;

const SECTOR_BODY: Record<SectorId, () => ReactNode> = {
  status: StatusPanel,
  experience: ChroniclePanel,
  projects: ShadowsPanel,
  skills: ArsenalPanel,
  inventory: VaultPanel,
  contact: GatePanel,
};

/** one part of a reply, in its own window */
type Pane =
  | { id: string; kind: "you"; text: string }
  | { id: string; kind: "words"; text: string; live: boolean }
  | { id: string; kind: "card"; card: Card }
  | { id: string; kind: "tool"; step: TraceStep }
  | { id: string; kind: "task"; task: TaskRecord }
  | { id: string; kind: "record"; title: string; body: ReactNode; close: () => void }
  | { id: string; kind: "question"; prompt: SystemPrompt }
  | { id: string; kind: "notice"; text: string; toast?: Toast };

const WIDTH: Record<Pane["kind"], number> = { you: 300, words: 400, card: 400, tool: 290, task: 310, record: 470, question: 380, notice: 340 };
const SIDE: Partial<Record<Pane["kind"], "left" | "right">> = { words: "left", card: "right", record: "right", question: "right", tool: "right", task: "right" };
/** a finished tool call or task stays this long, then leaves */
const SETTLED_MS = 2600;
/** how much of the conversation stays on screen */
const KEEP = { you: 2, words: 3, cards: 4, tools: 5 };

/** the voice's words and what it heard, one window per turn */
function useVoicePanes() {
  const [log, setLog] = useState<{ id: string; kind: "heard" | "voice"; text: string }[]>([]);
  useEffect(() => {
    let seq = 0;
    let heardId = "";
    let replyId = "";
    return useVoiceStore.subscribe((s, prev) => {
      if (s.heard !== prev.heard) {
        if (!s.heard) heardId = "";
        else {
          heardId ||= `heard-${++seq}`;
          const id = heardId;
          setLog((l) => [...l.filter((e) => e.id !== id), { id, kind: "heard" as const, text: s.heard }].slice(-6));
        }
      }
      if (s.reply !== prev.reply) {
        if (!s.reply) replyId = "";
        else {
          replyId ||= `voice-${++seq}`;
          const id = replyId;
          setLog((l) => {
            const i = l.findIndex((e) => e.id === id);
            if (i === -1) return [...l, { id, kind: "voice" as const, text: s.reply }].slice(-6);
            const next = l.slice();
            next[i] = { ...next[i], text: s.reply };
            return next;
          });
        }
      }
    });
  }, []);
  return log;
}

/** everything the reply is made of right now, newest last */
function usePanes(dismissed: ReadonlySet<string>): Pane[] {
  const turns = useSession((s) => s.turns);
  const running = useSession((s) => s.running);
  const trace = useSession((s) => s.trace);
  const notice = useSession((s) => s.notice);
  const tasks = useVoiceStore((s) => s.tasks);
  const voiceLog = useVoicePanes();
  const phase = useVoiceStore((s) => s.phase);
  const sector = useWorldStore((s) => s.sector);
  const caseFile = useWorldStore((s) => s.caseFile);
  const brief = useWorldStore((s) => s.brief);
  const inspect = useWorldStore((s) => s.inspect);
  const prompt = useWorldStore((s) => s.prompt);
  const toasts = useWorldStore((s) => s.toasts);

  return useMemo(() => {
    const panes: Pane[] = [];
    const visitor = turns.filter((t) => t.role === "visitor" && !t.voice).slice(-KEEP.you);
    const lastSystem = [...turns].reverse().find((t) => t.role === "system")?.id;
    const systemTurns = turns.filter((t) => t.role === "system").slice(-KEEP.words);
    let cards = 0;
    for (const [i, t] of turns.entries()) {
      if (t.role === "visitor") {
        if (visitor.includes(t)) panes.push({ id: `you:${t.id}`, kind: "you", text: t.text });
        continue;
      }
      if (!systemTurns.includes(t)) continue;
      // an answer to a task the voice handed over is spoken by the voice: only what it showed gets a window
      const forVoice = turns[i - 1]?.voice;
      if (t.text && !forVoice) panes.push({ id: `words:${t.id}`, kind: "words", text: t.text, live: running && t.id === lastSystem });
      t.cards?.forEach((card, n) => {
        if (card.type === "case" || cards++ >= KEEP.cards) return;
        panes.push({ id: `card:${t.id}:${n}`, kind: "card", card });
      });
    }
    for (const e of voiceLog) panes.push(e.kind === "heard" ? { id: e.id, kind: "you", text: e.text } : { id: e.id, kind: "words", text: e.text, live: phase === "thinking" || phase === "speaking" });
    for (const step of trace.filter((s) => s.name !== "agent.run" && s.name !== "local_index.route").slice(-KEEP.tools)) panes.push({ id: `tool:${step.id}`, kind: "tool", step });
    for (const task of tasks) panes.push({ id: `task:${task.id}`, kind: "task", task });

    const s = useWorldStore.getState();
    if (sector) {
      const def = sectorById[sector];
      const Body = SECTOR_BODY[sector];
      panes.push({ id: `record:sector:${sector}`, kind: "record", title: `${def.name} · ${def.section}`, body: <Body />, close: s.closeFocus });
    }
    if (caseFile) panes.push({ id: `record:case:${caseFile.title}`, kind: "record", title: caseFile.title, body: <CasePanel file={caseFile} />, close: s.closeFocus });
    if (brief) panes.push({ id: "record:brief", kind: "record", title: "The record in one minute", body: <BriefPanel />, close: s.closeFocus });
    if (inspect) panes.push({ id: `record:inspect:${inspect.kind}:${inspect.id}`, kind: "record", title: inspect.kind === "quest" ? "Project" : inspect.kind === "item" ? "Document" : "Skill", body: <InspectBody target={inspect} />, close: () => s.setInspect(null) });
    if (prompt) panes.push({ id: `question:${prompt.id}:${prompt.body.length}`, kind: "question", prompt });
    for (const toast of toasts) panes.push({ id: `toast:${toast.id}`, kind: "notice", text: `**${toast.heading}** ${toast.body}`, toast });
    if (notice) panes.push({ id: `notice:${notice}`, kind: "notice", text: notice });
    return panes.filter((p) => !dismissed.has(p.id));
  }, [turns, running, trace, notice, tasks, voiceLog, phase, sector, caseFile, brief, inspect, prompt, toasts, dismissed]);
}

function Words({ id, text, live }: { id: string; text: string; live: boolean }) {
  const { visible, done } = useReveal(text, id);
  return (
    <div className="oracle text-[15px]" aria-live="polite">
      <Markdown text={visible} />
      {(!done || live) && <span className="caret" aria-hidden />}
    </div>
  );
}

/** a tool call or a task, gone a moment after it settles */
function useSettled(settled: boolean, dismiss: () => void, after = SETTLED_MS) {
  // the parent re-renders while a reply streams: the timer must not restart with it
  const latest = useRef(dismiss);
  useEffect(() => {
    latest.current = dismiss;
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

function ToolBody({ step, dismiss }: { step: TraceStep; dismiss: () => void }) {
  useSettled(step.status !== "running", dismiss);
  return (
    <div className="flex items-center gap-2.5 font-mono text-[11px]">
      <Status status={step.status} />
      <span className="truncate text-white/85">
        {step.name}
        <span className="text-white/40">({step.args})</span>
      </span>
      {step.ms !== undefined && <span className="ml-auto shrink-0 text-white/35">{step.ms} ms</span>}
    </div>
  );
}

function TaskBody({ task, dismiss }: { task: TaskRecord; dismiss: () => void }) {
  useSettled(task.status === "done" || task.status === "failed", dismiss);
  return (
    <div className="flex items-start gap-2.5 text-[13px]">
      <span className="mt-0.5">
        <Status status={task.status === "done" || task.status === "failed" ? task.status : "running"} />
      </span>
      <span className="text-white/80">{task.task}</span>
    </div>
  );
}

function NoticeBody({ text, toast, dismiss }: { text: string; toast?: Toast; dismiss: () => void }) {
  useSettled(true, () => {
    dismiss();
    if (toast) useWorldStore.getState().dismissToast(toast.id);
  }, 6000);
  return (
    <div className="oracle text-[13px] text-white/75">
      <Markdown text={text} />
    </div>
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

function label(pane: Pane): string {
  switch (pane.kind) {
    case "you":
      return copy.panes.you;
    case "words":
      return copy.panes.words;
    case "card":
      return `${copy.panes.card} · ${pane.card.type}`;
    case "tool":
      return copy.panes.tool;
    case "task":
      return `${copy.panes.task} ${pane.task.n}`;
    case "record":
      return `${copy.panes.record} · ${pane.title}`;
    case "question":
      return pane.prompt.heading || copy.panes.question;
    case "notice":
      return copy.panes.notice;
  }
}

function PaneBody({ pane, dismiss }: { pane: Pane; dismiss: () => void }) {
  switch (pane.kind) {
    case "you":
      return <p className="text-[14px] leading-snug text-white/70 italic">“{pane.text}”</p>;
    case "words":
      return <Words id={pane.id} text={pane.text} live={pane.live} />;
    case "card":
      return <Cards cards={[pane.card]} />;
    case "tool":
      return <ToolBody step={pane.step} dismiss={dismiss} />;
    case "task":
      return <TaskBody task={pane.task} dismiss={dismiss} />;
    case "record":
      return <div className="max-h-[min(58dvh,560px)] overflow-y-auto overscroll-contain pr-1">{pane.body}</div>;
    case "question":
      return <QuestionBody prompt={pane.prompt} />;
    case "notice":
      return <NoticeBody text={pane.text} toast={pane.toast} dismiss={dismiss} />;
  }
}

const compact = (kind: Pane["kind"]) => kind === "tool" || kind === "task" || kind === "you" || kind === "notice";

/**
 * ── THE PARTS OF A REPLY ──────────────────────────────────────
 * Every part of what the replica does gets its own window in the
 * room: its words as they stream, each tool call while it runs, the
 * cards and the record it opens, its questions. The windows rise out
 * of his face and settle around it (`pane-layout.ts`), drifting a
 * little; the oldest give way when the room is full.
 */
export function ReplySpace() {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const panes = usePanes(dismissed);
  const face = useInterview((s) => s.face);
  const mode = useInterview((s) => s.mode);
  const [placed, setPlaced] = useState<Map<string, Placement>>(new Map());
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const sizes = useRef(new Map<string, { w: number; h: number }>());
  const [measured, setMeasured] = useState(0);
  const born = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => setDismissed((d) => new Set(d).add(id)), []);

  useEffect(() => {
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // Escape clears the room
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useWorldStore.getState();
      if (s.mapOpen || s.cvOpen) return;
      setDismissed((d) => new Set([...d, ...panes.map((p) => p.id)]));
      if (s.sector || s.caseFile || s.brief) s.closeFocus();
      if (s.inspect) s.setInspect(null);
      if (s.prompt) s.ignore();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panes]);

  // every window is measured as it renders, and again whenever its content grows
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.pane;
        if (!id) continue;
        const w = Math.ceil((e.target as HTMLElement).offsetWidth);
        const h = Math.ceil((e.target as HTMLElement).offsetHeight);
        const before = sizes.current.get(id);
        if (before && before.w === w && Math.abs(before.h - h) < 2) continue;
        sizes.current.set(id, { w, h });
        changed = true;
      }
      if (changed) setMeasured((n) => n + 1);
    });
    nodes.current.forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  }, [panes]);

  const ids = panes.map((p) => p.id).join("|");
  useLayoutEffect(() => {
    if (!viewport.w) return;
    const now = performance.now();
    for (const p of panes) if (!born.current.has(p.id)) born.current.set(p.id, now);
    const keepClear: Box[] = [
      { x: viewport.w / 2 - 130, y: 0, w: 260, h: 110 },
      mode === "text" ? { x: viewport.w / 2 - 290, y: viewport.h - 92, w: 580, h: 92 } : { x: viewport.w / 2 - 110, y: viewport.h - 210, w: 220, h: 210 },
    ];
    const newest = panes
      .filter((p) => sizes.current.has(p.id))
      .sort((a, b) => born.current.get(b.id)! - born.current.get(a.id)!)
      .map((p) => ({ id: p.id, ...sizes.current.get(p.id)!, side: SIDE[p.kind], anchor: p.kind === "you" ? ("low" as const) : undefined }));
    setPlaced((prev) => placePanes(newest, { width: viewport.w, height: viewport.h, face, keepClear }, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ids` and `measured` are the change signals
  }, [ids, measured, face, viewport, mode]);

  const origin = face ? { x: face.x + face.w / 2, y: face.y + face.h * 0.42 } : { x: viewport.w / 2, y: viewport.h / 3 };

  return (
    <div className="pointer-events-none fixed inset-0 z-20" aria-label="The reply" role="region">
      <AnimatePresence>
        {panes.map((pane, i) => {
          const at = placed.get(pane.id);
          const width = Math.min(WIDTH[pane.kind], viewport.w - 24 || WIDTH[pane.kind]);
          const shown = !!at?.visible;
          return (
            <motion.div
              key={pane.id}
              ref={(n: HTMLDivElement | null) => {
                if (n) nodes.current.set(pane.id, n);
                else {
                  nodes.current.delete(pane.id);
                  sizes.current.delete(pane.id);
                }
              }}
              data-pane={pane.id}
              className={cn("absolute top-0 left-0", shown ? "pointer-events-auto" : "pointer-events-none")}
              style={{ width }}
              initial={{ x: origin.x - width / 2, y: origin.y - 40, opacity: 0, scale: 0.4, filter: "blur(10px)" }}
              animate={
                at
                  ? { x: at.x, y: at.y, opacity: shown ? 1 : 0, scale: shown ? 1 : 0.85, filter: shown ? "blur(0px)" : "blur(6px)" }
                  : { x: origin.x - width / 2, y: origin.y - 40, opacity: 0, scale: 0.4, filter: "blur(10px)" }
              }
              exit={{ opacity: 0, scale: 0.8, filter: "blur(8px)", transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 170, damping: 22, mass: 0.9 }}
              aria-hidden={!shown}
            >
              <div
                className={cn("pane-float glass glass-edge notch sys-panel relative [--n:12px]", compact(pane.kind) ? "px-3.5 py-2.5" : "px-4 pt-3 pb-4")}
                style={{ ["--float-s" as string]: `${6 + (i % 3)}s`, ["--float-d" as string]: `${-(i * 1.7) % 5}s` }}
              >
                <div className={cn("flex items-center gap-2", compact(pane.kind) ? "mb-1" : "mb-2")}>
                  <span className={cn("size-1.5 rounded-full", pane.kind === "words" ? "bg-arcane-hot shadow-[0_0_8px_var(--arcane-hot)]" : "bg-system")} />
                  <p className="eyebrow min-w-0 flex-1 truncate text-[9px]">{label(pane)}</p>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => {
                      play("close", { volume: 0.3 });
                      if (pane.kind === "record") pane.close();
                      else if (pane.kind === "question") useWorldStore.getState().ignore();
                      dismiss(pane.id);
                    }}
                    className="-mr-1 grid size-6 place-items-center rounded-sm text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <PaneBody pane={pane} dismiss={() => dismiss(pane.id)} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
