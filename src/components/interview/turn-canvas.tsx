"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { executeSystemCommand } from "@/agent/system-commands";
import { useVoiceStore } from "@/components/agent/voice/voice-store";
import { BriefPanel } from "@/components/interface/brief-panel";
import { Cards } from "@/components/interface/cards";
import { CasePanel } from "@/components/interface/case-panel";
import { InspectBody } from "@/components/interface/inspect";
import { ArsenalPanel, ChroniclePanel, GatePanel, ShadowsPanel, StatusPanel, VaultPanel } from "@/components/interface/sector-panels";
import { findItem } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill } from "@/config/skills.config";
import type { SectorId } from "@/config/types";
import { sectorById, world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { useSession } from "@/store/session-store";
import { useWorldStore, type SystemPrompt } from "@/store/world-store";
import { describe, stepsFor } from "./activity";
import { Conversation, type ShownRef, type Tone } from "./conversation";
import { useInterview, type InterviewMode } from "./interview-store";
import { DOCK_HEIGHT, stage, type Stage } from "./stage";
import { Table, type Exhibit } from "./table";
import { nextQuestions, type InterviewTurn } from "./turns";
import { useTurns } from "./use-turns";

const copy = world.interview;
const kinds = copy.table.kinds;

const SECTOR_BODY: Record<SectorId, () => ReactNode> = {
  status: StatusPanel,
  experience: ChroniclePanel,
  projects: ShadowsPanel,
  skills: ArsenalPanel,
  inventory: VaultPanel,
  contact: GatePanel,
};

const NONE: never[] = [];

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
  return useMemo(() => {
    if (!size) return null;
    const [w, h] = size.split("x").map(Number);
    return stage(w, h, face, DOCK_HEIGHT[mode]);
  }, [size, face, mode]);
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

/** the name of what is inspected */
function inspected(kind: "skill" | "item" | "quest", id: string): string {
  if (kind === "skill") return findSkill(id)?.name ?? id;
  if (kind === "item") return findItem(id)?.name ?? id;
  return quests.find((q) => q.id === id)?.name ?? id;
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
  const sector = useWorldStore((st) => st.sector);
  const caseFile = useWorldStore((st) => st.caseFile);
  const brief = useWorldStore((st) => st.brief);
  const inspect = useWorldStore((st) => st.inspect);
  const prompt = useWorldStore((st) => st.prompt);
  const toasts = useWorldStore((st) => st.toasts);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  /** when each thing on the table first came, and in which turn */
  const [seen, setSeen] = useState<{ order: readonly string[]; turn: Readonly<Record<string, string | null>> }>({ order: [], turn: {} });

  const hide = (id: string) => setHidden((h) => new Set(h).add(id));

  // ── the table ──
  const world$ = useWorldStore.getState();
  const items: Exhibit[] = [];
  active?.cards.forEach((card, n) => {
    const id = `card:${active.id}:${n}`;
    if (hidden.has(id)) return;
    const title = card.type === "skills" ? (card.title ?? copy.diary.shownWhat.skills) : card.type === "map" ? copy.diary.shownWhat.map : card.file.title;
    items.push({ id, kind: kinds[card.type === "skills" ? "skills" : card.type === "map" ? "map" : "case"], title, body: <Cards cards={[card]} />, close: () => hide(id) });
  });
  if (sector) {
    const def = sectorById[sector];
    const Body = SECTOR_BODY[sector];
    items.push({ id: `sector:${sector}`, kind: kinds.sector, title: def.name, body: <Body />, close: world$.closeFocus });
  }
  if (caseFile) items.push({ id: `case:${caseFile.title}`, kind: kinds.case, title: caseFile.title, body: <CasePanel file={caseFile} />, close: world$.closeFocus });
  if (brief) items.push({ id: "brief", kind: kinds.brief, title: world.agent.brief, body: <BriefPanel />, close: world$.closeFocus });
  if (inspect)
    items.push({
      id: `inspect:${inspect.kind}:${inspect.id}`,
      kind: inspect.kind === "quest" ? kinds.project : inspect.kind === "item" ? kinds.document : kinds.skill,
      title: inspected(inspect.kind, inspect.id),
      body: <InspectBody target={inspect} />,
      close: () => world$.setInspect(null),
    });

  // what is new on the table comes to the front (and, on a phone, brings the sheet up)
  const fresh = items.filter((i) => !(i.id in seen.turn));
  if (fresh.length) {
    setSeen({ order: [...seen.order, ...fresh.map((f) => f.id)], turn: { ...seen.turn, ...Object.fromEntries(fresh.map((f) => [f.id, active?.id ?? null])) } });
    setSelected(fresh.at(-1)!.id);
    if (!s.wide) setSheet(true);
  }
  const rank = (id: string) => {
    const at = seen.order.indexOf(id);
    return at < 0 ? Infinity : at;
  };
  items.sort((a, b) => rank(a.id) - rank(b.id));

  // what each turn showed, for its chips: rebuilt only when the table changes
  const shownKey = items.map((i) => [i.id, i.title, seen.turn[i.id] ?? ""].join("\u0001")).join("\u0002");
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

  // Escape puts away everything on the table, and his question
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const w = useWorldStore.getState();
      if (w.mapOpen || w.cvOpen || w.cardOpen || useInterview.getState().transcript) return;
      if (active) setHidden((h) => new Set([...h, ...active.cards.map((_, n) => `card:${active.id}:${n}`)]));
      if (w.sector || w.caseFile || w.brief) w.closeFocus();
      if (w.inspect) w.setInspect(null);
      if (w.prompt) w.ignore();
      setSheet(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

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

      <Table place={s.table} wide={s.wide} items={items} selected={selected} onSelect={setSelected} open={sheet} onDismiss={() => setSheet(false)} />
    </div>
  );
}
