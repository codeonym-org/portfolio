"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toneColor } from "@/components/scene/view";
import { cn } from "@/lib/utils";
import { useWorldStore, type Toast } from "@/store/world-store";

const LIFE_MS = 5200;

function Notice({ toast }: { toast: Toast }) {
  const dismiss = useWorldStore((s) => s.dismissToast);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), LIFE_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss]);
  const color = toneColor[toast.tone];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="pointer-events-auto w-[min(360px,88vw)] cursor-pointer"
      onClick={() => dismiss(toast.id)}
    >
      {/* the window is inside: its own opening animation must not fight the list's layout animation */}
      <div className="sys-window overflow-hidden px-4 py-3" style={{ ["--sys" as string]: color }}>
        <span className="sys-scan" aria-hidden />
        <p className="sys-head text-[11px]">{toast.heading}</p>
        <p className="mt-1.5 text-[15px] leading-snug">{toast.body}</p>
      </div>
    </motion.li>
  );
}

/** System notices: quests, ARISE, anything the agent pushes. Each is a small System window that closes by itself. */
export function Toasts() {
  const toasts = useWorldStore((s) => s.toasts);
  // beside an open window, notices move over the stage instead of covering what is being read
  const focused = useWorldStore((s) => !!s.sector || !!s.caseFile || s.brief);
  return (
    <ol
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed top-16 left-1/2 z-[55] flex -translate-x-1/2 flex-col items-center gap-2 transition-[left] duration-500",
        focused && "min-[820px]:left-[calc((100vw-min(600px,44vw))/2)]",
      )}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Notice key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
