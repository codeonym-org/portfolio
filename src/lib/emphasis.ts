import type { Emphasis } from "@/config/types";

/** how strongly an entry is drawn: border, glow, tint (the colour only, never a ranking shown in words) */
export const emphasisTile: Record<Emphasis, string> = {
  highlight:
    "border-gold/60 bg-gold/10 text-gold shadow-[0_0_14px_oklch(0.78_0.15_85/0.35)] hover:shadow-[0_0_22px_oklch(0.78_0.15_85/0.55)]",
  strong: "border-violet/60 bg-violet/10 text-violet shadow-[0_0_12px_oklch(0.6_0.21_295/0.35)] hover:shadow-[0_0_20px_oklch(0.6_0.21_295/0.55)]",
  standard: "border-system/50 bg-system/10 text-system shadow-[0_0_10px_oklch(0.72_0.14_235/0.3)] hover:shadow-[0_0_18px_oklch(0.72_0.14_235/0.5)]",
  quiet:
    "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
};

export const emphasisText: Record<Emphasis, string> = {
  highlight: "text-gold",
  strong: "text-violet",
  standard: "text-system",
  quiet: "text-muted-foreground",
};

export const emphasisBar: Record<Emphasis, string> = {
  highlight: "bg-gold shadow-[0_0_6px_oklch(0.78_0.15_85/0.6)]",
  strong: "bg-violet shadow-[0_0_6px_oklch(0.6_0.21_295/0.6)]",
  standard: "bg-system shadow-[0_0_6px_oklch(0.72_0.14_235/0.6)]",
  quiet: "bg-muted-foreground",
};

/** self-rated mastery (0–100) in a word, shared by every skill display, the dossier and the plain record */
export function masteryLevel(mastery: number): "Expert" | "Advanced" | "Proficient" | "Familiar" {
  if (mastery >= 90) return "Expert";
  if (mastery >= 85) return "Advanced";
  if (mastery >= 78) return "Proficient";
  return "Familiar";
}
