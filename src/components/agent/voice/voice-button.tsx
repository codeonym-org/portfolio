"use client";

import type { PointerEvent } from "react";
import { Mic } from "lucide-react";
import { world } from "@/config/world.config";
import { cn } from "@/lib/utils";
import { useVoiceStore, voiceControl } from "./voice-store";

const copy = world.agent.voice;

/** the HUD chip: press and hold to talk (mouse, pen or touch) */
export function VoiceButton() {
  const available = useVoiceStore((s) => s.available);
  const phase = useVoiceStore((s) => s.phase);
  if (!available) return null;
  const listening = phase === "listening";
  const end = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    voiceControl.release();
  };
  return (
    <button
      type="button"
      aria-label={`${copy.hold} with the agent (hold ${copy.key})`}
      aria-pressed={listening}
      data-active={listening || phase === "speaking"}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        voiceControl.press();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          voiceControl.press();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") voiceControl.release();
      }}
      className={cn("hud-chip h-9 touch-none px-3 select-none", listening && "shadow-[0_0_18px_oklch(0.62_0.22_295/60%)]")}
    >
      <Mic className={cn("size-4", listening ? "text-violet-hot" : "text-system")} />
      <span className="kbd hidden sm:inline-grid">{copy.key}</span>
    </button>
  );
}
