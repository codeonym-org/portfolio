import { BriefcaseBusiness, FolderGit2 } from "lucide-react";
import type { Project, ProjectTier } from "@/config/types";

/** a project's badge: what kind of work it is (for an employer, or my own), coloured by its tier */
export function ProjectGlyph({ project, className }: { project: Pick<Project, "type">; className?: string }) {
  const Icon = project.type === "work" ? BriefcaseBusiness : FolderGit2;
  return <Icon className={className} strokeWidth={1.6} aria-hidden />;
}

/** flagship work first, then the rest */
export const TIER_ORDER: readonly ProjectTier[] = ["flagship", "major", "minor"];

export const tierLabel: Record<ProjectTier, string> = { flagship: "Flagship", major: "Major", minor: "Project" };
