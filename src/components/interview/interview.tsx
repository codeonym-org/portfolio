"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { z } from "zod";
import { useAgentContext, useFrontendTool } from "@copilotkit/react-core/v2";
import { useVoiceStore, voiceControl } from "@/components/agent/voice/voice-store";
import { CvModal } from "@/components/interface/inspect";
import { world } from "@/config/world.config";
import { preloadSounds } from "@/lib/audio";
import { useHistory } from "@/store/history-store";
import { useSession } from "@/store/session-store";
import { useWorldStore } from "@/store/world-store";
import { AirInput } from "./air-input";
import { BusinessCard } from "./business-card";
import { DiaryBook } from "./diary-book";
import { useInterview } from "./interview-store";
import { MicButton } from "./mic-button";
import { TopBar } from "./top-bar";
import { TurnCanvas, useStage } from "./turn-canvas";
import { AgentDevBridge } from "@/agent/dev-bridge";
import { followTable, useTable } from "./table-store";
import { downloadTranscript } from "./transcript-download";
import { followTurns } from "./use-turns";
import { followVoice } from "./voice-log";

const OfficeStage = dynamic(() => import("./office-stage"), { ssr: false });
const SystemLink = dynamic(() => import("@/components/agent/system-link"), { ssr: false });
const HoloMap = dynamic(() => import("@/components/interface/holo-map"), { ssr: false });

const copy = world.interview;

/** tells the agent where it is and what the stranger sees: no Monolith here, his face, the conversation and the table */
function RoomContext() {
  const mode = useInterview((s) => s.mode);
  const replies = useInterview((s) => s.replies);
  const laid = useTable((s) => s.laid);
  const trails = useTable((s) => s.trails);
  // oldest first, as the stranger sees them on the rail; with what the stranger opened from each, in place
  const onTable = laid.map((l) => {
    const what =
      l.kind === "sector" ? `the ${l.sector} section` : l.kind === "case" ? `the case file "${l.file.title}"` : l.kind === "brief" ? "the one-minute brief" : l.kind === "github" ? "your live GitHub activity" : `the ${l.target.kind === "quest" ? "project" : l.target.kind} ${l.target.id}`;
    const trail = trails[l.id] ?? [];
    return trail.length ? `${what}, where the stranger then opened ${trail.map((t) => `${t.kind === "quest" ? "project" : t.kind} ${t.id}`).join(" → ")} (now in front)` : what;
  });
  useAgentContext({
    description: "Where the stranger is",
    value: {
      page: "the interview (/interview): your avatar sits behind a desk in an office (a laptop and your papers on it), facing the stranger as in a real job interview. There is no Monolith and no shards here.",
      screen:
        "The conversation is a panel on your left: every question, the steps you take for it (each tool call, in plain words), and your answer as you write it; the stranger can scroll back through it, so do not repeat what you already said. Everything you open or show lands on the table, a panel on your right, and stays there for the rest of the conversation: the newest in front, the others on a rail beside it by the question that brought them, so opening several things in one answer is fine (they all stay). Open what helps the answer, never reopen what is already on the table, and say in a few words what you put there rather than describing it all. On a phone the table is a sheet that slides up over the conversation.",
      onTheTable: onTable.length ? onTable : "nothing",
      answering: mode === "audio" ? "by voice" : "by text",
      yourReplies:
        replies === "voice"
          ? "spoken aloud by a synthesized voice, and shown as text: write plain sentences a voice can say (no lists, no markdown, no links)"
          : "shown as text only",
    },
  });
  return null;
}

/** the interview room's own tool: the stranger takes the conversation away as a PDF */
function TranscriptTool() {
  useFrontendTool({
    name: "download_transcript",
    description:
      "Download the transcript of this interview for the stranger: a designed PDF with every question so far, numbered and timed, my answers, what I showed and how to reach me. Use when the stranger asks for the transcript, a copy, a record or a summary file of this conversation, or to download or keep it. It saves the file in their browser at once; then say so in one short line.",
    parameters: z.object({}),
    handler: async () => downloadTranscript(),
  });
  return null;
}

