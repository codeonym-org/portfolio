import type { GateRank } from "@/config/types";
import { cn } from "@/lib/utils";

const rankTone: Record<GateRank, string> = {
  S: "border-rank-s text-rank-s shadow-[0_0_18px_oklch(0.8_0.15_80/0.45)]",
  A: "border-arcane-hot text-arcane-hot",
  B: "border-system text-system",
  C: "border-white/50 text-white",
};

export function RankBadge({ rank, className }: { rank: GateRank; className?: string }) {
  return (
    <span className={cn("grid place-items-center border bg-black/50 font-display", rankTone[rank], className)} aria-label={`Rank ${rank}`}>
      {rank}
    </span>
  );
}
