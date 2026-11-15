"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Keyboard, Mic, Plus, Trash2, X } from "lucide-react";
import { ago, questions, remaining, span, type Conversation } from "@/agent/history";
import { RETENTION_MS } from "@/agent/retention";
import { Markdown } from "@/components/agent/markdown";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useHistory } from "@/store/history-store";
import { useSession } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";
import { useInterview, type SpaceLevel } from "./interview-store";
import type { InterviewTurn } from "./turns";
import { useTurns } from "./use-turns";
import { horizonPoint, stepFocus, threadPoints, threadTail, timePoints, type Point } from "./world-line";

const Scene = dynamic(() => import("./space-time-scene"), { ssr: false });

const copy = world.interview;
const sp = copy.space;
const LEVELS: SpaceLevel[] = ["turns", "time"];
/** how many events behind the one in front still carry a pane */
const BEHIND = 5;
/** how long the journey to another conversation takes, and when in it the conversation changes */
const JOURNEY_MS = 1000;
const ARRIVE_MS = 430;

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const hour = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const day = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
/** the time between two turns: "+00:42", "+1 h 05", "+2 d" */
function gap(ms: number): string {
  if (ms < 60 * 60_000) return `+${String(Math.floor(ms / 60_000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  if (ms < 24 * 60 * 60_000) return `+${Math.floor(ms / (60 * 60_000))} h ${String(Math.floor(ms / 60_000) % 60).padStart(2, "0")}`;
  return `+${Math.floor(ms / (24 * 60 * 60_000))} d`;
}
const when = (ms: number, now: number) => (sameDay(ms, now) ? hour(ms) : `${day(ms)}, ${hour(ms)}`);

/** how much an event behind the one in front has faded */
const faded = (back: number) => (back < 0 ? 0 : Math.max(0, 1 - back * 0.22));

function TurnCard({ turn, n, front }: { turn: InterviewTurn; n: number; front: boolean }) {
  const Icon = turn.spoken ? Mic : Keyboard;
  return (
    <div className="tx-card w-full px-5 pt-3.5 pb-4">
      <div className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] text-[oklch(0.86_0.1_215)] uppercase">
        <span className="tx-tag">T{String(n).padStart(2, "0")}</span>
        <span className="truncate text-white/45">{turn.spoken ? copy.panes.heard : copy.panes.you}</span>
        <Icon className="ml-auto size-3.5 shrink-0 text-white/50" />
      </div>
      <p className={cn("mb-3 text-[15px] leading-snug text-white", !front && "line-clamp-2")}>{turn.you}</p>
      <p className="air-label mb-1 text-[8px] text-[oklch(0.8_0.14_300)]">{copy.panes.words}</p>
      <div data-scrolls={front ? "" : undefined} className={cn("oracle text-[13.5px] text-white/85", front ? "max-h-[max(110px,calc(50dvh-160px))] overflow-y-auto overscroll-contain pr-1" : "line-clamp-3")}>
        {turn.him ? <Markdown text={turn.him} /> : "…"}
      </div>
      {turn.cards.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {turn.cards.map((c, i) => (
            <span key={i} className="rounded-full border border-[oklch(0.8_0.12_160/0.5)] px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-[oklch(0.86_0.12_160)] uppercase">
              {copy.panes.card} · {c.type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeCard({ c, now, front, here, sure, onTravel, onForget }: { c: Conversation; now: number; front: boolean; here: boolean; sure: boolean; onTravel: () => void; onForget: () => void }) {
  const left = remaining(c, now);
  return (
    <div className="tx-card w-full px-4 pt-3 pb-3.5">
      <div className="mb-2 flex items-center gap-2.5 font-mono text-[10px] tracking-[0.2em] text-[oklch(0.86_0.1_215)] uppercase">
        {here && <span className="tx-tag">{sp.here}</span>}
        <span className="truncate text-white/45">{turnsLabel(c)}</span>
        <span className="ml-auto shrink-0 text-white/45">
          {sp.last} {ago(now - c.updatedAt)}
          {now - c.updatedAt >= 60_000 && ` ${sp.ago}`}
        </span>
      </div>
      <p className="line-clamp-2 text-[15px] leading-snug text-white">{c.title || "…"}</p>
      {/* what is left of its seven days */}
      <div className="st-life mt-3" style={{ ["--left" as string]: (left / RETENTION_MS).toFixed(3) }} role="img" aria-label={`${sp.fades} ${span(left)}`}>
        <span />
      </div>
      <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-white/45 uppercase">
        {sp.fades} {span(left)}
      </p>
      {front && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onTravel} className="st-go flex-1 rounded-full px-4 py-1.5 font-display text-[10px] tracking-[0.26em] uppercase">
            {here ? sp.back : sp.travel}
          </button>
          <button type="button" onClick={onForget} aria-label={sp.forget} className={cn("tx-key flex h-8 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] tracking-wider uppercase", sure && "!border-[oklch(0.7_0.19_25/0.8)] !text-[oklch(0.85_0.12_25)]")}>
            <Trash2 className="size-3.5" />
            {sure && sp.forgetSure}
          </button>
        </div>
      )}
    </div>
  );
}

const turnsLabel = (c: Conversation) => sp.turns(questions(c));

/**
 * ── SPACE-TIME: THE TRANSCRIPT AND THE HISTORY ────────────────
 * One space over the room, two scales of time.
 *
 * THREAD: the turns of this conversation hang on one thread, in the
 * order they happened. Each knot on the thread carries its time and
 * the time since the turn before; the pane of the turn hangs under
 * it. The thread comes down out of the distance, and every turn
 * bends the grid under it.
 *
 * TIMELINE: every conversation kept in this browser (seven days from
 * its first message) stands along time: the older, the further. At
 * the far end is the edge of the seven days, where they are
 * forgotten. Travelling to one brings it back as the conversation in
 * progress, and shows its thread.
 *
 * The wheel, the arrows, a swipe or the rail at the bottom move
 * through time. The scene is WebGL (`space-time-scene.tsx`); the panes
 * are HTML that the scene places every frame.
 */
function Space() {
  const level = useInterview((s) => s.level);
  const setLevel = useInterview((s) => s.setLevel);
  const toggle = useInterview((s) => s.toggleTranscript);
  const turns = useTurns();
  const conversations = useHistory((s) => s.conversations);
  const current = useHistory((s) => s.current);
  const running = useSession((s) => s.running);

  const [chosen, setChosen] = useState<number | null>(null);
  const [chosenTime, setChosenTime] = useState<string | null>(null);
  const [warp, setWarp] = useState(false);
  const [sure, setSure] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [width, setWidth] = useState(() => window.innerWidth);
  const anchors = useRef<(HTMLElement | null)[]>([]);
  const horizonAnchor = useRef<HTMLDivElement>(null);
  const wheel = useRef(0);
  const touch = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    const minute = window.setInterval(() => setNow(Date.now()), 30_000);
    window.addEventListener("resize", onResize);
    const pending = timers.current;
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(minute);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const spread = Math.max(0.4, Math.min(1, width / 1100));
  const inTime = level === "time";

  // where everything stands; rebuilt only when an event is added or removed, not while a reply streams
  const turnCount = turns.length;
  const births = conversations.map((c) => c.createdAt).join(",");
  const stage = useMemo(() => {
    if (!inTime) {
      const points = threadPoints(turnCount, spread);
      return { points, tail: points.length ? threadTail(points[0], spread) : [], horizon: null as Point | null };
    }
    const points = timePoints(births ? births.split(",").map((at) => now - Number(at)) : [], spread);
    const horizon = horizonPoint(points);
    const tail = points.length ? [horizon, { x: (horizon.x + points[0].x) / 2, y: 0.25, z: (horizon.z + points[0].z) / 2 }] : [];
    return { points, tail, horizon };
  }, [inTime, turnCount, births, now, spread]);
  const masses = inTime ? conversations.map((c) => 0.5 + Math.min(0.7, questions(c) * 0.09)) : turns.map((t) => 0.45 + Math.min(0.5, t.him.length / 1600));

  const count = inTime ? conversations.length : turns.length;
  const last = count - 1;
  const hereIndex = conversations.findIndex((c) => c.id === current);
  const timeIndex = conversations.findIndex((c) => c.id === (chosenTime ?? current));
  const focus = inTime ? (timeIndex === -1 ? last : timeIndex) : Math.min(chosen ?? last, last);

  const goTo = (i: number) => {
    if (i === focus || i < 0 || i > last) return;
    play("hover", { volume: 0.3 });
    setSure(null);
    if (inTime) setChosenTime(conversations[i].id);
    else setChosen(i);
  };
  const move = (by: number) => goTo(stepFocus(focus, by, count));
  const close = () => {
    play("close", { volume: 0.4 });
    toggle();
  };
  const later = (run: () => void, ms: number) => timers.current.push(window.setTimeout(run, ms));
  const change = (next: SpaceLevel) => {
    if (next === level) return;
    play("click", { volume: 0.45 });
    setSure(null);
    setLevel(next);
  };

  /** go to a conversation: the journey, then its thread */
  const travel = (id: string) => {
    if (warp) return;
    if (id === current) return change("turns");
    play("portal", { volume: 0.5 });
    setWarp(true);
    later(() => {
      useHistory.getState().open(id);
      setChosen(null);
      setChosenTime(null);
      setLevel("turns");
    }, ARRIVE_MS);
    later(() => setWarp(false), JOURNEY_MS);
  };
  const begin = () => {
    play("confirm", { volume: 0.4 });
    useHistory.getState().fresh();
    toggle();
  };
  const forget = (id: string) => {
    if (sure !== id) {
      setSure(id);
      return later(() => setSure((s) => (s === id ? null : s)), 3500);
    }
    play("close", { volume: 0.4 });
    setSure(null);
    setChosenTime(null);
    useHistory.getState().forget(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useWorldStore.getState().cardOpen) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") move(1);
      else if (e.key === "Enter" && inTime && conversations[focus] && !(e.target as HTMLElement).closest("button")) travel(conversations[focus].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const start = turns[0]?.at ?? 0;
  const empty = count === 0;
  /** a new conversation can begin once something was asked in this one */
  const canBegin = hereIndex !== -1;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={inTime ? sp.historyLabel : copy.transcript}
      className="tx fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      onWheel={(e) => {
        // inside a pane that scrolls, the wheel reads it; elsewhere it moves through time
        if ((e.target as HTMLElement).closest("[data-scrolls]")) return;
        wheel.current += e.deltaY;
        if (Math.abs(wheel.current) < 60) return;
        move(wheel.current > 0 ? 1 : -1);
        wheel.current = 0;
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dy = e.changedTouches[0].clientY - touch.current;
        touch.current = null;
        if (Math.abs(dy) > 50 && !(e.target as HTMLElement).closest("[data-scrolls]")) move(dy > 0 ? -1 : 1);
      }}
    >
      <Scene points={stage.points} tail={stage.tail} masses={masses} focus={Math.max(0, focus)} horizon={stage.horizon} drop={inTime ? 0.55 : 1.3} warp={warp} live={!inTime && running} anchors={anchors} horizonAnchor={horizonAnchor} />
      <div className="tx-scan" aria-hidden />
      <motion.div className="st-warp" aria-hidden initial={false} animate={{ opacity: warp ? [0, 0.85, 0] : 0 }} transition={{ duration: JOURNEY_MS / 1000, times: [0, 0.42, 1] }} />

      {/* the events: each pane hangs under its knot on the thread */}
      <motion.div className="pointer-events-none absolute inset-0" animate={{ opacity: warp ? 0 : 1 }} transition={{ duration: 0.25 }}>
        {inTime
          ? conversations.map((c, i) => {
              const back = focus - i;
              if (back < -1 || back > BEHIND) return null;
              const front = back === 0;
              return (
                <div
                  key={c.id}
                  ref={(el) => {
                    anchors.current[i] = el;
                  }}
                  className={cn("st-anchor w-[min(340px,calc(100vw-3rem))]", back >= 0 && "pointer-events-auto", back > 0 && "cursor-pointer")}
                  style={{ zIndex: 100 - Math.abs(back), opacity: faded(back) }}
                  onClick={back > 0 ? () => goTo(i) : undefined}
                >
                  <p className="st-date" data-front={front}>
                    <b>{now - c.createdAt < 60_000 ? ago(0) : `${ago(now - c.createdAt)} ${sp.ago}`}</b>
                    <span>{when(c.createdAt, now)}</span>
                  </p>
                  <span className="st-tether" />
                  <TimeCard c={c} now={now} front={front} here={i === hereIndex} sure={sure === c.id} onTravel={() => travel(c.id)} onForget={() => forget(c.id)} />
                </div>
              );
            })
          : turns.map((turn, i) => {
              const back = focus - i;
              if (back < -1 || back > BEHIND) return null;
              const front = back === 0;
              const before = turns[i - 1];
              return (
                <div
                  key={turn.id}
                  ref={(el) => {
                    anchors.current[i] = el;
                  }}
                  className={cn("st-anchor w-[min(540px,calc(100vw-2rem))]", back >= 0 && "pointer-events-auto", back > 0 && "cursor-pointer")}
                  style={{ zIndex: 100 - Math.abs(back), opacity: faded(back) }}
                  onClick={back > 0 ? () => goTo(i) : undefined}
                >
                  <p className="st-date" data-front={front}>
                    <b>{clock(turn.at)}</b>
                    <span>{before ? gap(turn.at - before.at) : `${sp.origin} ${day(turn.at)}`}</span>
                    {before && !sameDay(before.at, turn.at) && <span>{day(turn.at)}</span>}
                  </p>
                  <span className="st-tether" />
                  <TurnCard turn={turn} n={i + 1} front={front} />
                </div>
              );
            })}
        {inTime && (
          <div ref={horizonAnchor} className="st-anchor st-horizon w-[220px]" title={sp.horizonNote}>
            <b>{sp.horizon}</b>
            <span>{sp.horizonDays}</span>
          </div>
        )}
      </motion.div>

      {empty && <p className="pointer-events-none absolute inset-x-6 top-[44%] mx-auto max-w-md text-center font-mono text-[11px] leading-relaxed tracking-[0.22em] text-white/60 uppercase">{inTime ? sp.empty : copy.transcriptEmpty}</p>}

      <header className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[200] flex items-center gap-2 sm:inset-x-4 sm:gap-3">
        <span className="air-dot shrink-0" style={{ ["--air-tint" as string]: "oklch(0.86 0.1 215)" }} />
        <p className="hidden font-display text-[11px] tracking-[0.34em] text-[oklch(0.9_0.08_215)] [text-shadow:0_0_14px_oklch(0.8_0.12_215)] md:block">{sp.title.toUpperCase()}</p>
        <div role="radiogroup" aria-label={sp.levelsLabel} className="tx-rail pointer-events-auto flex h-10 items-center p-1">
          {LEVELS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={level === id}
              onClick={() => change(id)}
              className={cn("relative h-full rounded-full px-3.5 font-display text-[9.5px] tracking-[0.26em] uppercase transition-colors sm:px-4", level === id ? "text-[oklch(0.14_0.04_250)]" : "text-white/55 hover:text-white")}
            >
              {level === id && <motion.span layoutId="st-level" className="absolute inset-0 rounded-full bg-[oklch(0.88_0.1_215)] shadow-[0_0_18px_oklch(0.85_0.12_215/0.8)]" transition={{ type: "spring", stiffness: 380, damping: 28 }} />}
              <span className="relative">{sp.levels[id]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={begin} disabled={!canBegin} aria-label={sp.fresh} title={sp.fresh} className="tx-key pointer-events-auto ml-auto flex h-10 shrink-0 items-center gap-2 rounded-full px-3 disabled:opacity-35">
          <Plus className="size-4" />
          <span className="hidden font-display text-[9.5px] tracking-[0.26em] uppercase sm:inline">{sp.fresh}</span>
        </button>
        <button type="button" aria-label={copy.card.close} onClick={close} className="tx-key pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full">
          <X className="size-4" />
        </button>
      </header>

      {/* time: one mark per event, the past on the left */}
      {!empty && (
        <footer className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[200] flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4">
          <p className="w-full text-center font-mono text-[9px] tracking-[0.22em] text-white/40 uppercase [text-shadow:0_0_8px_#000]">{inTime ? sp.hintTime : sp.hintTurns}</p>
          <button type="button" aria-label={sp.older} title={sp.older} disabled={focus <= 0} onClick={() => move(-1)} className="tx-key pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-30">
            <ChevronLeft className="size-4" />
          </button>
          <div className="tx-rail pointer-events-auto flex max-w-[min(640px,70vw)] items-center gap-1 overflow-x-auto px-3 py-2">
            {inTime && <span className="mr-1 shrink-0 font-mono text-[9px] tracking-wider text-[oklch(0.8_0.14_300)] uppercase">7 d</span>}
            {(inTime ? conversations.map((c) => ({ id: c.id, title: c.title, label: ago(now - c.createdAt) })) : turns.map((t) => ({ id: t.id, title: t.you, label: gap(t.at - start).slice(1) }))).map((mark, i) => (
              <button key={mark.id} type="button" aria-label={mark.title} aria-current={i === focus} title={mark.title} onClick={() => goTo(i)} className="group flex shrink-0 flex-col items-center gap-1 px-1.5">
                <span className={cn("block h-3 w-px bg-[oklch(0.8_0.1_215/0.5)] transition-all", i === focus && "h-5 w-0.5 bg-[oklch(0.9_0.1_215)] shadow-[0_0_10px_oklch(0.85_0.12_215)]", inTime && i === hereIndex && i !== focus && "bg-[oklch(0.8_0.14_300)]")} />
                <span className={cn("font-mono text-[9px] tracking-wider whitespace-nowrap transition-colors", i === focus ? "text-white" : "text-white/40 group-hover:text-white/80")}>{mark.label}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-label={sp.newer} title={sp.newer} disabled={focus >= last} onClick={() => move(1)} className="tx-key pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-30">
            <ChevronRight className="size-4" />
          </button>
        </footer>
      )}
    </motion.div>
  );
}

export function SpaceTime() {
  const open = useInterview((s) => s.transcript);
  return <AnimatePresence>{open && <Space />}</AnimatePresence>;
}
