import {
  Coffee,
  Flag,
  Gamepad2,
  Gem,
  GraduationCap,
  IdCard,
  KeyRound,
  Medal,
  Scroll,
  Shield,
  Waypoints,
} from "lucide-react";
import type { DocumentCategory, DocumentItem } from "./types";

/**
 * ── DOCUMENTS ─────────────────────────────────────────────────
 * The CV, links, degrees and interests. `emphasis` only drives the
 * tile's colour. Clicking an item opens its description; items with
 * `unlocks` or `link` can be opened from there.
 * (Ids are kept from before: shared case links point at them.)
 */
export const documentCategories: DocumentCategory[] = [
  { id: "artifacts", name: "DOCUMENTS & LINKS", icon: KeyRound },
  { id: "credentials", name: "DEGREES", icon: Medal },
  { id: "interests", name: "INTERESTS", icon: Gem },
];

export const documents: DocumentItem[] = [
  // ── DOCUMENTS & LINKS ───────────────────────────────────────────────
  {
    id: "cv",
    name: "Curriculum vitae",
    icon: IdCard,
    category: "artifacts",
    emphasis: "highlight",
    meta: "PDF · KEPT UP TO DATE",
    about: "The full CV: experience, projects, skills and education. Open it to read or download the PDF.",
    tags: ["cv", "resume", "official-record"],
    unlocks: "cv",
  },
  {
    id: "employer-opensnz",
    name: "Employer: OpenSNZ-Technology",
    icon: Shield,
    category: "artifacts",
    emphasis: "strong",
    meta: "OPENSNZ-TECHNOLOGY · 2025/09 – PRESENT",
    about: "Where he works as a software engineer: agentic AI systems, from prototype to production.",
    tags: ["employer", "employment"],
  },
  {
    id: "github-codeonym",
    name: "codeonym on GitHub",
    icon: Shield,
    category: "artifacts",
    emphasis: "strong",
    meta: "CODEONYM-OSS · CODEONYM-ORG · FOUNDER",
    about: "The two organisations he founded: codeonym-oss, open-source tooling for agentic systems, and codeonym-org, his own products.",
    tags: ["organisations", "open-source", "founder"],
    link: "https://github.com/codeonym-oss",
  },
  {
    id: "get-in-touch",
    name: "Get in touch",
    icon: Waypoints,
    category: "artifacts",
    emphasis: "standard",
    meta: "EMAIL · PHONE · LINKEDIN · GITHUB",
    about: "Opens the contact window, with every way to reach him.",
    tags: ["contact"],
    unlocks: "contact",
  },
  {
    id: "site-source",
    name: "Source of this site",
    icon: KeyRound,
    category: "artifacts",
    emphasis: "standard",
    meta: "GITHUB · PUBLIC REPOSITORY",
    about: "The code of this portfolio and of its agent, on GitHub.",
    tags: ["source", "github"],
    link: "https://github.com/codeonym-org/portfolio",
  },

  // ── DEGREES ─────────────────────────────────────────────
  {
    id: "masters-degree",
    name: "Master's degree",
    icon: GraduationCap,
    category: "credentials",
    emphasis: "strong",
    meta: "FACULTY OF SCIENCES (FSO), OUJDA · 2023 – 2025",
    about: "Specialized Master in Computer Science Engineering: two years of advanced study.",
    tags: ["degree", "computer-science"],
  },
  {
    id: "bachelors-degree",
    name: "Bachelor's degree",
    icon: Medal,
    category: "credentials",
    emphasis: "standard",
    meta: "FACULTY OF SCIENCES (FSO), OUJDA · 2019 – 2023",
    about: "Bachelor's Degree in Mathematics and Computer Sciences.",
    tags: ["degree", "mathematics"],
  },
  {
    id: "baccalaureate",
    name: "Baccalaureate",
    icon: Scroll,
    category: "credentials",
    emphasis: "quiet",
    meta: "ESSAADIYINE HIGH SCHOOL · 2019",
    about: "Scientific Baccalaureate in Physical Sciences.",
    tags: ["diploma"],
  },

  // ── INTERESTS ──────────────────────────────────────────────────
  {
    id: "capture-the-flag",
    name: "Capture the flag",
    icon: Flag,
    category: "interests",
    emphasis: "standard",
    meta: "SECURITY · HOBBY",
    about: "He plays CTF challenges to keep his security instincts sharp.",
    tags: ["ctf", "security"],
  },
  {
    id: "video-games",
    name: "Video games",
    icon: Gamepad2,
    category: "interests",
    emphasis: "strong",
    meta: "WHERE IT STARTED",
    about: "Years of video games came before the code, and the idea that things grow through practice stayed with him.",
    tags: ["gaming", "origin"],
  },
  {
    id: "coffee",
    name: "Coffee",
    icon: Coffee,
    category: "interests",
    emphasis: "quiet",
    meta: "DAILY",
    about: "Served hot, every day.",
    tags: ["coffee", "fuel"],
  },
];

export function findItem(id: string): DocumentItem | undefined {
  return documents.find((item) => item.id === id);
}
