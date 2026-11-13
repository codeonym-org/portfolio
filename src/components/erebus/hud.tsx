"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CircleHelp, UserRound, Volume2, VolumeX } from "lucide-react";
import { RankBadge } from "@/components/gates/rank-badge";
import { toneColor } from "@/components/scene/view";
import { erebus } from "@/config/erebus.config";
import { interact, projectById } from "@/erebus/game";
import { useGame, type Notice } from "@/erebus/game-store";
import { controls } from "@/erebus/input";
import { useProfile } from "@/erebus/profile-store";
import { hunterRank, levelOf, type HunterRank } from "@/erebus/rules";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";

/**
 * Everything on screen that is not the world: who the hunter is, what
 * the System is saying and asking, the quest, the twist, the Warden's
 * health, the keys, and on a touch screen the stick and the buttons.
 */

/** the gate ranks have no D or E: a hunter below C wears the plain badge */
const badgeRank = (r: HunterRank) => (r === "E" || r === "D" ? "C" : r);

function Bar({ value, className, track }: { value: number; className: string; track?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden bg-white/10", track)}>
      <div className={cn("h-full transition-[width] duration-200", className)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

function Identity() {
  const name = useProfile((s) => s.name);
  const title = useProfile((s) => s.title);
  const xp = useProfile((s) => s.xp);
  const points = useProfile((s) => s.points);
  const hp = useGame((s) => s.hud.hp);
  const maxHp = useGame((s) => s.hud.maxHp);
  const open = useGame((s) => s.open);
  const { level, into, need } = levelOf(xp);
  const rank = hunterRank(level);
  return (
    <button type="button" onClick={() => open("profile")} className="pointer-events-auto flex w-[min(300px,62vw)] items-center gap-3 border border-white/10 bg-black/55 p-2.5 text-left backdrop-blur-sm" aria-label="Open your profile">
      <span className="relative shrink-0">
        <RankBadge rank={badgeRank(rank)} className="size-11 text-base" />
        <span className="absolute inset-0 grid place-items-center font-display text-base">{rank === "E" || rank === "D" ? <span className="bg-black px-0.5 text-white">{rank}</span> : null}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-[family-name:var(--font-system)] text-lg leading-none font-semibold text-white">{name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">LV.{level}</span>
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] tracking-[0.12em] text-arcane-hot uppercase">{title ?? "No title yet"}</span>
        <span className="mt-1.5 flex items-center gap-2">
          <Bar value={hp / maxHp} className={hp / maxHp < 0.3 ? "bg-red-500" : "bg-emerald-400"} />
          <span className="w-14 shrink-0 text-right font-mono text-[10px] text-foreground/80">
            {hp}/{maxHp}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <Bar value={into / need} className="bg-system" track="h-1" />
          <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{points ? `+${points} pts` : `${into}/${need}`}</span>
        </span>
      </span>
    </button>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  const dismiss = useGame((s) => s.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(notice.id), 5200);
    return () => window.clearTimeout(timer);
  }, [notice.id, dismiss]);
  return (
    <motion.li layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="pointer-events-auto w-[min(300px,62vw)] cursor-pointer" onClick={() => dismiss(notice.id)}>
      <div className="sys-window overflow-hidden px-3 py-2" style={{ ["--sys" as string]: toneColor[notice.tone] }}>
        <p className="sys-head text-[10px]">{notice.heading}</p>
        <p className="mt-1 text-[13px] leading-snug">{notice.body}</p>
      </div>
    </motion.li>
  );
}

/** what the System says: large, at the top, gone after a few seconds */
function SystemLine() {
  const line = useGame((s) => s.line);
  const thinking = useGame((s) => s.thinking);
  const [shown, setShown] = useState<typeof line>(null);
  useEffect(() => {
    if (!line) return;
    const show = window.setTimeout(() => setShown(line), 0);
    const hide = window.setTimeout(() => setShown(null), 4200 + line.text.length * 55);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [line]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[13dvh] z-30 flex justify-center px-4" aria-live="polite">
      <AnimatePresence mode="wait">
        {shown ? (
          <motion.p key={shown.at} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="oracle oracle--aside max-w-[min(760px,92vw)] text-center">
            <span className="mb-1 block font-mono text-[10px] tracking-[0.3em] text-system uppercase">The System{shown.mind === "model" ? " · live" : ""}</span>
            {shown.text}
          </motion.p>
        ) : thinking ? (
          <motion.p key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[10px] tracking-[0.3em] text-system uppercase">
            The System is deciding…
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Tracker() {
  const quest = useGame((s) => s.hud.quest);
  const twist = useGame((s) => s.hud.twist);
  const buffs = useGame((s) => s.hud.buffs);
  const live = [buffs.might > 0 && `MIGHT ${Math.ceil(buffs.might)}s`, buffs.haste > 0 && `HASTE ${Math.ceil(buffs.haste)}s`, buffs.ward > 0 && `WARD ×${buffs.ward}`].filter(Boolean);
  return (
    <div className="pointer-events-none fixed top-16 right-3 z-30 flex w-[min(240px,44vw)] flex-col gap-2 sm:right-4">
      {quest && (
        <div className="border border-system/40 bg-black/55 p-2.5 backdrop-blur-sm">
          <p className="font-mono text-[9px] tracking-[0.26em] text-system uppercase">Quest{quest.left ? ` · ${quest.left}s` : ""}</p>
          <p className="mt-1 font-[family-name:var(--font-system)] text-base leading-tight font-semibold text-white">{quest.title}</p>
          <p className="mt-0.5 text-[12px] text-foreground/80">{quest.text}</p>
          <Bar value={quest.progress} className="bg-system" track="mt-2 h-1" />
        </div>
      )}
      {twist && (
        <div className="border border-ember/50 bg-black/55 p-2.5 backdrop-blur-sm" style={{ borderColor: "color-mix(in oklch, var(--arcane-hot) 60%, transparent)" }}>
          <p className="font-mono text-[9px] tracking-[0.26em] text-arcane-hot uppercase">{erebus.twists[twist.kind].name} · {Math.ceil(twist.left)}s</p>
          <p className="mt-1 text-[12px] leading-snug text-foreground/80">{erebus.twists[twist.kind].body}</p>
          <Bar value={twist.left / twist.total} className="bg-arcane-hot" track="mt-2 h-1" />
        </div>
      )}
      {live.length > 0 && <p className="text-right font-mono text-[10px] tracking-[0.14em] text-gold">{live.join(" · ")}</p>}
    </div>
  );
}

function WardenBar() {
  const warden = useGame((s) => s.hud.warden);
  if (!warden) return null;
  const p = projectById(warden.project);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-[min(520px,86vw)] text-center">
      <p className="font-mono text-[10px] tracking-[0.26em] text-red-300 uppercase">Warden of {p?.name ?? warden.project} · rank {p?.rank}</p>
      <Bar value={warden.hp} className="bg-red-500" track="mt-1.5 h-2 border border-red-500/40 bg-black/60" />
    </div>
  );
}

function Slot({ label, keys, cd, locked, onPress }: { label: string; keys: string; cd: number; locked?: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={cn("pointer-events-auto relative grid size-14 place-items-center overflow-hidden border bg-black/60 text-center backdrop-blur-sm select-none", locked ? "border-white/10 text-white/30" : cd > 0 ? "border-white/20 text-white/60" : "border-arcane-hot/70 text-white")}
      aria-label={label}
    >
      <span className="absolute inset-x-0 bottom-0 bg-white/15" style={{ height: `${Math.min(1, cd) * 100}%` }} aria-hidden />
      <span className="relative">
        <span className="block font-mono text-[9px] tracking-[0.14em] uppercase">{label}</span>
        <span className="block font-mono text-[9px] text-muted-foreground">{locked ? "LV.3" : keys}</span>
      </span>
    </button>
  );
}

function ActionBar({ touch }: { touch: boolean }) {
  const near = useGame((s) => s.hud.near);
  const cd = useGame((s) => s.hud.cd);
  const xp = useProfile((s) => s.xp);
  const p = near ? projectById(near.project) : null;
  const hint = !near || !p ? null : near.action === "raid" ? erebus.hints.raid(p.name, p.rank) : near.action === "arise" ? erebus.hints.arise : erebus.hints.read(p.name);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-3 px-3">
      {hint && near && (
        <button
          type="button"
          onClick={() => interact(near.action === "arise" ? "arise" : "interact")}
          className={cn("pointer-events-auto flex items-center gap-2 border bg-black/70 px-4 py-2 backdrop-blur-sm", near.action === "arise" ? "animate-pulse border-system text-system" : "border-arcane-hot/60 text-white")}
        >
          <span className="kbd">{near.action === "arise" ? "F" : "E"}</span>
          <span className={cn("font-[family-name:var(--font-system)] font-semibold", near.action === "arise" ? "text-2xl tracking-[0.3em]" : "text-base")}>{hint}</span>
        </button>
      )}
      {!touch && (
        <div className="flex gap-2">
          <Slot label="Strike" keys="J · click" cd={0} onPress={() => (controls.attack = true)} />
          <Slot label="Dash" keys="Shift" cd={cd.dash} onPress={() => (controls.dash = true)} />
          <Slot label="Burst" keys="R" cd={cd.burst} locked={levelOf(xp).level < 3} onPress={() => (controls.burst = true)} />
        </div>
      )}
    </div>
  );
}

/** a stick under the left thumb, three buttons under the right */
function TouchPad() {
  const cd = useGame((s) => s.hud.cd);
  const xp = useProfile((s) => s.xp);
  const knob = useRef<HTMLSpanElement>(null);
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const move = (e: React.PointerEvent) => {
    const o = origin.current;
    if (!o || o.id !== e.pointerId) return;
    const dx = e.clientX - o.x;
    const dy = e.clientY - o.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / 44);
    controls.stick.x = (dx / len) * k;
    controls.stick.y = (-dy / len) * k;
    if (knob.current) knob.current.style.transform = `translate(${(dx / len) * k * 34}px, ${(dy / len) * k * 34}px)`;
  };
  const end = (e: React.PointerEvent) => {
    if (origin.current?.id !== e.pointerId) return;
    origin.current = null;
    controls.stick.x = controls.stick.y = 0;
    if (knob.current) knob.current.style.transform = "";
  };
  return (
    <>
      <div
        className="pointer-events-auto fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-5 z-30 grid size-28 touch-none place-items-center rounded-full border border-white/20 bg-black/35 select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const box = e.currentTarget.getBoundingClientRect();
          origin.current = { id: e.pointerId, x: box.left + box.width / 2, y: box.top + box.height / 2 };
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Move"
      >
        <span ref={knob} className="size-11 rounded-full border border-arcane-hot/70 bg-arcane/30" />
      </div>
      <div className="fixed right-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 flex items-end gap-2">
        <div className="flex flex-col gap-2">
          <Slot label="Burst" keys="" cd={cd.burst} locked={levelOf(xp).level < 3} onPress={() => (controls.burst = true)} />
          <Slot label="Dash" keys="" cd={cd.dash} onPress={() => (controls.dash = true)} />
        </div>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            controls.attack = true;
            controls.holding = true;
          }}
          onPointerUp={() => (controls.holding = false)}
          onPointerCancel={() => (controls.holding = false)}
          onPointerLeave={() => (controls.holding = false)}
          className="pointer-events-auto grid size-20 touch-none place-items-center rounded-full border border-arcane-hot/80 bg-arcane/25 font-mono text-[11px] tracking-[0.16em] text-white uppercase select-none"
        >
          Strike
        </button>
      </div>
    </>
  );
}

function BargainWindow() {
  const bargain = useGame((s) => s.bargain);
  const answer = useGame((s) => s.answer);
  // a bargain is not on the table for ever
  useEffect(() => {
    if (!bargain) return;
    const timer = window.setTimeout(() => answer(false), 14_000);
    return () => window.clearTimeout(timer);
  }, [bargain, answer]);
  const reply = (accepted: boolean) => {
    play(accepted ? "confirm" : "close", { volume: 0.5 });
    answer(accepted);
  };
  return (
    <AnimatePresence>
      {bargain && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="pointer-events-none fixed inset-x-0 top-[26dvh] z-40 flex justify-center px-4">
          <div role="dialog" aria-labelledby="bargain-heading" className="sys-window pointer-events-auto w-[min(440px,100%)] overflow-hidden" style={{ ["--sys" as string]: toneColor.gold }}>
            <span className="sys-scan" aria-hidden />
            <div className="border-b border-[color-mix(in_oklch,var(--sys)_30%,transparent)] px-5 py-3">
              <p id="bargain-heading" className="sys-head text-xs">
                {bargain.heading}
              </p>
            </div>
            <p className="px-5 pt-4 text-center text-[19px] leading-snug font-medium text-balance">{bargain.body}</p>
            <p className="px-5 pt-2 text-center font-mono text-[11px] text-muted-foreground">{bargain.detail}</p>
            <div className="flex gap-3 px-5 pt-4 pb-4">
              <button type="button" data-primary="true" onClick={() => reply(true)} className="sys-button flex-1 px-4 py-2.5 text-sm">
                {erebus.accept} <span className="kbd ml-1">Y</span>
              </button>
              <button type="button" onClick={() => reply(false)} className="sys-button flex-1 px-4 py-2.5 text-sm">
                {erebus.decline} <span className="kbd ml-1">N</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Controls({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="sys-window w-[min(420px,100%)] p-5" style={{ ["--sys" as string]: toneColor.system }} onClick={(e) => e.stopPropagation()}>
        <p className="sys-head text-xs">HOW TO SURVIVE</p>
        <ul className="mt-4 space-y-2">
          {erebus.controls.map(([keys, what]) => (
            <li key={keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="font-mono text-[11px] text-system">{keys}</span>
              <span className="text-right text-foreground/85">{what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-snug text-muted-foreground">Walk to an obelisk and challenge its Warden. Beat it and say ARISE: the project it guarded follows you, and you can read what it is. The System decides everything else, and it changes its mind.</p>
        <p className="mt-3 text-[10px] leading-snug text-muted-foreground/70">{erebus.credits}</p>
        <button type="button" onClick={onClose} data-primary="true" className="sys-button mt-5 w-full px-4 py-2.5 text-sm">
          Enter
        </button>
      </div>
    </div>
  );
}

export function Hud() {
  const notices = useGame((s) => s.notices);
  const dead = useGame((s) => s.hud.dead);
  const panel = useGame((s) => s.panel);
  const open = useGame((s) => s.open);
  const muted = useWorldStore((s) => s.muted);
  const toggleMuted = useWorldStore((s) => s.toggleMuted);
  const touch = useWorldStore((s) => s.touch);
  const hurt = useGame((s) => s.hud.hp / s.hud.maxHp < 0.3 && !s.hud.dead);

  return (
    <>
      <div className={cn("pointer-events-none fixed inset-0 z-20 transition-opacity duration-500", hurt ? "opacity-100" : "opacity-0")} style={{ boxShadow: "inset 0 0 160px 30px oklch(0.5 0.22 25 / 55%)" }} aria-hidden />
      <div className="pointer-events-none fixed top-3 left-3 z-30 flex flex-col gap-2 sm:top-4 sm:left-4">
        <Identity />
        <ol className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {notices.map((n) => (
              <NoticeCard key={n.id} notice={n} />
            ))}
          </AnimatePresence>
        </ol>
      </div>
      <div className="pointer-events-auto fixed top-3 right-3 z-30 flex gap-1.5 sm:top-4 sm:right-4">
        <Link href="/gates" className="hud-chip h-9 px-3 text-xs" aria-label="Back to the Gate Realm">
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Gate Realm</span>
        </Link>
        <button type="button" onClick={() => open("profile")} className="hud-chip size-9" aria-label="Your profile">
          <UserRound className="size-4" />
        </button>
        <button type="button" onClick={() => open("help")} className="hud-chip size-9" aria-label="Controls">
          <CircleHelp className="size-4" />
        </button>
        <button type="button" onClick={toggleMuted} className="hud-chip size-9" aria-label={muted ? "Turn the sound on" : "Turn the sound off"}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
      <SystemLine />
      <Tracker />
      <WardenBar />
      <ActionBar touch={touch} />
      {touch && <TouchPad />}
      <BargainWindow />
      <AnimatePresence>
        {dead && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-[radial-gradient(ellipse_at_center,oklch(0.3_0.15_25/0.35),oklch(0.05_0.02_290/0.85))]">
            <div className="text-center">
              <p className="font-display text-4xl tracking-[0.3em] text-red-400 sm:text-6xl">{erebus.dead.title}</p>
              <p className="mt-4 font-mono text-xs tracking-[0.24em] text-foreground/70 uppercase">{erebus.dead.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {panel === "help" && <Controls onClose={() => open(null)} />}
    </>
  );
}
