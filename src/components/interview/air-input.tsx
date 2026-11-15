"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Square } from "lucide-react";
import { converse } from "@/agent/converse";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { useSession } from "@/store/session-store";

const copy = world.interview;

/**
 * ── TYPING IN MID-AIR ─────────────────────────────────────────
 * TEXT: a pane of glass hanging in front of the desk, tilted back a
 * little until you write on it. There is a real field (invisible, it
 * takes the keys, the selection, the phone keyboard); what you see
 * is drawn over it: each letter comes out of the air where the lit
 * caret is. Sent, the words lift off the glass toward him.
 */
export function AirInput() {
  const running = useSession((s) => s.running);
  const stop = useSession((s) => s.agentStop);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [focus, setFocus] = useState(false);
  const [sent, setSent] = useState<{ id: number; text: string } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const focusField = () => field.current?.focus();
    window.addEventListener("system:focus-prompt", focusField);
    const timer = window.setTimeout(focusField, 500);
    return () => {
      window.removeEventListener("system:focus-prompt", focusField);
      window.clearTimeout(timer);
    };
  }, []);

  const send = () => {
    const text = value.trim();
    if (!text || running) return;
    play("confirm", { volume: 0.35 });
    setSent({ id: Date.now(), text });
    setValue("");
    setCaret(0);
    void converse(text);
  };

  const chars = [...value];
  // the caret counts UTF-16 units; the letters are drawn by code point
  let at = 0;
  let units = 0;
  while (at < chars.length && units < caret) units += chars[at++].length;

  return (
    <motion.form
      initial={{ opacity: 0, y: 60, scaleX: 0.3, rotateX: 50 }}
      animate={{ opacity: 1, y: focus ? -6 : 0, scaleX: 1, rotateX: focus ? 0 : 9 }}
      exit={{ opacity: 0, y: 40, scaleX: 0.5, rotateX: 40, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      style={{ transformPerspective: 900, transformOrigin: "50% 100%", x: "-50%" }}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(620px,calc(100vw-1.5rem))]"
    >
      {/* the words just sent, leaving the glass */}
      <AnimatePresence>
        {sent && (
          <motion.p
            key={sent.id}
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-8 truncate text-center text-[17px] text-white [text-shadow:0_0_18px_oklch(0.78_0.13_232)]"
            initial={{ opacity: 0.9, y: 0, scale: 1, filter: "blur(0px)" }}
            animate={{ opacity: 0, y: -170, scale: 0.7, filter: "blur(5px)" }}
            transition={{ duration: 0.75, ease: [0.3, 0, 0.2, 1] }}
            onAnimationComplete={() => setSent(null)}
          >
            {sent.text}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="air air-float air-input px-4 pt-2.5 pb-3 sm:px-5" data-focus={focus} onClick={() => field.current?.focus()}>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="air-dot" />
          <p className="air-label flex-1">{copy.input}</p>
          <p className="air-label hidden text-white/30 sm:block">{copy.send}</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="relative max-h-[7.5em] min-w-0 flex-1 overflow-y-auto text-[17px] leading-[1.5]">
            {/* what is seen */}
            <div aria-hidden className="min-h-[1.5em] break-words whitespace-pre-wrap text-white">
              {chars.slice(0, at).map((c, i) => (
                <span key={i} className="air-key">
                  {c}
                </span>
              ))}
              <span className="air-caret" />
              {chars.slice(at).map((c, i) => (
                <span key={at + i}>{c}</span>
              ))}
              {!value && <span className="text-white/35">{copy.placeholder}</span>}
              {"​"}
            </div>
            {/* what takes the keys */}
            <textarea
              ref={field}
              value={value}
              rows={1}
              maxLength={1200}
              aria-label={copy.placeholder}
              enterKeyHint="send"
              autoCapitalize="sentences"
              spellCheck={false}
              onChange={(e) => {
                setValue(e.target.value);
                setCaret(e.target.selectionStart);
              }}
              onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent break-words whitespace-pre-wrap text-transparent caret-transparent outline-none selection:bg-system/30"
            />
          </div>
          {running ? (
            <button type="button" aria-label="Stop" onClick={() => stop?.()} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <motion.button
              type="submit"
              aria-label="Send"
              disabled={!value.trim()}
              whileTap={{ scale: 0.9 }}
              animate={{ scale: value.trim() ? 1 : 0.9 }}
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.74_0.17_300)] to-[oklch(0.62_0.16_250)] text-white shadow-[0_6px_20px_oklch(0.62_0.22_295/0.45)] transition-[filter,opacity] enabled:hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
            >
              <CornerDownLeft className="size-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.form>
  );
}
