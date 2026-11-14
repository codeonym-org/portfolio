"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import { converse } from "@/agent/converse";
import { world } from "@/config/world.config";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session-store";

const copy = world.interview;

/** TEXT: one floating field, drifting a little, to ask him anything */
export function TextDock() {
  const running = useSession((s) => s.running);
  const stop = useSession((s) => s.agentStop);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => input.current?.focus();
    window.addEventListener("system:focus-prompt", focus);
    const timer = window.setTimeout(focus, 400);
    return () => {
      window.removeEventListener("system:focus-prompt", focus);
      window.clearTimeout(timer);
    };
  }, []);

  const send = () => {
    const text = value.trim();
    if (!text || running) return;
    setValue("");
    void converse(text);
  };

  return (
    <motion.form
      key="text"
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2"
    >
      <div
        className={cn(
          "interview-float flex items-center gap-2 rounded-full border border-white/12 bg-[oklch(0.14_0.03_285/0.72)] py-1.5 pr-1.5 pl-5 backdrop-blur-xl",
          "shadow-[0_18px_50px_rgb(0_0_0/0.55),inset_0_1px_0_rgb(255_255_255/0.08)] transition-shadow focus-within:shadow-[0_18px_50px_rgb(0_0_0/0.55),0_0_0_1px_oklch(0.78_0.13_232/0.45),0_0_30px_oklch(0.62_0.22_295/0.35)]",
        )}
      >
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={1200}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-white outline-none placeholder:text-white/35"
        />
        {running ? (
          <button type="button" aria-label="Stop" onClick={() => stop?.()} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!value.trim()}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.74_0.17_300)] to-[oklch(0.62_0.16_250)] text-white shadow-[0_6px_20px_oklch(0.62_0.22_295/0.45)] transition enabled:hover:brightness-110 disabled:opacity-35 disabled:shadow-none"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </motion.form>
  );
}
