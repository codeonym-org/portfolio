"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useVoiceStore, voiceLive, type VoicePhase } from "@/components/agent/voice/voice-store";
import { COLORS } from "@/components/scene/view";
import { live } from "@/store/world-store";

/**
 * ── THE PULSE ─────────────────────────────────────────────────
 * While the voice link is live the System has a heartbeat on screen:
 * a monitor line above the prompt, and the Monolith's heart beating
 * with it (`live.heart`, read by the scene). Listening follows the
 * visitor's microphone, thinking is a slow resting beat, speaking
 * follows the System's voice. Unmounted while the voice is idle, so
 * it costs nothing then.
 */

const HEIGHT = 64;
/** px the line travels per second */
const SPEED = 150;

type Beat = { hue: string; bpm: (level: number) => number; gain: (level: number) => number };
const BEATS: Record<Exclude<VoicePhase, "idle">, Beat> = {
  listening: { hue: COLORS.system, bpm: (l) => 64 + l * 46, gain: (l) => 0.45 + l * 0.8 },
  decoding: { hue: COLORS.arcaneHot, bpm: () => 52, gain: () => 0.62 },
  thinking: { hue: COLORS.arcaneHot, bpm: () => 52, gain: () => 0.62 },
  speaking: { hue: COLORS.gold, bpm: (l) => 76 + l * 54, gain: (l) => 0.45 + l * 0.8 },
};

const bump = (x: number, at: number, width: number) => Math.exp(-(((x - at) / width) ** 2));
/** one heartbeat, x in 0..1: the small P wave, the QRS spike, the T wave. Up is positive, peak 1. */
const beatShape = (x: number) =>
  0.11 * bump(x, 0.16, 0.035) - 0.14 * bump(x, 0.335, 0.012) + bump(x, 0.37, 0.013) - 0.26 * bump(x, 0.405, 0.014) + 0.24 * bump(x, 0.62, 0.055);

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const q = window.matchMedia(motionQuery);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

function Monitor({ phase }: { phase: Exclude<VoicePhase, "idle"> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const current = useRef(phase);
  useEffect(() => {
    current.current = phase;
  }, [phase]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    /** the trace: one value per CSS pixel, newest last */
    let trace: number[] = [];
    const fit = () => {
      width = Math.max(120, Math.round(el.clientWidth));
      el.width = width * dpr;
      el.height = HEIGHT * dpr;
      trace = Array.from({ length: width }, (_, i) => trace[trace.length - width + i] ?? 0);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    fit();

    let raf = 0;
    let last = performance.now();
    /** where we are inside the current beat, 0..1, and px owed to the trace */
    let beat = 0;
    let owed = 0;
    let shownBpm = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const b = BEATS[current.current];
      const level = Math.min(1, voiceLive.level);
      const bpm = b.bpm(level);
      const gain = b.gain(level);

      owed += dt * SPEED;
      const steps = Math.floor(owed);
      owed -= steps;
      for (let i = 0; i < steps; i++) {
        beat += bpm / 60 / SPEED;
        if (beat >= 1) beat -= 1;
        // the voice itself rides on the line as a fine tremor
        trace.push(beatShape(beat) * gain + (Math.random() - 0.5) * 0.05 * (0.3 + level * 2.5));
      }
      if (trace.length > width) trace.splice(0, trace.length - width);
      // the Monolith's heart: struck by the spike, fading until the next one
      const sinceSpike = (beat - 0.37 + 1) % 1;
      live.heart = Math.exp(-sinceSpike * 5.5) * Math.min(1, gain + 0.25);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, HEIGHT);
      const mid = HEIGHT * 0.62;
      const reach = HEIGHT * 0.56;
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = b.hue;
      ctx.shadowColor = b.hue;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let x = 0; x < trace.length; x++) {
        const y = mid - trace[x] * reach;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      // the pen
      const tip = mid - (trace[trace.length - 1] ?? 0) * reach;
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(width - 2, tip, 2.4, 0, Math.PI * 2);
      ctx.fill();
      // older ink fades out to the left
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "destination-in";
      const fade = ctx.createLinearGradient(0, 0, width, 0);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(0.55, "rgba(0,0,0,0.75)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, width, HEIGHT);
      ctx.globalCompositeOperation = "source-over";

      const rounded = Math.round(bpm);
      if (readout.current && rounded !== shownBpm) {
        shownBpm = rounded;
        readout.current.textContent = String(rounded);
        readout.current.parentElement!.style.color = b.hue;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      live.heart = 0;
    };
  }, []);

  return (
    <div className="pointer-events-none relative flex items-end gap-3" aria-hidden>
      <canvas ref={canvas} className="block min-w-0 flex-1" style={{ height: HEIGHT }} />
      <p className="mb-1 shrink-0 font-[family-name:var(--font-system)] text-[11px] leading-none font-bold tracking-[0.22em] uppercase">
        <span ref={readout} className="mr-1 text-2xl tracking-normal tabular-nums" />
        bpm
      </p>
    </div>
  );
}

export function VoicePulse() {
  const phase = useVoiceStore((s) => s.phase);
  const still = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
  if (phase === "idle") return null;
  // reduced motion: a steady glowing line in the state's colour, no beat
  if (still) return <div className="pointer-events-none my-4 h-px" style={{ background: BEATS[phase].hue, boxShadow: `0 0 14px 1px ${BEATS[phase].hue}` }} aria-hidden />;
  return <Monitor phase={phase} />;
}
