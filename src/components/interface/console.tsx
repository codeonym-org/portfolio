"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, History, RotateCw, Search, Square } from "lucide-react";
import { converse, retryLink } from "@/agent/converse";
import { Markdown } from "@/components/agent/markdown";
import { VoiceButton } from "@/components/agent/voice/voice-button";
import { useVoiceStore, voiceLive } from "@/components/agent/voice/voice-store";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useSession, type Turn } from "@/store/session-store";
import { view } from "@/components/scene/view";
import { VoicePulse } from "./voice-pulse";
import { useWorldStore } from "@/store/world-store";
import { Cards } from "./cards";

const copy = world.agent;

/** reveals text at reading speed; follows along when the text is still streaming in */
function useReveal(text: string, id: string) {
  const [state, setState] = useState({ id, shown: 0 });
  const shown = state.id === id ? state.shown : 0;
  useEffect(() => {
    if (shown >= text.length) return;
    // far behind (a long reply arrived at once) → catch up faster
    const step = Math.max(2, Math.ceil((text.length - shown) / 40));
    const timer = window.setTimeout(() => setState({ id, shown: Math.min(text.length, shown + step) }), 16);
    return () => window.clearTimeout(timer);
  }, [text, shown, id]);
  return { visible: text.slice(0, shown), done: shown >= text.length };
}

function Oracle({ id, text, aside, live }: { id: string; text: string; aside: boolean; live: boolean }) {
  const { visible, done } = useReveal(text, id);
  return (
    <div className={cn("oracle", aside && "oracle--aside")} aria-live="polite">
      <Markdown text={visible} />
      {(!done || live) && <span className="caret" aria-hidden />}
    </div>
  );
}

/** the voice's level, as five bars */
function Level() {
  const bars = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      bars.current?.childNodes.forEach((n, i) => {
        const h = 3 + voiceLive.level * (10 + ((i * 7) % 5) * 4) * (0.6 + 0.4 * Math.sin(performance.now() / 90 + i));
        (n as HTMLElement).style.height = `${Math.max(3, h)}px`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span ref={bars} className="inline-flex h-4 items-center gap-[2px]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="w-[2px] bg-arcane-hot" />
      ))}
    </span>
  );
}

function Transcript({ turns }: { turns: Turn[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns.length]);
  return (
    <motion.div
      ref={scroller}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="glass glass-edge pointer-events-auto max-h-[46dvh] space-y-4 overflow-y-auto overscroll-contain rounded-[3px] px-5 py-4"
    >
      <p className="eyebrow">Transcript</p>
      {turns.map((t) =>
        t.role === "visitor" ? (
          <p key={t.id} className="font-mono text-xs text-muted-foreground">
            <span className="text-arcane-hot">{t.voice ? "voice ›" : "you ›"}</span> {t.text}
          </p>
        ) : (
          <div key={t.id} className="space-y-2 border-l border-white/10 pl-3 text-sm leading-relaxed text-foreground/85">
            {t.text && <Markdown text={t.text} />}
            <Cards cards={t.cards} />
          </div>
        ),
      )}
    </motion.div>
  );
}

/**
 * The only fixed control on screen. Whatever is typed (or said) here
 * goes to THE SYSTEM; its answer is set above the prompt in its own
 * voice — the latest exchange only, the transcript is one click away —
 * while the sky rearranges behind it.
 */
