"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Caveat, Homemade_Apple, IM_Fell_English } from "next/font/google";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, List, Mic, X } from "lucide-react";
import { remaining, span } from "@/agent/history";
import { world } from "@/config/world.config";
import { pageTurn, play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useHistory } from "@/store/history-store";
import { useSession } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";
import { bind, faces, leaf, leaves, roman, seed, turnedFor, type Block, type Diary, type Face, type Page } from "./diary";
import { useInterview } from "./interview-store";
import { buildTurns, type InterviewTurn } from "./turns";
import { useTurns } from "./use-turns";

const hand = Caveat({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-hand" });
const script = Homemade_Apple({ subsets: ["latin"], weight: "400", variable: "--font-script" });
const fell = IM_Fell_English({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-fell" });

const copy = world.interview.diary;
/** a page is this much taller than it is wide */
const TALL = 1.42;
/** the strips a turning page bends along, spine to edge */
const SEGS = 8;
const TURN_MS = 720;
const RIFFLE_MS = 240;

const longDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function lately(ms: number, now: number): string {
  const d = new Date(ms).toDateString();
  if (d === new Date(now).toDateString()) return `today ${copy.at} ${clock(ms)}`;
  if (d === new Date(now - 864e5).toDateString()) return `yesterday ${copy.at} ${clock(ms)}`;
  return `${shortDay(ms)} ${copy.at} ${clock(ms)}`;
}

const asDiaryTurns = (turns: readonly InterviewTurn[]) => turns.map((t) => ({ id: t.id, you: t.you, him: t.him, spoken: t.spoken, at: t.at, shown: t.cards.map((c) => c.type) }));

/* ── the bending page ─────────────────────────────────────────── */

/**
 * A leaf being turned, rigged like a chain of bones: eight strips from
 * the spine to the edge, each hinged on the one before. The whole leaf
 * turns through 180°, and while it is in the air its edge runs ahead
 * of the spine, so the paper curls; each strip is shaded by how far it
 * faces away from the light. A board (the cover) is `stiff`: it turns
 * in one piece on its hinge, without curling. What `register` is given
 * moves it (0 flat on the right … 1 flat on the left) without a render.
 */
function Bend({ front, back, w, stiff, register }: { front: ReactNode; back: ReactNode; w: number; stiff: boolean; register: (move: ((p: number) => void) | null) => void }) {
  const segs = useRef<(HTMLDivElement | null)[]>([]);
  const s = w / SEGS;

  useLayoutEffect(() => {
    register((p: number) => {
      const theta = 180 * p;
      const curl = stiff ? 0 : 62 * Math.sin(Math.PI * p);
      let before = 0;
      for (let i = 0; i < SEGS; i++) {
        const el = segs.current[i];
        if (!el) continue;
        const k = i / (SEGS - 1);
        const phi = Math.max(0, Math.min(180, theta + curl * (Math.pow(k, 1.5) - 0.32)));
        el.style.transform = `rotateY(${-(phi - before)}deg)`;
        el.style.setProperty("--shade", (Math.sin((phi * Math.PI) / 180) * 0.5).toFixed(3));
        el.style.setProperty("--gloss", Math.max(0, Math.sin(((phi - 35) * Math.PI) / 110) * 0.35).toFixed(3));
        before = phi;
      }
    });
    return () => register(null);
  }, [register, stiff]);

  const strip = (i: number): ReactNode => (
    <div
      className="db-seg"
      ref={(el) => {
        segs.current[i] = el;
      }}
      style={{ width: s + 0.6, left: i === 0 ? 0 : s }}
    >
      <div className={cn("db-side", i === SEGS - 1 && "db-side--edge")}>
        <div className="db-slice" style={{ width: w, transform: `translateX(${-i * s}px)` }}>
          {front}
        </div>
        <i className="db-shade" />
      </div>
      <div className={cn("db-side db-side--back", i === SEGS - 1 && "db-side--edge")}>
        <div className="db-slice" style={{ width: w, transform: `translateX(${-(w - (i + 1) * s)}px)` }}>
          {back}
        </div>
        <i className="db-shade" />
      </div>
      {i + 1 < SEGS && strip(i + 1)}
    </div>
  );
  return <div className="db-bend">{strip(0)}</div>;
}

/* ── what is written on the pages ─────────────────────────────── */

interface Ink {
  diaries: Diary[];
  pages: Page[];
  starts: number[];
  here: number;
  now: number;
  canBegin: boolean;
  sure: string | null;
  goPage: (page: number) => void;
  open: (id: string) => void;
  tear: (id: string) => void;
  begin: () => void;
}

function Postmark({ at, tilt }: { at: number; tilt: number }) {
  const d = new Date(at);
  return (
    <div className="db-postmark" style={{ rotate: `${tilt}deg` }} aria-hidden>
      <span>{d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}</span>
      <b>{d.getFullYear()}</b>
      <span>{clock(at)}</span>
      <svg viewBox="0 0 120 40" className="db-postmark__waves">
        {[8, 20, 32].map((y) => (
          <path key={y} d={`M0 ${y} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} />
        ))}
      </svg>
    </div>
  );
}

function Squiggle() {
  return (
    <svg className="db-squiggle" viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden>
      <path d="M2 5 C 30 1, 50 8, 80 4 S 140 2, 198 5" />
    </svg>
  );
}

function Entry({ b, i }: { b: Block; i: number }) {
  switch (b.kind) {
    case "day":
      return (
        <div className="db-day">
          <span>{longDay(b.at)}</span>
          <Squiggle />
        </div>
      );
    case "ask":
      return (
        <div className={cn("db-ask", i === 0 && "db-ask--top")}>
          <time className="db-margin" dateTime={new Date(b.at).toISOString()}>
            {clock(b.at)}
          </time>
          <p>
            <span className="sr-only">{b.spoken ? copy.heard : copy.you}: </span>— {b.text}
            {b.spoken && (
              <span className="db-aloud" aria-hidden>
                <Mic />
                {copy.aloud}
              </span>
            )}
          </p>
        </div>
      );
    case "say":
      return <p className={cn("db-say", b.item && "db-say--item")}>{b.text}</p>;
    case "writing":
      return <p className="db-say db-writing">{copy.writing}</p>;
    case "shown":
      return (
        <div className="db-shown">
          <span className="db-clip" aria-hidden />
          {copy.shown}: {b.what.map((w) => copy.shownWhat[w] ?? w).join(" · ")}
        </div>
      );
  }
}

function PageFace({ n, ink, side }: { n: number; ink: Ink; side: "recto" | "verso" }) {
  const page = ink.pages[n];
  const folio = <span className={cn("db-folio", side === "verso" && "db-folio--verso")}>{n + 1}</span>;
  const diary = page.kind === "title" || page.kind === "entry" ? ink.diaries[page.diary] : null;
  const luck = seed(`${diary?.id ?? "book"}:${n}`);

  let body: ReactNode = null;
  let ribbon = false;
  if (page.kind === "contents") {
    body = (
      <>
        <h2 className="db-heading">
          <span aria-hidden>❦ </span>
          {page.first ? copy.contents : copy.contentsMore}
          <span aria-hidden> ❦</span>
        </h2>
        {page.rows.length === 0 && (
          <div className="db-note" style={{ rotate: "-2.5deg", marginTop: "2.5em" }}>
            <i className="db-tape" />
            {copy.none}
          </div>
        )}
        <ol className="db-toc">
          {page.rows.map(({ diary: d, page: p }) => {
            const it = ink.diaries[d];
            return (
              <li key={it.id}>
                <button type="button" onClick={() => ink.goPage(p)}>
                  <span className="db-toc__no">{roman(d + 1)}.</span>
                  <span className="db-toc__title">{it.title || "…"}</span>
                  <span className="db-toc__dots" aria-hidden />
                  <span className="db-toc__page">{p + 1}</span>
                  <span className="db-toc__date">
                    {shortDay(it.createdAt)}, {clock(it.createdAt)}
                    {d === ink.here && <em> ★ {copy.here}</em>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </>
    );
  } else if (page.kind === "title" && diary) {
    const here = page.diary === ink.here;
    const left = remaining(diary, ink.now);
    const asked = diary.turns.length;
    body = (
      <div className="db-title">
        <p className="db-title__no">
          <span aria-hidden>— </span>
          {copy.no} {roman(page.diary + 1)}
          <span aria-hidden> —</span>
        </p>
        <h2 className="db-title__name">{diary.title || "…"}</h2>
        <p className="db-title__line">
          {copy.begun} {longDay(diary.createdAt)}, {copy.at} {clock(diary.createdAt)}.
        </p>
        <p className="db-title__line">
          {copy.last} {lately(diary.updatedAt, ink.now)} · {copy.questions(asked)}
        </p>
        <Postmark at={diary.createdAt} tilt={-14 + luck * 22} />
        <div className="db-note db-note--title" style={{ rotate: `${-4 + luck * 7}deg` }}>
          <i className="db-tape" />
          {copy.fades(span(left), shortDay(diary.createdAt + 7 * 864e5))}
        </div>
        {here && <span className="db-sticker">{copy.here}</span>}
        <div className="db-title__acts">
          {!here && (
            <button type="button" className="db-act" onClick={() => ink.open(diary.id)}>
              {copy.open} →
            </button>
          )}
          <button type="button" className={cn("db-act db-act--pencil", ink.sure === diary.id && "db-act--sure")} onClick={() => ink.tear(diary.id)}>
            {ink.sure === diary.id ? copy.tearSure : copy.tear}
          </button>
        </div>
      </div>
    );
  } else if (page.kind === "entry" && diary) {
    const lastOfHere = page.diary === ink.here && (ink.pages[n + 1]?.kind !== "entry" || (ink.pages[n + 1] as { diary: number }).diary !== page.diary);
    body = (
      <>
        <header className="db-running">
          <span>
            {copy.no} {roman(page.diary + 1)}
          </span>
          <span>{shortDay(diary.createdAt)}</span>
        </header>
        <div className="db-lines">
          {!page.first && page.blocks[0]?.kind === "say" && page.blocks[0].cont && <span className="db-cont">({copy.cont})</span>}
          {page.blocks.map((b, i) => (
            <Entry key={i} b={b} i={i} />
          ))}
        </div>
      </>
    );
    ribbon = lastOfHere;
  } else if (page.kind === "fresh") {
    body = (
      <div className="db-fresh">
        <h2 className="db-heading">{copy.fresh}</h2>
        <p className="db-fresh__note">{copy.freshNote}</p>
        <button type="button" className="db-act" disabled={!ink.canBegin} onClick={ink.begin}>
          {copy.begin} →
        </button>
        <svg className="db-quill" viewBox="0 0 120 120" aria-hidden>
          <path d="M18 104 C 40 70, 70 30, 112 8 C 96 40, 70 74, 26 100 Z" />
          <path d="M18 104 L 60 56" />
          <path d="M14 110 l6 -8" />
        </svg>
      </div>
    );
  }

  // the book has been near a fire and under a cup: each page burnt its own way at the edges, some stained
  return (
    <>
      <div className={cn("db-paper", `db-paper--${side}`, page.kind === "entry" && "db-paper--ruled")} data-burn={Math.floor(luck * 3)} style={{ ["--luck" as string]: luck }}>
        {luck < 0.22 && <i className="db-ring" style={{ left: `${40 + luck * 160}%`, top: `${56 + luck * 110}%`, rotate: `${luck * 1600}deg` }} aria-hidden />}
        {luck >= 0.22 && luck < 0.3 && <i className="db-spill" style={{ left: `${30 + (luck - 0.22) * 400}%`, top: `${68 - (luck - 0.22) * 300}%`, rotate: `${luck * 1100}deg` }} aria-hidden />}
        {body}
        {folio}
      </div>
      {ribbon && <i className={cn("db-ribbon", side === "recto" && "db-ribbon--recto")} aria-hidden />}
    </>
  );
}

function FaceView({ face, ink, side }: { face: Face; ink: Ink; side: "recto" | "verso" }) {
  switch (face.kind) {
    case "cover":
      return (
        <div className="db-cover">
          <i className="db-cover__frame" />
          <i className="db-corner db-corner--tr" />
          <i className="db-corner db-corner--br" />
          <div className="db-cover__plate">
            <span className="db-cover__title">{copy.cover}</span>
            <span className="db-cover__sub">{copy.coverSub}</span>
            <span className="db-cover__name">{copy.coverName}</span>
          </div>
          <span className="db-cover__mark">MMXXVI</span>
        </div>
      );
    case "back":
      return (
        <div className="db-cover db-cover--back">
          <i className="db-cover__frame" />
          <i className="db-corner db-corner--tl" />
          <i className="db-corner db-corner--bl" />
        </div>
      );
    case "endpaper":
      return (
        <div className={cn("db-endpaper", `db-paper--${side}`)}>
          {side === "verso" && (
            <div className="db-bookplate">
              <span>Ex Libris</span>
              <em>{copy.endpaper}</em>
            </div>
          )}
        </div>
      );
    case "page":
      return <PageFace n={face.page} ink={ink} side={side} />;
    case "blank":
    case "verso":
      return <div className={cn("db-paper", `db-paper--${side}`)} />;
  }
}

/* ── the book ─────────────────────────────────────────────────── */

function useSize() {
  const read = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spread = vw >= 860 && vw / vh > 1.05;
    const pw = Math.floor(spread ? Math.min((vw - 150) / 2, (vh - 230) / TALL, 560) : Math.min(vw - 40, (vh - 170) / TALL, 520));
    return { spread, pw };
  };
  const [size, setSize] = useState(read);
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

interface Turning {
  leaf: number;
  dir: 1 | -1;
}

/**
 * ── THE BOOK OF DIARIES: THE TRANSCRIPT AND THE HISTORY ───────
 * Every conversation kept in this browser (seven days from its first
 * question) is a diary, and they are bound in one old leather book:
 * the contents, then each diary with its title page (dated, stamped,
 * with a note of when it fades) and its entries written by hand, each
 * question with its time in the margin. The conversation in progress
 * is written in live, and a ribbon marks where it stops.
 *
 * Pages turn by dragging a corner, clicking near the edge, the wheel,
 * the arrows or the keys; each one bends as it turns (`Bend`) and
 * rustles (`pageTurn`). On a phone the book shows one page at a time.
 * The layout of the pages is `diary.ts`.
 */
function Book() {
  const level = useInterview((s) => s.level);
  const toggle = useInterview((s) => s.toggleTranscript);
  const live = useTurns();
  const conversations = useHistory((s) => s.conversations);
  const current = useHistory((s) => s.current);
  const running = useSession((s) => s.running);
  const { spread, pw } = useSize();
  const [now, setNow] = useState(() => Date.now());
  const [sure, setSure] = useState<string | null>(null);

  useEffect(() => {
    const minute = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(minute);
  }, []);

  const diaries = useMemo<Diary[]>(
    () =>
      conversations.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        title: c.title,
        turns: asDiaryTurns(c.id === current ? live : buildTurns(c.turns, c.voice)),
      })),
    [conversations, current, live],
  );
  const here = conversations.findIndex((c) => c.id === current);
  const { pages, starts } = useMemo(() => bind(diaries, running && here !== -1 ? here : null), [diaries, running, here]);
  const all = useMemo(() => faces(pages.length, spread), [pages.length, spread]);
  const total = leaves(all, spread);

  // where it opens: this conversation's last page, or the contents
  const opening = useMemo(() => {
    if (level === "time" || here === -1) return 0;
    const next = starts[here + 1] ?? pages.length - 1;
    return next - 1;
    // only when the book is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [turned, setTurned] = useState(0);
  const [aim, setAim] = useState(0);
  const [turning, setTurning] = useState<Turning | null>(null);
  const bendApi = useRef<((p: number) => void) | null>(null);
  const motionRef = useRef<{ p: number; goal: number; from: number; t0: number; ms: number; raf: number; quick: boolean } | null>(null);
  const cast = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; side: "left" | "right"; live: boolean; dir: 1 | -1 } | null>(null);
  const wheel = useRef(0);
  const register = useCallback((move: ((p: number) => void) | null) => {
    bendApi.current = move;
  }, []);

  /** the page in view with `n` leaves turned (on a spread, the right one if it is a page) */
  const pageAt = (n: number, isSpread: boolean, list: readonly Face[]) => {
    const count = leaves(list, isSpread);
    const right = n < count ? leaf(list, n, isSpread)[0] : null;
    const left = isSpread && n > 0 ? leaf(list, n - 1, isSpread)[1] : null;
    return right?.kind === "page" ? right.page : left?.kind === "page" ? left.page : n === 0 ? 0 : pages.length - 1;
  };

  /** turn to `target` leaves; far away, most of the way at once and the last leaves by hand */
  const seek = (target: number) => {
    const far = target - turned;
    if (Math.abs(far) > 5) setTurned(target - Math.sign(far) * 3);
    setAim(target);
  };

  // the cover opens, then the pages riffle to where the book opens
  useEffect(() => {
    const t = window.setTimeout(() => seek(turnedFor(opening, spread)), 420);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a phone turned sideways keeps the same page in view; pages torn out keep the book inside its covers
  const [laidOut, setLaidOut] = useState({ spread, all });
  if (laidOut.spread !== spread || laidOut.all !== all) {
    const t = laidOut.spread !== spread ? turnedFor(pageAt(turned, laidOut.spread, laidOut.all), spread) : Math.min(turned, total);
    setLaidOut({ spread, all });
    if (t !== turned || laidOut.spread !== spread) {
      setTurning(null);
      setTurned(t);
      setAim(t);
    }
  }

  const apply = (p: number) => {
    bendApi.current?.(p);
    if (cast.current) cast.current.style.opacity = (Math.sin(Math.PI * p) * 0.55).toFixed(3);
  };

  const finish = (completed: boolean, t: Turning) => {
    motionRef.current = null;
    if (completed) setTurned((n) => n + t.dir);
    setTurning(null);
    if (cast.current) cast.current.style.opacity = "0";
  };

  /** run the turning leaf from where it is to `goal` (0 or 1) */
  const run = (t: Turning, goal: number, ms: number) => {
    const m = motionRef.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.from = m.p;
    m.goal = goal;
    m.t0 = performance.now();
    m.ms = Math.max(120, ms * Math.abs(goal - m.p));
    const step = () => {
      const k = Math.min(1, (performance.now() - m.t0) / m.ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      m.p = m.from + (m.goal - m.from) * e;
      apply(m.p);
      if (k < 1) m.raf = requestAnimationFrame(step);
      else finish(t.dir === 1 ? goal === 1 : goal === 0, t);
    };
    m.raf = requestAnimationFrame(step);
  };

  /** lift a leaf: forward the one on the right, back the one on the left */
  const lift = (dir: 1 | -1, quick: boolean, held: boolean) => {
    const k = dir === 1 ? turned : turned - 1;
    if (turning || k < 0 || k >= total) return null;
    const t = { leaf: k, dir };
    const p = dir === 1 ? 0 : 1;
    motionRef.current = { p, goal: p, from: p, t0: 0, ms: 0, raf: 0, quick };
    setTurning(t);
    if (!held) pageTurn({ quick, volume: 0.55 });
    return t;
  };

  // once the leaf is on the page, start it moving (unless a hand holds it)
  useLayoutEffect(() => {
    const m = motionRef.current;
    if (!turning || !m) return;
    apply(m.p);
    if (!drag.current?.live) run(turning, turning.dir === 1 ? 1 : 0, m.quick ? RIFFLE_MS : TURN_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turning]);

  // walk toward the page asked for, a leaf at a time; far away, most of the way at once
  useEffect(() => {
    if (turning || drag.current?.live || aim === turned) return;
    const dir = aim > turned ? 1 : -1;
    // the cover opens slowly; pages on the way somewhere riffle
    lift(dir, Math.abs(aim - turned) > 1 && turned > 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aim, turned, turning]);

  useEffect(() => () => cancelAnimationFrame(motionRef.current?.raf ?? 0), []);

  const step = (dir: 1 | -1) => {
    if (turning) return;
    const next = Math.max(0, Math.min(total, turned + dir));
    if (next === turned) return;
    setAim(next);
  };
  const goPage = (p: number) => seek(turnedFor(p, spread));

  const close = () => {
    play("close", { volume: 0.4 });
    toggle();
  };
  const open = (id: string) => {
    play("confirm", { volume: 0.4 });
    useHistory.getState().open(id);
    toggle();
  };
  const begin = () => {
    play("confirm", { volume: 0.4 });
    useHistory.getState().fresh();
    toggle();
  };
  const tear = (id: string) => {
    if (sure !== id) {
      setSure(id);
      window.setTimeout(() => setSure((s) => (s === id ? null : s)), 3500);
      return;
    }
    pageTurn({ volume: 0.7 });
    setSure(null);
    useHistory.getState().forget(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useWorldStore.getState().cardOpen) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") step(-1);
      else if (e.key === "ArrowRight" || e.key === "PageDown") step(1);
      else if (e.key === "Home") goPage(0);
      else if (e.key === "End") goPage(pages.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* dragging a page by its edge */
  const onDown = (e: ReactPointerEvent, side: "left" | "right") => {
    if (turning || (e.target as HTMLElement).closest("button, a")) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, side, live: false, dir: side === "right" ? 1 : -1 };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.live) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
      // on one page alone, a drag to the right brings the page before back
      const dir: 1 | -1 = spread ? d.dir : dx < 0 ? 1 : -1;
      if ((dir === 1 && dx > 0) || (dir === -1 && dx < 0)) return;
      d.dir = dir;
      d.live = true;
      if (!lift(dir, false, true)) {
        drag.current = null;
        return;
      }
      (e.target as HTMLElement).closest(".db-slot")?.setPointerCapture?.(e.pointerId);
    }
    const m = motionRef.current;
    if (!m) return;
    const reach = spread ? pw * 1.7 : pw * 1.1;
    m.p = d.dir === 1 ? Math.min(1, Math.max(0, -dx / reach)) : 1 - Math.min(1, Math.max(0, dx / reach));
    apply(m.p);
  };
  const onUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.live) {
      // a click near the outer edge turns the page
      const slot = (e.target as HTMLElement).closest(".db-slot");
      if (!slot) return;
      const rect = slot.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      if (!(e.target as HTMLElement).closest("button, a")) {
        if (d.side === "right" && x > 0.72) step(1);
        else if (d.side === "left" && x < 0.28) step(-1);
      }
      return;
    }
    const m = motionRef.current;
    if (!m || !turning) return;
    const done = d.dir === 1 ? m.p > 0.3 : m.p < 0.7;
    if (done) {
      pageTurn({ volume: 0.55 });
      setAim(turned + d.dir);
    }
    run(turning, d.dir === 1 ? (done ? 1 : 0) : done ? 0 : 1, TURN_MS);
  };

  const ink: Ink = { diaries, pages, starts, here, now, canBegin: here !== -1, sure, goPage, open, tear, begin };

  // what lies flat: the back of the last leaf turned on the left, the front of the next on the right
  const underLeft = turning ? turning.leaf - 1 : turned - 1;
  const underRight = turning ? turning.leaf + 1 : turned;
  const leftFace = spread && underLeft >= 0 ? leaf(all, underLeft, spread)[1] : null;
  const rightFace = underRight < total ? leaf(all, underRight, spread)[0] : null;
  const turningFaces = turning ? leaf(all, turning.leaf, spread) : null;

  // closed, the book sits with its cover in the middle
  const closedFront = spread && turned === 0 && !turning;
  const closedBack = spread && turned === total && !turning;
  const shift = closedFront ? -pw / 2 : closedBack ? pw / 2 : 0;
  const leftStack = Math.max(0, Math.min(12, (turned - 1) * 0.5));
  const rightStack = Math.max(0, Math.min(12, (total - turned - 1) * 0.5));

  const pageNow = pageAt(turned, spread, all);
  const style = { ["--pw" as string]: `${pw}px`, ["--ph" as string]: `${Math.round(pw * TALL)}px` } as CSSProperties;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={copy.label}
      className={cn("db-room fixed inset-0 z-50 overflow-hidden", hand.variable, script.variable, fell.variable)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onWheel={(e) => {
        wheel.current += e.deltaY + e.deltaX;
        if (Math.abs(wheel.current) < 90) return;
        step(wheel.current > 0 ? 1 : -1);
        wheel.current = 0;
      }}
    >
      <button type="button" aria-label={copy.close} title={copy.close} onClick={close} className="db-key absolute top-[max(0.9rem,env(safe-area-inset-top))] right-4 z-[30] grid size-10 place-items-center rounded-full">
        <X className="size-4" />
      </button>

      <div className="absolute inset-0 grid place-items-center pb-14">
        <motion.div initial={{ y: 60, rotateX: 18, opacity: 0 }} animate={{ y: 0, rotateX: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 20 }} style={{ transformPerspective: 2000 }}>
          <div className={cn("db-book", spread ? "db-book--spread" : "db-book--single")} style={{ ...style, width: spread ? pw * 2 : pw, transform: `translateX(${shift}px)` }}>
            {/* the boards and the edges of the pages under them */}
            {/* while a cover turns, it is itself the board on its side */}
            {spread && (turning ? turning.leaf > 0 : turned > 0) && <i className="db-board db-board--left" />}
            {(turning ? turning.leaf < total - 1 : turned < total) && <i className="db-board db-board--right" />}
            {spread && turned > 1 && <i className="db-stack db-stack--left" style={{ width: leftStack }} />}
            {turned < total - 1 && <i className="db-stack db-stack--right" style={{ width: rightStack }} />}

            {leftFace && (
              <div className="db-slot db-slot--left" onPointerDown={(e) => onDown(e, "left")}>
                <FaceView face={leftFace} ink={ink} side="verso" />
              </div>
            )}
            {rightFace && (
              <div className="db-slot db-slot--right" onPointerDown={(e) => onDown(e, "right")}>
                <FaceView face={rightFace} ink={ink} side="recto" />
              </div>
            )}
            {spread && <div ref={cast} className="db-cast" aria-hidden />}
            {spread && turned > 0 && turned < total && <i className="db-gutter" aria-hidden />}

            {turning && turningFaces && (
              <div className="db-turning">
                <Bend register={register} w={pw} stiff={turningFaces[0].kind === "cover" || turningFaces[1].kind === "back"} front={<FaceView face={turningFaces[0]} ink={ink} side="recto" />} back={<FaceView face={turningFaces[1]} ink={ink} side="verso" />} />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <footer className="pointer-events-none absolute inset-x-0 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-[30] flex flex-col items-center gap-2 px-4">
        <nav aria-label={copy.label} className="db-key db-bar pointer-events-auto">
          <button type="button" aria-label={copy.prev} title={copy.prev} disabled={turned <= 0} onClick={() => step(-1)}>
            <ChevronLeft className="size-4" />
          </button>
          <i className="db-bar__sep" aria-hidden />
          <button type="button" onClick={() => goPage(0)}>
            <List className="size-3.5" />
            <span className="font-[family-name:var(--font-fell)] text-[15px] italic">{copy.toContents}</span>
          </button>
          <i className="db-bar__sep" aria-hidden />
          <span className="min-w-[4.5rem] px-2 font-[family-name:var(--font-fell)] text-[15px] tabular-nums" aria-live="polite">
            {turned === 0 ? "—" : `${Math.min(pageNow + 1, pages.length)} / ${pages.length}`}
          </span>
          <i className="db-bar__sep" aria-hidden />
          <button type="button" aria-label={copy.next} title={copy.next} disabled={turned >= total} onClick={() => step(1)}>
            <ChevronRight className="size-4" />
          </button>
        </nav>
        <p className="hidden font-[family-name:var(--font-fell)] text-[12.5px] tracking-wide text-[#e9dcc0]/40 italic sm:block">{copy.hint}</p>
      </footer>
    </motion.div>
  );
}

export function DiaryBook() {
  const open = useInterview((s) => s.transcript);
  return <AnimatePresence>{open && <Book key="book" />}</AnimatePresence>;
}
