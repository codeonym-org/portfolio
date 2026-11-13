"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { erebus } from "@/config/erebus.config";
import { game, interact, startGame, stopGame } from "@/erebus/game";
import { useGame } from "@/erebus/game-store";
import { controls, isMoveKey, releaseAll, turnCamera, zoomCamera } from "@/erebus/input";
import { useProfile } from "@/erebus/profile-store";
import { preloadSounds, startMusic } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";
import { Hud } from "./hud";
import { ProfilePanel } from "./profile-panel";
import { World } from "./world";

/**
 * Erebus (rank B): the record as a world to fight through, piloted
 * by the System. This file is the gate's doorway: it loads what the
 * visitor kept, registers a new hunter, starts the game and listens
 * to the keyboard and the pointer.
 */

const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest("input, textarea");

/** a new hunter gives a name; what was earned on First Light comes along */
function Awakening() {
  const create = useProfile((s) => s.create);
  const xp = useWorldStore((s) => s.xp);
  const risen = useWorldStore((s) => s.risen);
  const [name, setName] = useState("");
  const clean = name.replace(/[^\p{L}\p{N} _.'-]/gu, "").trim().slice(0, 20);
  return (
    <main className="grain relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,oklch(0.45_0.2_25/0.35),transparent_60%)]" />
      <form
        className="sys-window relative w-[min(480px,100%)] p-6"
        style={{ ["--sys" as string]: "#ff5a3a" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (clean.length >= 2) create(clean, { xp, risen });
        }}
      >
        <span className="sys-scan" aria-hidden />
        <p className="eyebrow">{erebus.awakening.eyebrow}</p>
        <h1 className="mt-3 font-[family-name:var(--font-system)] text-3xl leading-tight font-semibold text-white">{erebus.awakening.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">{erebus.awakening.body}</p>
        {(xp > 0 || risen.length > 0) && <p className="mt-3 border border-system/40 bg-system/10 px-3 py-2 text-[13px] text-system">{erebus.awakening.carried(xp, risen.length)}</p>}
        <label className="mt-5 block font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase" htmlFor="hunter-name">
          {erebus.awakening.label}
        </label>
        <input
          id="hunter-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={erebus.awakening.placeholder}
          autoFocus
          autoComplete="off"
          maxLength={24}
          className="mt-2 w-full border border-white/20 bg-black/50 px-3 py-2.5 font-[family-name:var(--font-system)] text-xl text-white outline-none focus:border-arcane-hot"
        />
        <button type="submit" disabled={clean.length < 2} data-primary="true" className="sys-button mt-5 w-full px-4 py-3 font-display text-xs tracking-[0.3em] disabled:opacity-40">
          {erebus.awakening.submit}
        </button>
        <p className="mt-4 text-[12px] leading-snug text-muted-foreground">{erebus.awakening.note}</p>
        <Link href="/gates" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-white">
          <ArrowLeft className="size-3.5" /> The Gate Realm
        </Link>
      </form>
    </main>
  );
}

function useControls() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const ui = useGame.getState();
      if (e.code === "Escape") {
        if (ui.panel) ui.open(null);
        else if (ui.bargain) ui.answer(false);
        return;
      }
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (ui.bargain && (e.code === "KeyY" || e.code === "KeyN")) return ui.answer(e.code === "KeyY");
      if (e.code === "KeyC") return ui.open(ui.panel === "profile" ? null : "profile");
      if (e.code === "KeyM") return useWorldStore.getState().toggleMuted();
      if (ui.panel) return;
      if (isMoveKey(e.code) || e.code === "Space") e.preventDefault();
      if (e.repeat) return;
      controls.keys.add(e.code);
      if (e.code === "Space" || e.code === "KeyJ") controls.attack = controls.holding = true;
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyK") controls.dash = true;
      else if (e.code === "KeyR" || e.code === "KeyL") controls.burst = true;
      else if (e.code === "KeyE") interact("interact");
      else if (e.code === "KeyF") interact("arise");
    };
    const up = (e: KeyboardEvent) => {
      controls.keys.delete(e.code);
      if (e.code === "Space" || e.code === "KeyJ") controls.holding = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, []);
}

/** the pointer on the world: drag to turn the camera, a click that did not drag is a strike */
function Stage() {
  const touch = useWorldStore((s) => s.touch);
  const drag = useRef({ id: -1, x: 0, y: 0, moved: 0 });
  return (
    <div
      className="fixed inset-0 touch-none bg-[#06040a]"
      onPointerDown={(e) => {
        const d = drag.current;
        if (d.id !== -1) return;
        Object.assign(d, { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 });
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        d.moved += Math.abs(dx) + Math.abs(dy);
        Object.assign(d, { x: e.clientX, y: e.clientY });
        if (d.moved > 6) turnCamera(dx, dy);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (d.id !== e.pointerId) return;
        d.id = -1;
        if (d.moved <= 6 && !touch) controls.attack = true;
      }}
      onPointerCancel={() => {
        drag.current.id = -1;
      }}
      onWheel={(e) => zoomCamera(e.deltaY)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <World />
    </div>
  );
}

export default function ErebusGate() {
  const [loaded, setLoaded] = useState(false);
  const name = useProfile((s) => s.name);
  const panel = useGame((s) => s.panel);
  const setTouch = useWorldStore((s) => s.setTouch);
  const [running, setRunning] = useState(false);
  useControls();

  useEffect(() => {
    void Promise.all([useProfile.persist.rehydrate(), useWorldStore.persist.rehydrate()]).then(() => setLoaded(true));
    const mq = window.matchMedia("(pointer: coarse), (max-width: 820px)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const wake = () => {
      preloadSounds();
      startMusic();
    };
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [setTouch]);

  useEffect(() => {
    if (!loaded || !name) return;
    startGame();
    // a hunter who has never played is shown the keys first
    if (useProfile.getState().seconds < 30) useGame.getState().open("help");
    const started = window.setTimeout(() => setRunning(true), 0);
    return () => {
      window.clearTimeout(started);
      stopGame();
      setRunning(false);
    };
  }, [loaded, name]);

  if (!loaded) return <main className="grid h-dvh place-items-center bg-[#06040a] font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">Erebus is waking…</main>;
  if (!name) return <Awakening />;
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {running && game.sim && <Stage />}
      <Hud />
      {panel === "profile" && <ProfilePanel />}
    </main>
  );
}
