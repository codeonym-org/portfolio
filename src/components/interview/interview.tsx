"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useAgentContext } from "@copilotkit/react-core/v2";
import { CvModal } from "@/components/interface/inspect";
import { world } from "@/config/world.config";
import { preloadSounds } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";
import { DiscoButton } from "./disco-button";
import { useInterview } from "./interview-store";
import { ModeDrop } from "./mode-drop";
import { ReplySpace } from "./reply-space";
import { TextDock } from "./text-dock";

const AvatarStage = dynamic(() => import("./avatar-stage"), { ssr: false });
const SystemLink = dynamic(() => import("@/components/agent/system-link"), { ssr: false });
const HoloMap = dynamic(() => import("@/components/interface/holo-map"), { ssr: false });

const copy = world.interview;

/** tells the replica where it is: no Monolith here, only its face and the windows around it */
function RoomContext() {
  const mode = useInterview((s) => s.mode);
  useAgentContext({
    description: "Where the stranger is",
    value: {
      page: "the interview (/interview): your avatar, alone in an empty room, face to face with the stranger. There is no Monolith and no shards here; everything you open or show appears as a floating window beside your face.",
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
 * The owner's avatar alone in an empty room. No menu: the TEXT /
 * AUDIO switch drips down from the top when the pointer comes near,
 * the input (a floating field, or the disco button to hold) waits at
 * the bottom, and every part of a reply floats in its own window
 * around his face. The same agent as the record answers, through the
 * same link.
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
    return () => {
      window.removeEventListener("pointerdown", preloadSounds);
      window.removeEventListener("keydown", preloadSounds);
    };
  }, []);

  return (
    <main className="interview-room relative h-dvh w-full overflow-hidden" aria-label={copy.title}>
      <AvatarStage />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.55)_100%)]" aria-hidden />
      <Arrival />
      <ReplySpace />
      <ModeDrop />
      <AnimatePresence mode="wait">{mode === "text" ? <TextDock key="text" /> : <DiscoButton key="audio" />}</AnimatePresence>
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
