"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, BookOpen, Check, ChevronDown, Layers, LoaderCircle, Mic, X } from "lucide-react";
import { converse } from "@/agent/converse";
import type { TaskRecord } from "@/agent/voice/task-queue";
import { Markdown } from "@/components/agent/markdown";
import { useReveal } from "@/components/interface/console";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import type { TraceStep } from "@/store/session-store";
import { describe, duration, took } from "./activity";
import type { Place } from "./stage";
import { TranscriptIconButton, TranscriptKeep } from "./transcript-button";
import type { InterviewTurn } from "./turns";

const copy = world.interview.talk;

/** turns kept in the panel; the diary keeps them all */
const KEEP = 24;
const NONE: never[] = [];

export type Tone = "waiting" | "ready" | "listening" | "thinking" | "working" | "answering" | "speaking";

/** what he showed in a turn, to bring it forward on the table */
export interface ShownRef {
  id: string;
  title: string;
}

const clock = (at: number) => (at ? new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

function StepIcon({ status }: { status: "running" | "done" | "failed" | "queued" }) {
  if (status === "running" || status === "queued") return <LoaderCircle className="size-3 shrink-0 animate-spin text-[oklch(0.8_0.12_232)]" />;
  if (status === "failed") return <X className="size-3 shrink-0 text-[oklch(0.72_0.18_30)]" />;
  return <Check className="size-3 shrink-0 text-[oklch(0.82_0.14_160)]" />;
}

/** the steps he took for one question: listed while he works, folded into one line once he is done */
function Steps({ steps, tasks, live }: { steps: readonly TraceStep[]; tasks: readonly TaskRecord[]; live: boolean }) {
  const [open, setOpen] = useState(false);
  if (!steps.length && !tasks.length) return null;
  const busy = steps.some((s) => s.status === "running") || tasks.some((t) => t.status !== "done" && t.status !== "failed");
  const listed = live || busy || open;
  const failed = steps.some((s) => s.status === "failed") || tasks.some((t) => t.status === "failed");
  return (
    <div className="talk-steps">
      {!live && !busy && (
        <button type="button" className="talk-steps__sum" aria-expanded={open} onClick={() => setOpen(!open)}>
          <StepIcon status={failed ? "failed" : "done"} />
          <span>{copy.steps(steps.length + tasks.length, steps.length ? duration(took(steps)) : "")}</span>
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
        </button>
      )}
      {listed && (
        <ol className="talk-steps__list">
          {steps.map((s) => (
            <li key={s.id} data-status={s.status}>
              <StepIcon status={s.status} />
              <span className="talk-steps__said">{describe(s)}</span>
              <code className="talk-steps__call">
                {s.name}
                {s.ms !== undefined && ` · ${duration(s.ms)}`}
              </code>
            </li>
          ))}
          {tasks.map((t) => (
            <li key={t.id} data-status={t.status}>
              <StepIcon status={t.status === "done" || t.status === "failed" ? t.status : "running"} />
              <span className="talk-steps__said">{t.task}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** his words written out as they come, a little behind the stream so they flow evenly */
function Revealing({ id, text, live }: { id: string; text: string; live: boolean }) {
  const { visible, done } = useReveal(text, id);
  return (
    <div className="talk-words">
      <Markdown text={visible} />
      {(!done || live) && <span className="talk-caret" aria-hidden />}
    </div>
  );
}

function Writing({ id, text, live, reveal }: { id: string; text: string; live: boolean; reveal: boolean }) {
  if (reveal) return <Revealing id={id} text={text} live={live} />;
  return (
    <div className="talk-words">
      <Markdown text={text} />
      {live && <span className="talk-caret" aria-hidden />}
    </div>
  );
}

function Dots() {
  return (
    <span className="talk-dots" aria-label={copy.status.thinking}>
      <i />
      <i />
      <i />
    </span>
  );
}

interface TurnProps {
  turn: InterviewTurn;
  active: boolean;
  live: boolean;
  reveal: boolean;
  steps: readonly TraceStep[];
  tasks: readonly TaskRecord[];
  shown: readonly ShownRef[];
  onShow: (id: string) => void;
  ask: ReactNode;
}

const sig = (steps: readonly TraceStep[]) => steps.map((s) => s.id + s.status + (s.ms ?? "")).join();

/** one question and his answer; a past one stays as it was written */
const Turn = memo(
  function Turn({ turn, active, live, reveal, steps, tasks, shown, onShow, ask }: TurnProps) {
    return (
      <motion.article
        className="talk-turn"
        data-turn={turn.id}
        data-active={active}
        aria-busy={live}
        initial={reveal ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <header className="talk-who talk-who--you">
          {turn.spoken && <Mic className="size-3" />}
          <span>{turn.spoken ? copy.heard : copy.you}</span>
          <time dateTime={turn.at ? new Date(turn.at).toISOString() : undefined}>{clock(turn.at)}</time>
        </header>
        <p className="talk-q">{turn.you}</p>

        <Steps steps={steps} tasks={tasks} live={live} />

        <div className="talk-a">
          <header className="talk-who talk-who--him">
            <span>{copy.name}</span>
          </header>
          {turn.him ? <Writing id={turn.id} text={turn.him} live={live} reveal={reveal} /> : live ? <Dots /> : <p className="talk-none">—</p>}
        </div>

        {shown.length > 0 && (
          <div className="talk-shown" aria-label={copy.shown}>
            {shown.map((s) => (
              <button key={s.id} type="button" onClick={() => onShow(s.id)} className="talk-shown__chip">
                <Layers className="size-3" />
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        )}
        {ask}
      </motion.article>
    );
  },
  (a, b) =>
    a.turn.id === b.turn.id &&
    a.turn.you === b.turn.you &&
    a.turn.him === b.turn.him &&
    a.active === b.active &&
    a.live === b.live &&
    a.reveal === b.reveal &&
    sig(a.steps) === sig(b.steps) &&
    a.tasks === b.tasks &&
    a.shown === b.shown &&
    a.onShow === b.onShow &&
    a.ask === b.ask,
);

function Ask({ questions, label }: { questions: readonly string[]; label: string }) {
  if (!questions.length) return null;
  return (
    <div className="talk-next">
      <p className="talk-next__label">{label}</p>
      <div className="talk-next__list">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            className="talk-next__chip"
            onClick={() => {
              play("confirm", { volume: 0.3 });
              void converse(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface ConversationProps {
  place: Place;
  wide: boolean;
  turns: readonly InterviewTurn[];
  /** the last turn is still being answered */
  live: boolean;
  status: { tone: Tone; text: string };
  stepsOf: (turn: InterviewTurn) => readonly TraceStep[];
  tasks: readonly TaskRecord[];
  shownOf: (turn: InterviewTurn) => readonly ShownRef[];
  onShow: (id: string) => void;
  /** his question to the stranger, under his last answer */
  ask: ReactNode;
  suggestions: readonly string[];
  /** on a phone: how many things are on the table, and how to bring it up */
  table: { count: number; open: () => void } | null;
  onDiary: () => void;
}

/**
 * ── THE CONVERSATION ──────────────────────────────────────────
 * One panel on his left, the whole conversation in it: each question,
 * the steps he took for it, his answer as he writes it, and what he
 * showed. It follows the newest line, unless the stranger scrolls back
 * to read; then a button brings it back down. His state is in its head
 * (listening, thinking, opening projects, speaking), so the stranger
 * always knows whose turn it is. It can be folded to its head on a
 * wide screen; the diary keeps everything.
 */
export function Conversation(p: ConversationProps) {
  const { place, wide, turns, live, status } = p;
  const [folded, setFolded] = useState(false);
  const [pinned, setPinned] = useState(true);
  // what was already written when the panel opened is not written again
  const [before] = useState(() => new Set(turns.map((t) => t.id)));
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);

  // follow the newest line while it is followed
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const observer = new ResizeObserver(() => {
      if (follow.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(inner);
    observer.observe(el);
    return () => observer.disconnect();
  }, [folded]);

  // a new question brings the panel back to it
  const count = turns.length;
  useEffect(() => {
    follow.current = true;
    const el = scroller.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [count]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    follow.current = atEnd;
    if (atEnd !== pinned) setPinned(atEnd);
  };

  const down = () => {
    follow.current = true;
    setPinned(true);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  };

  const kept = turns.slice(-KEEP);
  const earlier = turns.length - kept.length;
  const last = turns.at(-1);

  return (
    <motion.section
      aria-label={copy.label}
      className="stage-panel stage-talk pointer-events-auto fixed flex flex-col"
      data-wide={wide}
      style={{ left: place.left, width: place.width, bottom: place.bottom, maxHeight: `calc(100dvh - ${place.top + place.bottom}px)` }}
      initial={{ opacity: 0, x: wide ? -24 : 0, y: wide ? 0 : 24 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 210, damping: 26, delay: 0.25 }}
    >
      <header className="talk-head">
        <span className="talk-avatar" data-tone={status.tone} aria-hidden>
          {copy.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="talk-name">
            {copy.name}
            <span className="talk-badge">{copy.badge}</span>
          </p>
          <p className="talk-status" data-tone={status.tone} aria-live="polite">
            {status.text}
          </p>
        </div>
        {p.table && p.table.count > 0 && (
          <button type="button" className="talk-icon talk-icon--count" title={world.interview.table.label} aria-label={world.interview.table.label} onClick={p.table.open}>
            <Layers className="size-4" />
            <span>{p.table.count}</span>
          </button>
        )}
        <button type="button" className="talk-icon" title={copy.diary} aria-label={copy.diary} onClick={p.onDiary}>
          <BookOpen className="size-4" />
        </button>
        <TranscriptIconButton />
        {wide && (
          <button type="button" className="talk-icon" title={folded ? copy.unfold : copy.fold} aria-label={folded ? copy.unfold : copy.fold} aria-expanded={!folded} onClick={() => setFolded(!folded)}>
            <ChevronDown className={cn("size-4 transition-transform", folded && "rotate-180")} />
          </button>
        )}
      </header>

      {!folded && (
        <div ref={scroller} onScroll={onScroll} className="talk-scroll">
          <div ref={content} className="talk-log" role="log" aria-label={copy.label} aria-relevant="additions text">
            {earlier > 0 && (
              <button type="button" className="talk-earlier" onClick={p.onDiary}>
                <BookOpen className="size-3.5" />
                {copy.earlier(earlier)}
              </button>
            )}
            {!turns.length && (
              <div className="talk-empty">
                <p>{copy.empty}</p>
                {p.ask}
                <Ask questions={p.suggestions} label={copy.try} />
              </div>
            )}
            {kept.map((turn) => {
              const active = turn === last;
              return (
                <Turn
                  key={turn.id}
                  turn={turn}
                  active={active}
                  live={active && live}
                  reveal={!before.has(turn.id)}
                  steps={p.stepsOf(turn)}
                  tasks={active ? p.tasks : NONE}
                  shown={p.shownOf(turn)}
                  onShow={p.onShow}
                  ask={active ? p.ask : null}
                />
              );
            })}
            {turns.length > 0 && !live && <Ask questions={p.suggestions} label={copy.next} />}
            {turns.length > 0 && !live && <TranscriptKeep count={turns.length} />}
          </div>
        </div>
      )}

      <AnimatePresence>
        {!folded && !pinned && (
          <motion.button
            type="button"
            className="talk-latest"
            onClick={down}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <ArrowDown className="size-3.5" />
            {copy.latest}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