export function Console() {
  const turns = useSession((s) => s.turns);
  const running = useSession((s) => s.running);
  const notice = useSession((s) => s.notice);
  const online = useSession((s) => s.online);
  const mode = useSession((s) => s.mode);
  const stop = useSession((s) => s.agentStop);
  const focused = useWorldStore((s) => !!(s.sector || s.caseFile || s.brief));
  const touch = useWorldStore((s) => s.touch);
  const ready = useWorldStore((s) => s.ready);
  const setPaletteOpen = useWorldStore((s) => s.setPaletteOpen);
  const voice = useVoiceStore();

  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const section = useRef<HTMLElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // An answer longer than its room scrolls. Only then does it take the pointer: a short one lets the
  // wheel and the drag through to the scene behind it.
  useEffect(() => {
    const el = words.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 4);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    const mutations = new MutationObserver(measure);
    mutations.observe(el, { childList: true, subtree: true, characterData: true });
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [history, touch, focused]);

  // tell the stage how much of the bottom of the screen the words take (the rig frames the Monolith above them)
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const measure = () => {
      view.clear = focused ? 0 : Math.max(0, window.innerHeight - el.getBoundingClientRect().top);
      document.documentElement.style.setProperty("--console-clear", `${Math.round(view.clear)}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      view.clear = 0;
    };
  }, [focused]);

  useEffect(() => {
    const focus = () => input.current?.focus();
    window.addEventListener("system:focus-prompt", focus);
    return () => window.removeEventListener("system:focus-prompt", focus);
  }, []);

  const send = (text: string) => {
    if (!text.trim() || running) return;
    setDraft("");
    setHistory(false);
    if (input.current) input.current.style.height = "";
    void converse(text);
  };

  const lastSystem = [...turns].reverse().find((t) => t.role === "system");
  const lastVisitor = [...turns].reverse().find((t) => t.role === "visitor");
  const awaiting = running && lastVisitor && turns.indexOf(lastVisitor) > (lastSystem ? turns.indexOf(lastSystem) : -1);

  const speaking = mode === "voice";
  const question = speaking ? voice.heard : lastVisitor?.text;
  const answer = speaking
    ? { id: "voice", text: voice.reply, cards: undefined }
    : awaiting
      ? null
      : (lastSystem ?? { id: "greeting", text: copy.greeting, cards: undefined });
  const status = speaking && voice.phase !== "idle" ? copy.voice[voice.phase] : awaiting ? copy.thinking : null;
  const compact = touch && focused;

  // a new answer takes the camera back from a close-up, so the words have room
  const answerId = answer?.id;
  useEffect(() => {
    if (answerId && answerId !== "greeting") view.zoom = Math.max(view.zoom, 1);
  }, [answerId]);

  return (
    <>
    <div className={cn("console-scrim", focused || !ready ? "opacity-0" : turns.length || speaking ? "opacity-100" : "opacity-60")} aria-hidden />
    <section
      ref={section}
      aria-label={`${copy.name} — console`}
      className={cn(
        "pointer-events-none fixed z-30 flex flex-col gap-3 transition-[left,width,transform,opacity] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        touch
          ? "inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
          : focused
            ? "bottom-7 left-[4vw] w-[min(560px,calc(100vw-min(600px,44vw)-8vw))]"
            : "bottom-7 left-1/2 w-[min(780px,92vw)] -translate-x-1/2",
        !ready && "translate-y-6 opacity-0",
      )}
    >
      <AnimatePresence>{history && !compact && <Transcript key="transcript" turns={turns} />}</AnimatePresence>

      <VoicePulse />

      {!history && !compact && (
        <div
          ref={words}
          tabIndex={overflowing ? 0 : undefined}
          role={overflowing ? "region" : undefined}
          aria-label={overflowing ? "The System's answer (scrolls)" : undefined}
          className={cn(
            "fade-top answer-scroll max-h-[38dvh] space-y-3 overflow-y-auto overscroll-contain pt-8 pr-2 focus-visible:outline-none",
            overflowing && "pointer-events-auto",
            !touch && !focused && "text-center",
          )}
        >
          {question && (
            <p className="font-mono text-xs text-muted-foreground">
              <span className="text-arcane-hot">{speaking ? "voice ›" : lastVisitor?.voice ? "voice ›" : "you ›"}</span> {question}
            </p>
          )}
          {status && (
            <p className={cn("eyebrow flex items-center gap-2 text-arcane-hot", !touch && !focused && "justify-center")}>
              {speaking ? <Level /> : <span className="spinner" />} {status}
            </p>
          )}
          {answer?.text && <Oracle key={answer.id} id={answer.id} text={answer.text} aside={focused || touch} live={running && !speaking} />}
          {answer && <div className={cn(!touch && !focused && "flex justify-center")}>{<Cards cards={answer.cards} />}</div>}
          {(notice || voice.notice) && (
            <p role="status" className={cn("pointer-events-auto flex items-center gap-2 font-mono text-[11px] text-ember", !touch && !focused && "justify-center")}>
              {voice.notice ?? notice}
              {online === false && !voice.notice && (
                <button type="button" onClick={retryLink} className="inline-flex items-center gap-1 text-foreground/80 underline underline-offset-2 hover:text-white">
                  <RotateCw className="size-3" /> retry the link
                </button>
              )}
            </p>
          )}
        </div>
      )}

      {!turns.length && !focused && !speaking && (
        <div className={cn("pointer-events-auto flex gap-1.5", touch ? "-mx-3 overflow-x-auto px-3 [scrollbar-width:none]" : "flex-wrap justify-center")}>
          <button type="button" data-active="true" onPointerEnter={() => play("hover")} onClick={() => useWorldStore.getState().openBrief()} className="hud-chip shrink-0 px-3 py-1.5 text-[13px] backdrop-blur-md">
            {copy.brief}
          </button>
          {copy.suggestions.map((s) => (
            <button key={s} type="button" onPointerEnter={() => play("hover")} onClick={() => send(s)} className="hud-chip shrink-0 px-3 py-1.5 text-[13px] backdrop-blur-md">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="prompt pointer-events-auto"
        data-running={running}
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <span className="prompt__mark mb-[13px]" aria-hidden />
        <textarea
          ref={input}
          value={draft}
          rows={1}
          maxLength={1200}
          enterKeyHint="send"
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            } else if (e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          className="min-h-9 flex-1 resize-none bg-transparent py-2 pl-2 text-[15px] leading-5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        {turns.length > 0 && !compact && (
          <button type="button" aria-label="Transcript" aria-pressed={history} data-active={history} onClick={() => setHistory((h) => !h)} className="hud-chip size-9 shrink-0">
            <History className="size-4" />
          </button>
        )}
        <button type="button" aria-label="Search the record (Ctrl K)" onClick={() => setPaletteOpen(true)} className="hud-chip h-9 shrink-0 px-2.5">
          <Search className="size-4" />
          <span className="kbd hidden sm:inline-grid">⌘K</span>
        </button>
        <VoiceButton />
        {running && stop && !speaking ? (
          <button type="button" aria-label="Stop" onClick={stop} className="hud-chip size-9 shrink-0">
            <Square className="size-3.5" />
          </button>
        ) : (
          <button type="submit" aria-label="Send" disabled={!draft.trim() || running} data-active={!!draft.trim()} className="hud-chip size-9 shrink-0 disabled:opacity-40">
            <ArrowUp className="size-4" />
          </button>
        )}
      </form>
      {!touch && (
        <p className={cn("font-mono text-[10px] text-muted-foreground/55", !focused && "text-center")}>
          {copy.footer} <span className="text-muted-foreground/80">· {online === false ? "local index" : online ? "link up" : "linking…"}</span>
        </p>
      )}
    </section>
    </>
  );
}
