"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useAgentContext } from "@copilotkit/react-core/v2";
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
import { followTurns } from "./use-turns";
import { followVoice } from "./voice-log";

const OfficeStage = dynamic(() => import("./office-stage"), { ssr: false });
const SystemLink = dynamic(() => import("@/components/agent/system-link"), { ssr: false });
const HoloMap = dynamic(() => import("@/components/interface/holo-map"), { ssr: false });

const copy = world.interview;

/** tells the replica where it is and what the stranger sees: no Monolith here, his face, the conversation and the table */
function RoomContext() {
  const mode = useInterview((s) => s.mode);
  const replies = useInterview((s) => s.replies);
  const sector = useWorldStore((s) => s.sector);
  const caseFile = useWorldStore((s) => s.caseFile);
  const brief = useWorldStore((s) => s.brief);
  const inspect = useWorldStore((s) => s.inspect);
  const onTable = [sector && `the ${sector} section`, caseFile && `the case file "${caseFile.title}"`, brief && "the one-minute brief", inspect && `the ${inspect.kind === "quest" ? "project" : inspect.kind} ${inspect.id}`].filter(Boolean);
  useAgentContext({
    description: "Where the stranger is",
    value: {
      page: "the interview (/interview): your avatar sits behind a desk in an office (a laptop and your papers on it), facing the stranger as in a real job interview. There is no Monolith and no shards here.",
      screen:
        "The conversation is a panel on your left: every question, the steps you take for it (each tool call, in plain words), and your answer as you write it; the stranger can scroll back through it, so do not repeat what you already said. Everything you open or show lands on the table, a panel on your right, one thing at a time behind tabs, the newest in front: open what helps the answer, and say in a few words what you put there rather than describing it all. On a phone the table is a sheet that slides up over the conversation.",
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
    // a conversation left in progress comes back: say so
    const { conversations, current } = useHistory.getState();
    const resumed = conversations.find((c) => c.id === current);
    if (resumed) useSession.getState().set({ notice: copy.diary.resumed(new Date(resumed.updatedAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })) });
    return () => {
      unfollowVoice();
      unfollowTurns();
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
        </SystemLink>
      )}
    </main>
  );
}
