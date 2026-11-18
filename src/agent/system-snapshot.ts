import { achievements, timeline } from "@/config/timeline.config";
import { documentCategories, documents } from "@/config/documents.config";
import { owner } from "@/config/owner.config";
import { projects } from "@/config/projects.config";
import { skillCategories, skillSets, skills } from "@/config/skills.config";
import { systemConfig } from "@/config/system.config";
import type { Destination, InspectTarget, SectorId } from "@/config/types";
import { sectors } from "@/config/world.config";
import type { CaseFile } from "@/record/case-file";
import { useWorldStore } from "@/store/world-store";

/**
 * ── AGENT BRIDGE · READ SIDE ──────────────────────────────────
 * One serializable snapshot of everything an AI agent needs to
 * reason about the record: which sector or case is brought forward,
 * the visitor's progress, and Ayoub's full dossier.
 * Icons and React types are stripped — every value survives
 * JSON.stringify.
 *
 * CopilotKit v2: pass `useSystemSnapshot()` to `useAgentContext`.
 * LangChain: serialize `getSystemSnapshot()` into the model context.
 */

export interface SectorSnapshot {
  sector: SectorId;
  name: string;
  section: string;
  description: string;
  opened: boolean;
}

export interface SystemSnapshot {
  system: { version: string; soundMuted: boolean; quality: string; touch: boolean };
  world: {
    /** sector brought forward, if any */
    openSector: SectorId | null;
    /** case file brought forward, if any */
    caseFile: CaseFile | null;
    /** true when the one-minute brief is brought forward */
    briefOpen: boolean;
    /** true when my live GitHub activity is brought forward */
    githubOpen: boolean;
    cvOpen: boolean;
    mapOpen: boolean;
    paletteOpen: boolean;
    inspectTarget: InspectTarget | null;
    sectors: SectorSnapshot[];
  };
  visitor: {
    sectionsOpened: string[];
    briefRead: boolean;
    cvRead: boolean;
  };
  owner: typeof owner;
  projects: typeof projects;
  skills: {
    sets: typeof skillSets;
    categories: { id: string; name: string; set: string }[];
    skills: { id: string; name: string; category: string; emphasis: string; mastery: number; about: string; tags?: string[] }[];
  };
  timeline: typeof timeline;
  achievements: typeof achievements;
  documents: {
    categories: { id: string; name: string }[];
    items: {
      id: string;
      name: string;
      category: string;
      emphasis: string;
      meta?: string;
      about: string;
      tags?: string[];
      unlocks?: Destination;
      link?: string;
    }[];
  };
}

/** static part — configs never change at runtime */
const dossier = {
  owner,
  projects,
  skills: {
    sets: skillSets,
    categories: skillCategories.map(({ id, name, set }) => ({ id, name, set })),
    skills: skills.map(({ id, name, category, emphasis, mastery, about, tags }) => ({
      id,
      name,
      category,
      emphasis,
      mastery,
      about,
      ...(tags ? { tags } : {}),
    })),
  },
  timeline,
  achievements,
  documents: {
    categories: documentCategories.map(({ id, name }) => ({ id, name })),
    items: documents.map(({ id, name, category, emphasis, meta, about, tags, unlocks, link }) => ({
      id,
      name,
      category,
      emphasis,
      about,
      ...(meta ? { meta } : {}),
      ...(tags ? { tags } : {}),
      ...(unlocks ? { unlocks } : {}),
      ...(link ? { link } : {}),
    })),
  },
};

export function getSystemSnapshot(): SystemSnapshot {
  const s = useWorldStore.getState();
  return {
    system: { version: systemConfig.version, soundMuted: s.muted, quality: s.quality, touch: s.touch },
    world: {
      openSector: s.sector,
      caseFile: s.caseFile,
      briefOpen: s.brief,
      githubOpen: s.github,
      cvOpen: s.cvOpen,
      mapOpen: s.mapOpen,
      paletteOpen: s.paletteOpen,
      inspectTarget: s.inspect,
      sectors: sectors.map((z) => ({
        sector: z.id,
        name: z.name,
        section: z.section,
        description: z.description,
        opened: s.visited.includes(z.id),
      })),
    },
    visitor: {
      sectionsOpened: s.visited,
      briefRead: s.briefRead,
      cvRead: s.cvRead,
    },
    ...dossier,
  };
}

/** reactive variant for `useAgentContext` — re-renders on store changes */
export function useSystemSnapshot(): SystemSnapshot {
  useWorldStore();
  return getSystemSnapshot();
}
