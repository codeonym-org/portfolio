"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, BriefcaseBusiness, FileText, FolderGit2, Mail, MapPin, Scale, Sparkles, Timer, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { executeSystemCommand } from "@/agent/system-commands";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { BriefPanel } from "@/components/interface/brief-panel";
import { Cards } from "@/components/interface/cards";
import { CasePanel } from "@/components/interface/case-panel";
import type { SectorId } from "@/config/types";
import { sectorById, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { useSession } from "@/store/session-store";
import { useWorldStore, type SystemPrompt } from "@/store/world-store";
import { describe, stepsFor } from "./activity";
import { Conversation, type ShownRef, type Tone } from "./conversation";
import { EntryExhibit, SECTION_EXHIBIT } from "./exhibits";
import { useInterview, type InterviewMode } from "./interview-store";
import { inspected } from "./shown";
import { DOCK_HEIGHT, RAIL, stage, type Stage } from "./stage";
import { Table, type Exhibit } from "./table";
import { useTable } from "./table-store";
import { nextQuestions, type InterviewTurn } from "./turns";
import { useTurns } from "./use-turns";

const copy = world.interview;
const kinds = copy.table.kinds;

const NONE: never[] = [];

const SECTOR_ICON: Record<SectorId, LucideIcon> = {
  status: UserRound,
  experience: BriefcaseBusiness,
  projects: FolderGit2,
  skills: Wrench,
  inventory: FileText,
  contact: Mail,
};
const KIND_ICON: Record<"skills" | "map" | "case" | "brief" | "project" | "document" | "skill", LucideIcon> = {
  skills: BadgeCheck,
  map: MapPin,
  case: Scale,
  brief: Timer,
  project: FolderGit2,
  document: FileText,
  skill: Sparkles,
};

const viewport = {
  subscribe: (then: () => void) => {
    window.addEventListener("resize", then);
    return () => window.removeEventListener("resize", then);
  },
  read: () => `${window.innerWidth}x${window.innerHeight}`,
  server: () => "",
};

/** where the panels and the input stand, for this screen and where his face is; null before the first paint */
export function useStage(mode: InterviewMode): Stage | null {
  const size = useSyncExternalStore(viewport.subscribe, viewport.read, viewport.server);
  const face = useInterview((s) => s.face);
  const railed = useInterview((s) => s.railed);
  return useMemo(() => {
    if (!size) return null;
    const [w, h] = size.split("x").map(Number);
    return stage(w, h, face, DOCK_HEIGHT[mode], railed ? RAIL : 0);
  }, [size, face, mode, railed]);
}

/** his question to the stranger, with its two answers */
function Ask({ prompt }: { prompt: SystemPrompt }) {
  const reply = (accepted: boolean) => {
    const command = useWorldStore.getState().prompt?.command;
    play(accepted ? "confirm" : "close", { volume: 0.5 });
    useWorldStore.getState().answer(accepted);
    if (accepted && command) void executeSystemCommand(command.name, command.args);
  };
  return (
    <motion.div className="talk-ask" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      {prompt.heading && <p className="talk-ask__head">{prompt.heading}</p>}
      <p className="talk-ask__body">{prompt.body}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => reply(true)} className="talk-btn talk-btn--go">
          {prompt.accept}
        </button>
        <button type="button" onClick={() => reply(false)} className="talk-btn">
          {prompt.decline}
        </button>
      </div>
    </motion.div>
  );
}

/** a note from the room ("your conversation is resumed"): a moment under the top bar */
function Note({ id, children, leave }: { id: string; children: ReactNode; leave: (id: string) => void }) {
  // the room re-renders while a reply streams: the note's time must not start again with it
  const latest = useRef(leave);
  useEffect(() => {
    latest.current = leave;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => latest.current(id), 6000);
    return () => window.clearTimeout(timer);
  }, [id]);
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="stage-note pointer-events-auto"
      role="status"
    >
      {children}
    </motion.div>
  );
}

