"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AgentDevBridge } from "@/agent/dev-bridge";
import { castEffect } from "@/agent/system-commands";
import { sectors } from "@/config/world.config";
import { chime, duckMusic, play, preloadSounds, startMusic } from "@/lib/audio";
import { toggleImmersion } from "@/lib/immersion";
import { decodeCase, resolveCase } from "@/record/case-file";
import { hasNode } from "@/record/nodes";
import { live, useWorldStore } from "@/store/world-store";
import { Boot } from "./boot";
import { Console } from "./console";
import { IndexWheel } from "./index-wheel";
import { CvModal, InspectCard } from "./inspect";
import { Palette } from "./palette";
import { SystemDialog } from "./system-dialog";
import { Toasts } from "./toasts";
import { TopBar } from "./top-bar";
import { Trace } from "./trace";
import { FocusWindow } from "./window";

// the chat stack is the heaviest import on the page — it loads once the scene is up
const HoloMap = dynamic(() => import("./holo-map"), { ssr: false });
const SystemLink = dynamic(() => import("@/components/agent/system-link"), { ssr: false });

const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable=true]");

/** sound follows what the store does, so every driver (visitor, palette, agent) sounds the same */
function useWorldSounds() {
  useEffect(
    () =>
      useWorldStore.subscribe((s, prev) => {
        if (s.rising && !prev.rising) {
          play("portal", { volume: 0.5 });
          live.aberration = Math.min(2, live.aberration + 0.6);
        }
        if (!s.rising && prev.rising && s.risen.length > prev.risen.length) {
          duckMusic();
          play("arise");
          castEffect("awaken");
        }
        if (s.toasts.length > prev.toasts.length) chime(0.3);
        if (s.prompt && s.prompt !== prev.prompt) play("system");
        if (s.inspect && !prev.inspect) play("open", { volume: 0.4 });
        if (s.completed.length > prev.completed.length) play("levelup", { volume: 0.5 });
      }),
    [],
  );
}

/**
 * Everything that is not the 3D scene: the console, the trace, the
 * windows — and the wiring that belongs to no single one of them
 * (hydration, keys, the first gesture that starts the sound, a case
 * shared in the URL).
 */
export function Shell() {
  const ready = useWorldStore((s) => s.ready);
  const mapOpen = useWorldStore((s) => s.mapOpen);
  const setTouch = useWorldStore((s) => s.setTouch);
  useWorldSounds();

  useEffect(() => {
    void useWorldStore.persist.rehydrate();
    const mq = window.matchMedia("(pointer: coarse), (max-width: 820px)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [setTouch]);

  // browsers only allow sound after a gesture: the first one anywhere starts it
  useEffect(() => {
    const wake = () => {
      preloadSounds();
      startMusic();
    };
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  // a case shared as a link opens as soon as the scene is up — no model involved
  useEffect(() => {
    if (!ready) return;
    const open = () => {
      const shared = decodeCase(window.location.hash);
      if (!shared) return;
      const { file } = resolveCase(shared, hasNode);
      if (file.evidence.length) useWorldStore.getState().setCase(file);
    };
    const timer = window.setTimeout(open, 1800);
    window.addEventListener("hashchange", open);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", open);
    };
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useWorldStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setPaletteOpen(!s.paletteOpen);
        return;
      }
      if (e.key === "Escape") {
        if (s.mapOpen) s.setMapOpen(false);
        else if (s.prompt) s.answer(false);
        else if (s.paletteOpen) s.setPaletteOpen(false);
        else if (s.cvOpen) s.setCvOpen(false);
        else if (s.inspect) s.setInspect(null);
        else if (s.sector || s.caseFile || s.brief) s.closeFocus();
        return;
      }
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || s.paletteOpen || s.mapOpen) return;
      if (s.prompt && (e.key.toLowerCase() === "y" || e.key.toLowerCase() === "n")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("system:answer", { detail: e.key.toLowerCase() === "y" }));
        return;
      }
      const index = Number(e.key) - 1;
      if (Number.isInteger(index) && sectors[index]) {
        s.openSector(sectors[index].id);
      } else if (e.key === "/" || e.key.toLowerCase() === "t") {
        e.preventDefault();
        window.dispatchEvent(new Event("system:focus-prompt"));
      } else if (e.key.toLowerCase() === "f") {
        void toggleImmersion();
      } else if (e.key.toLowerCase() === "m") {
        s.toggleMuted();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AgentDevBridge />
      <div className="scrim z-10" aria-hidden />
      <TopBar />
      <Trace />
      <IndexWheel />
      <Console />
      <FocusWindow />
      <Toasts />
      <SystemDialog />
      <InspectCard />
      <CvModal />
      <Palette />
      {mapOpen && <HoloMap />}
      <Boot />
      {ready && <SystemLink />}
    </>
  );
}
