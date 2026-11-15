"use client";

import type { ReactNode } from "react";
import { motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";

/**
 * ── A WINDOW IN THE AIR ───────────────────────────────────────
 * One pane of glass: a dot and a label in its own colour, a cross to
 * put it away, and what it holds. It can be taken by its top and
 * moved; let go, it stays where it was put.
 */
export function AirWindow({
  label,
  tint,
  children,
  onClose,
  small,
  movable = true,
  layoutId,
  className,
}: {
  label: string;
  tint: string;
  children: ReactNode;
  onClose?: () => void;
  small?: boolean;
  movable?: boolean;
  layoutId?: string;
  className?: string;
}) {
  const drag = useDragControls();
  return (
    <motion.div
      layout="position"
      layoutId={layoutId}
      drag={movable}
      dragControls={drag}
      dragListener={false}
      dragMomentum={false}
      whileDrag={{ scale: 1.03, zIndex: 5 }}
      initial={{ opacity: 0, scale: 0.7, y: 24, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(8px)", transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 190, damping: 24, mass: 0.9 }}
      className={cn("pointer-events-auto w-full", className)}
    >
      <div className={cn("air", small ? "px-3.5 py-2.5" : "px-4 pt-3 pb-4")} style={{ ["--air-tint" as string]: tint }}>
        <div
          className={cn("flex items-center gap-2", small ? "mb-1" : "mb-2", movable && "cursor-grab touch-none active:cursor-grabbing")}
          onPointerDown={movable ? (e) => drag.start(e) : undefined}
        >
          <span className="air-dot" />
          <p className="air-label min-w-0 flex-1 truncate">{label}</p>
          {onClose && (
            <button
              type="button"
              aria-label="Close"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                play("close", { volume: 0.3 });
                onClose();
              }}
              className="-mr-1 grid size-6 place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
}