/**
 * ── THE TURN IN THE ROOM ──────────────────────────────────────
 * Three places, always the same (`stage.ts`): the conversation on his
 * left, what he shows on his right, the input under him. Everything a
 * reply brings goes to one of them, so nothing collides and nothing
 * covers his face: his words and the steps he takes into the
 * conversation, what he shows and opens onto the table (the newest in
 * front), his questions to the stranger under his answer. Notes from
 * the room pass under the top bar. Escape puts away what is on the
 * table.
 */
export function TurnCanvas({ stage: s }: { stage: Stage }) {
  const turns = useTurns();
  const active = turns.at(-1);
  const running = useSession((st) => st.running);
  const trace = useSession((st) => st.trace);
  const notice = useSession((st) => st.notice);
  const tasks = useVoiceStore((st) => st.tasks);
  const phase = useVoiceStore((st) => st.phase);
  const prompt = useWorldStore((st) => st.prompt);
  const toasts = useWorldStore((st) => st.toasts);
  const laid = useTable((t) => t.laid);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  /** what has come onto the table so far (by its id and when it came) */
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());

  const hide = (id: string) => setHidden((h) => new Set(h).add(id));

  // ── the table: the cards drawn under each answer, and everything he opened ──
  const owner = (at: number) => turns.findLast((t) => t.at <= at)?.id ?? null;
  const items: Exhibit[] = [];
  for (const turn of turns)
    turn.cards.forEach((card, n) => {
      const id = `card:${turn.id}:${n}`;
      if (hidden.has(id)) return;
      const skills = card.type === "skills";
      const title = skills ? (card.title ?? copy.diary.shownWhat.skills) : card.type === "map" ? copy.diary.shownWhat.map : card.file.title;
      const kind = skills ? "skills" : card.type === "map" ? "map" : "case";
      items.push({ id, kind: kinds[kind], icon: KIND_ICON[kind], title, body: <Cards cards={[card]} />, turn: turn.id, at: turn.at + 1 + n, close: () => hide(id) });
    });
  for (const l of laid) {
    const close = () => useTable.getState().take(l.id);
    const base = { id: l.id, turn: owner(l.at), at: l.at, close };
    if (l.kind === "sector") {
      const Body = SECTION_EXHIBIT[l.sector];
      items.push({ ...base, kind: kinds.sector, icon: SECTOR_ICON[l.sector], title: sectorById[l.sector].name, body: <Body /> });
    } else if (l.kind === "case") items.push({ ...base, kind: kinds.case, icon: KIND_ICON.case, title: l.file.title, body: <CasePanel file={l.file} /> });
    else if (l.kind === "brief") items.push({ ...base, kind: kinds.brief, icon: KIND_ICON.brief, title: world.agent.brief, body: <BriefPanel /> });
    else {
      const k = l.target.kind === "quest" ? "project" : l.target.kind === "item" ? "document" : "skill";
      items.push({ ...base, kind: kinds[k], icon: KIND_ICON[k], title: inspected(l.target.kind, l.target.id), body: <EntryExhibit target={l.target} /> });
    }
  }
  items.sort((a, b) => a.at - b.at);

  // several things on the table: it widens for their rail
  const railed = items.length > 1;
  useEffect(() => {
    useInterview.getState().set({ railed });
    return () => useInterview.getState().set({ railed: false });
  }, [railed]);

  // what is new on the table comes to the front (and, on a phone, brings the sheet up)
  const fresh = items.filter((i) => !seen.has(`${i.id}@${i.at}`));
  if (fresh.length) {
    setSeen(new Set([...seen, ...fresh.map((i) => `${i.id}@${i.at}`)]));
    setSelected(fresh.at(-1)!.id);
    if (!s.wide) setSheet(true);
  }

  // what each turn showed, for its chips: rebuilt only when the table changes
  const shownKey = items.map((i) => [i.id, i.title, i.turn ?? ""].join("\u0001")).join("\u0002");
  const shownBy = useMemo(() => {
    const by = new Map<string, ShownRef[]>();
    if (!shownKey) return by;
    for (const row of shownKey.split("\u0002")) {
      const [id, title, turn] = row.split("\u0001");
      if (!turn) continue;
      by.set(turn, [...(by.get(turn) ?? []), { id, title }]);
    }
    return by;
  }, [shownKey]);
  const shownOf = useCallback((t: InterviewTurn) => shownBy.get(t.id) ?? NONE, [shownBy]);
  const asked = (turn: string) => {
    const n = turns.findIndex((t) => t.id === turn);
    return n < 0 ? undefined : { n: n + 1, you: turns[n].you };
  };

  const show = (id: string) => {
    setSelected(id);
    setSheet(true);
  };

  // ── the conversation ──
  const live = !!active && (active.spoken ? phase === "decoding" || phase === "thinking" || phase === "speaking" : running);
  const stepsOf = useCallback(
    (t: InterviewTurn) => {
      const at = turns.indexOf(t);
      return at < 0 ? NONE : stepsFor(trace, t.at, turns[at + 1]?.at);
    },
    [trace, turns],
  );

  let tone: Tone;
  let said: string;
  const working = active ? stepsOf(active).findLast((st) => st.status === "running") : undefined;
  if (phase === "listening") [tone, said] = ["listening", copy.talk.status.listening];
  else if (phase === "decoding") [tone, said] = ["listening", copy.talk.status.hearing];
  else if (phase === "speaking") [tone, said] = ["speaking", copy.talk.status.speaking];
  else if (live && working) [tone, said] = ["working", describe(working)];
  else if (live && active?.him) [tone, said] = ["answering", copy.talk.status.answering];
  else if (live || phase === "thinking") [tone, said] = ["thinking", copy.talk.status.thinking];
  else if (!turns.length) [tone, said] = ["waiting", copy.talk.status.waiting];
  else [tone, said] = ["ready", copy.talk.status.ready];

  const suggestions = useMemo(() => nextQuestions(turns, world.agent.suggestions, turns.length ? 3 : 4), [turns]);

  // Escape puts away his question, or else what is in front on the table (on a phone, first the sheet)
  const front = items.find((i) => i.id === selected) ?? items.at(-1);
  const latest = useRef({ front, sheet });
  useEffect(() => {
    latest.current = { front, sheet };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const w = useWorldStore.getState();
      if (w.mapOpen || w.cvOpen || w.cardOpen || useInterview.getState().transcript) return;
      if (w.prompt) return w.ignore();
      const { front, sheet } = latest.current;
      if (!s.wide && sheet) return setSheet(false);
      // first back along what was opened from it, then put it away
      if (front && useTable.getState().trails[front.id]?.length) return useTable.getState().back(front.id);
      front?.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.wide]);

  // ── notes from the room ──
  const leave = (id: string) => {
    hide(id);
    if (id.startsWith("toast:")) useWorldStore.getState().dismissToast(Number(id.slice(6)));
  };
  const notes = [
    ...toasts.map((t) => ({
      id: `toast:${t.id}`,
      body: (
        <>
          <b className="font-semibold text-white">{t.heading}</b> {t.body}
        </>
      ),
    })),
    ...(notice ? [{ id: `notice:${notice}`, body: <>{notice}</> }] : []),
  ].filter((n) => !hidden.has(n.id));

  const ask = prompt ? <Ask key={prompt.id} prompt={prompt} /> : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20" data-stage={s.wide ? "wide" : "sheet"}>
      <div className="pointer-events-none fixed top-[66px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2" style={{ width: s.dock.w }}>
        <AnimatePresence>
          {notes.map((n) => (
            <Note key={n.id} id={n.id} leave={leave}>
              {n.body}
            </Note>
          ))}
        </AnimatePresence>
      </div>

      <Conversation
        place={s.talk}
        wide={s.wide}
        turns={turns}
        live={live}
        status={{ tone, text: said }}
        stepsOf={stepsOf}
        tasks={live ? tasks : NONE}
        shownOf={shownOf}
        onShow={show}
        ask={ask}
        suggestions={prompt ? NONE : suggestions}
        table={s.wide ? null : { count: items.length, open: () => setSheet(true) }}
        onDiary={() => useInterview.getState().toggleTranscript()}
      />

      <Table
        place={s.table}
        wide={s.wide}
        items={items}
        selected={selected}
        onSelect={setSelected}
        open={sheet}
        onDismiss={() => setSheet(false)}
        current={active?.id ?? null}
        asked={asked}
      />
    </div>
  );
}
