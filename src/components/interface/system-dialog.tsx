"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { executeSystemCommand } from "@/agent/system-commands";
import { toneColor } from "@/components/scene/view";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";

const copy = world.prompts;
/** how long after the scene is up the first-visit offer waits */
const GREETING_DELAY_MS = 2600;
/** how long an unanswered proposal stays on screen */
const PROPOSAL_STAYS_MS = 40_000;

/** a first-time visitor is offered the one-minute brief, once */
function useGreeting() {
  const ready = useWorldStore((s) => s.ready);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const s = useWorldStore.getState();
      // not for a returning visitor, a shared case link, or someone already reading
      if (s.greeted || s.visited.length || s.briefRead || s.cvRead || window.location.hash || s.sector || s.caseFile || s.brief || s.prompt) return;
      s.setGreeted();
      s.ask({ id: "greeting", heading: copy.greeting.heading, body: copy.greeting.body, accept: copy.accept, decline: copy.decline, tone: "system", command: { name: "open_brief" } });
    }, GREETING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);
}

/**
 * The System's question: a window in the middle of the stage with a
 * message and two answers. It never blocks: the page behind stays
 * usable, and Escape, N or "Later" close it. A proposal from the
 * agent has three outcomes: accepted, refused ("Not now", N) or
 * ignored (Escape, the cross, a new message, or 40 s). Accepting runs the
 * prompt's command, which is always one from the command list.
 */
export function SystemDialog() {
  const prompt = useWorldStore((s) => s.prompt);
  const answer = useWorldStore((s) => s.answer);
  const ignore = useWorldStore((s) => s.ignore);
  const proposal = prompt?.id === "offer";
  const focused = useWorldStore((s) => !!s.sector || !!s.caseFile || s.brief);
  const acceptButton = useRef<HTMLButtonElement>(null);
  useGreeting();

  const reply = useCallback(
    (accepted: boolean) => {
      const command = useWorldStore.getState().prompt?.command;
      play(accepted ? "confirm" : "close", { volume: 0.5 });
      answer(accepted);
      if (accepted && command) void executeSystemCommand(command.name, command.args);
    },
    [answer],
  );

  useEffect(() => {
    const onAnswer = (e: Event) => reply((e as CustomEvent<boolean>).detail);
    window.addEventListener("system:answer", onAnswer);
    return () => window.removeEventListener("system:answer", onAnswer);
  }, [reply]);

  // a proposal nobody answers goes away by itself: that is "ignored", not "refused"
  useEffect(() => {
    if (!proposal) return;
    const timer = window.setTimeout(ignore, PROPOSAL_STAYS_MS);
    return () => window.clearTimeout(timer);
  }, [proposal, prompt, ignore]);

  // the keyboard lands on "Accept", unless the visitor is in the middle of typing
  useEffect(() => {
    if (!prompt) return;
    const active = document.activeElement as HTMLElement | null;
    const typing = !!active?.closest("textarea, input") && !!(active as HTMLTextAreaElement).value;
    if (!typing) acceptButton.current?.focus({ preventScroll: true });
  }, [prompt]);

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          key={prompt.id}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "pointer-events-none fixed inset-x-0 top-[22dvh] z-[58] flex justify-center px-4 transition-[padding] duration-500",
            focused && "min-[820px]:pr-[min(600px,44vw)]",
          )}
        >
          <div
            role="dialog"
            aria-labelledby="system-prompt-heading"
            aria-describedby="system-prompt-body"
            className="sys-window pointer-events-auto w-[min(460px,100%)] overflow-hidden"
            style={{ ["--sys" as string]: toneColor[prompt.tone] }}
          >
            <span className="sys-scan" aria-hidden />
            <div className="border-b border-[color-mix(in_oklch,var(--sys)_30%,transparent)] px-5 py-3">
              <p className="sys-head text-xs">
                <span aria-hidden className="grid size-5 place-items-center border border-current text-[13px] leading-none tracking-normal">
                  !
                </span>
                <span id="system-prompt-heading">{prompt.heading}</span>
                {proposal && (
                  <button type="button" aria-label="Ignore this proposal" onClick={ignore} className="order-1 grid size-6 place-items-center text-lg leading-none tracking-normal opacity-70 hover:opacity-100">
                    ×
                  </button>
                )}
              </p>
            </div>
            <p id="system-prompt-body" className="px-5 pt-4 text-center text-[19px] leading-snug font-medium text-balance">
              {prompt.body}
            </p>
            <div className="flex gap-3 px-5 pt-5 pb-3">
              <button ref={acceptButton} type="button" data-primary="true" onClick={() => reply(true)} className="sys-button flex-1 px-4 py-2.5 text-sm">
                {prompt.accept}
              </button>
              <button type="button" onClick={() => reply(false)} className="sys-button flex-1 px-4 py-2.5 text-sm">
                {prompt.decline}
              </button>
            </div>
            <p className="hidden pb-3 text-center text-[11px] tracking-[0.18em] text-[color-mix(in_oklch,var(--sys)_70%,transparent)] uppercase sm:block">{proposal ? copy.offerKeys : copy.keys}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