function Arrival() {
  const present = useInterview((s) => s.present);
  return (
    <AnimatePresence>
      {!present && (
        <motion.p
          className="fixed inset-x-0 top-[42%] z-10 text-center font-mono text-[10px] tracking-[0.4em] text-white/45 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 0.8, 0.25], transition: { repeat: Infinity, duration: 2.4 } }}
          exit={{ opacity: 0 }}
        >
          {copy.loading}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * ── THE INTERVIEW ─────────────────────────────────────────────
 * The owner's avatar at a desk in an office, facing the stranger.
 * He answers aloud (his words shown too) unless the stranger sets his
 * replies to text only, and only when the tab may play sound.
 * Everything else is glass hanging in the air: a bar at the top (the
 * way out, how he answers, the TEXT / AUDIO switch, the transcript), the input at the
 * bottom (a pane to type on, or a microphone to hold), the conversation
 * in a panel on his left and what he shows on a table on his right
 * (`turn-canvas`, placed by `stage.ts`), and the transcript: an old leather book of
 * diaries, one for each conversation kept in this browser, written by
 * hand, whose pages turn (`diary-book.tsx`). The same agent
 * as the record answers, through the same link. A conversation left
 * in progress is resumed.
 */
export function Interview() {
  const mode = useInterview((s) => s.mode);
  const stage = useStage(mode);
  const ready = useWorldStore((s) => s.ready);
  const mapOpen = useWorldStore((s) => s.mapOpen);

  useEffect(() => {
    // the interview has its own thread, kept; the home page's waits for the stranger's return
    useHistory.getState().enter("interview");
    useInterview.getState().restore();
    void useWorldStore.persist.rehydrate();
    const mq = window.matchMedia("(pointer: coarse), (max-width: 820px)");
    useWorldStore.getState().setTouch(mq.matches);
    // sound needs a gesture; no music in an interview
    window.addEventListener("pointerdown", preloadSounds, { once: true });
    window.addEventListener("keydown", preloadSounds, { once: true });
    // he answers aloud unless the stranger chose text only; any press or key lets the tab play his voice
    const speak = (replies: string) => useVoiceStore.getState().set({ spoken: replies === "voice", speakTyped: true });
    speak(useInterview.getState().replies);
    const stopReplies = useInterview.subscribe((s, prev) => {
      if (s.replies === prev.replies) return;
      speak(s.replies);
      if (s.replies === "text") voiceControl.hush();
    });
    const unlock = () => voiceControl.unlock();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    const unfollowVoice = followVoice();
    const unfollowTurns = followTurns();
    const unfollowTable = followTable();
    // a conversation left in progress comes back: say so
    const { conversations, current } = useHistory.getState();
    const resumed = conversations.find((c) => c.id === current);
    if (resumed) useSession.getState().set({ notice: copy.diary.resumed(new Date(resumed.updatedAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })) });
    return () => {
      useHistory.getState().enter("home");
      unfollowVoice();
      unfollowTurns();
      unfollowTable();
      stopReplies();
      useVoiceStore.getState().set({ spoken: true, speakTyped: false });
      voiceControl.hush();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("pointerdown", preloadSounds);
      window.removeEventListener("keydown", preloadSounds);
    };
  }, []);

  return (
    <main
      className="interview-room relative h-dvh w-full overflow-hidden"
      aria-label={copy.title}
      style={stage ? { ["--dock-x" as string]: `${stage.dock.x}px`, ["--dock-w" as string]: `${stage.dock.w}px` } : undefined}
    >
      <OfficeStage />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgb(0_0_0/0.35)_100%)]" aria-hidden />
      <Arrival />
      {stage && <TurnCanvas stage={stage} />}
      <TopBar />
      <DiaryBook />
      <BusinessCard />
      <AnimatePresence mode="wait">{mode === "text" ? <AirInput key="text" /> : <MicButton key="audio" />}</AnimatePresence>
      <CvModal />
      {mapOpen && <HoloMap />}
      {ready && (
        <SystemLink>
          <RoomContext />
          <TranscriptTool />
          {/* the same console bench as on the home page: window.system */}
          <AgentDevBridge />
        </SystemLink>
      )}
    </main>
  );
}
