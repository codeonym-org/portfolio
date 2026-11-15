"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useAgentContext } from "@copilotkit/react-core/v2";
import { CvModal } from "@/components/interface/inspect";
import { world } from "@/config/world.config";
import { preloadSounds } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";
import { AirInput } from "./air-input";
import { useInterview } from "./interview-store";
import { MicButton } from "./mic-button";
import { ReplySpace } from "./reply-space";
import { TopBar } from "./top-bar";
import { Transcript } from "./transcript";
import { followVoice } from "./voice-log";

const OfficeStage = dynamic(() => import("./office-stage"), { ssr: false });
const SystemLink = dynamic(() => import("@/components/agent/system-link"), { ssr: false });
const HoloMap = dynamic(() => import("@/components/interface/holo-map"), { ssr: false });

const copy = world.interview;

/** tells the replica where it is: no Monolith here, only its face and the windows around it */
function RoomContext() {
  const mode = useInterview((s) => s.mode);
  useAgentContext({
    description: "Where the stranger is",
    value: {
      page: "the interview (/interview): your avatar sits behind a desk in an office (a laptop and your papers on it), facing the stranger as in a real job interview. There is no Monolith and no shards here; everything you open or show appears as a floating window beside your face.",
      answering: mode === "audio" ? "by voice" : "by text",
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
 * Everything else is glass hanging in the air: a bar at the top (the
 * way out, the TEXT / AUDIO switch, the transcript), the input at the
 * bottom (a pane to type on, or a microphone to hold), every part of
 * a reply in its own window around his face, and the transcript drawn
 * as a graph. The same agent as the record answers, through the same
 * link.
 */
export function Interview() {
  const mode = useInterview((s) => s.mode);
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
    const unfollow = followVoice();
    return () => {
      unfollow();
      window.removeEventListener("pointerdown", preloadSounds);
      window.removeEventListener("keydown", preloadSounds);
    };
  }, []);

  return (
    <main className="interview-room relative h-dvh w-full overflow-hidden" aria-label={copy.title}>
      <OfficeStage />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgb(0_0_0/0.35)_100%)]" aria-hidden />
      <Arrival />
      <ReplySpace />
      <TopBar />
      <Transcript />
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
