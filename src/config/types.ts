import type { LucideIcon } from "lucide-react";

/** how much a project weighs in the record: the size and colour of its shard, its order */
export type ProjectTier = "flagship" | "major" | "minor";
export type ProjectStatus = "shipped" | "ongoing";
export type Tone = "system" | "violet" | "gold" | "ember";
export type Emphasis = "highlight" | "strong" | "standard" | "quiet";

export interface Stat {
  /** short code beside the bar (AI, BE, ...) */
  code: string;
  /** What the stat actually measures */
  label: string;
  /** 0–100 */
  value: number;
}

export interface OwnerLinks {
  github: string;
  linkedin: string;
  email: string;
  /** international format, as printed on the CV */
  phone: string;
}

/** something I am known for: one of the gold cards in the Profile section */
export interface OwnerTitle {
  id: string;
  name: string;
  /** what it rests on, one line */
  description: string;
}

export interface Owner {
  name: string;
  /** his first name, as the agent and the page use it */
  firstName: string;
  /** how his first name is said, respelled for the voice and for readers: "A-yoob" */
  pronounced: string;
  handle: string;
  title: string;
  job: string;
  location: string;
  /** where Ayoub lives, for the map card: coordinates of the city, IANA time zone */
  base: { city: string; country: string; lat: number; lon: number; timeZone: string; countryCentre: { lon: number; lat: number } };
  organization: string;
  titles: OwnerTitle[];
  profile: string[];
  motto: string;
  stats: Stat[];
  links: OwnerLinks;
  languages: { name: string; grade: string }[];
}

/** an organization Ayoub works in */
export interface Organization {
  id: string;
  name: string;
  /** Ayoub's role there: employed, or founder and maintainer */
  role: "Engineer" | "Founder";
  /** what kind of place it is, in two words */
  kind: string;
  summary: string;
  link?: string;
}

export interface Project {
  id: string;
  name: string;
  tier: ProjectTier;
  /** work for an employer, or my own */
  type: "work" | "personal";
  /** must match a Organization id (organizations.config) */
  organization: string;
  /** personal projects only: released, or still being built */
  stage?: "released" | "in development";
  status: ProjectStatus;
  period?: string;
  summary: string;
  details: string[];
  /** the stack it is built with */
  stack: string[];
  link?: string;
  /** documentation site, when the project has one */
  docs?: string;
}

/** job = Ayoub's craft; secondary = everything the job isn't */
export type SkillSet = "job" | "secondary";

export interface SkillSetDef {
  id: SkillSet;
  name: string;
  /** one-line intro rendered under the set heading */
  blurb: string;
}

export interface SkillCategoryDef {
  id: string;
  name: string;
  icon: LucideIcon;
  set: SkillSet;
  tone: Tone;
}

export interface SkillDetail {
  id: string;
  name: string;
  icon: LucideIcon;
  /** must match a SkillCategoryDef id */
  category: string;
  emphasis: Emphasis;
  /** 0–100 mastery, drives the gauge and grade */
  mastery: number;
  /** what it is, shown on its card */
  about: string;
  tags?: string[];
}

/** what the inspect card is currently showing */
export interface InspectTarget {
  kind: "skill" | "document" | "project";
  id: string;
}

export interface TimelineEntry {
  id: string;
  role: string;
  organization: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface Achievement {
  id: string;
  title: string;
  issuer: string;
  period: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface DocumentItem {
  id: string;
  name: string;
  icon: LucideIcon;
  /** must match an DocumentCategory id */
  category: string;
  emphasis: Emphasis;
  /** provenance line (issuer · period) shown under the item name */
  meta?: string;
  /** what it is, shown on its card */
  about: string;
  tags?: string[];
  /** opening it goes to a section or the CV */
  unlocks?: Destination;
  /** opening it goes to this address */
  link?: string;
}

export interface SystemConfig {
  /** release number, surfaced to agents in the snapshot */
  version: string;
  runtimeError: StatusCopy & { retry: string; home: string; ref: string; copy: string; copied: string };
  notFound: StatusCopy & { home: string; interview: string; plain: string; tried: string; site: string };
}

/** Copy for the 404 and error pages (`system/status-screen.tsx`). */
export interface StatusCopy {
  /** inside the ring */
  code: string;
  kicker: string;
  title: string;
  body: string;
}

/* ─────────────────────────── THE RECORD ─────────────────────────── */

/** the six sectors of the record — each one is a ring of shards around the Monolith */
export type SectorId =
  | "profile"
  | "experience"
  | "projects"
  | "skills"
  | "documents"
  | "contact";

/** where a USE / link / agent command can send the visitor */
export type Destination = SectorId | "cv";

export interface SectorDef {
  id: SectorId;
  /** in-world name shown on beacons, the index and the window */
  name: string;
  /** what the window holds, in plain words (e.g. "Status & Profile") */
  section: string;
  /** one-line flavor under the name */
  tagline: string;
  icon: LucideIcon;
  tone: Tone;
  /** agent-facing routing hint (exposed through src/agent) */
  description: string;
}

/** what an interview answer is about */
export type InterviewTopic = "motivation" | "work" | "strengths" | "practical" | "terms";

/**
 * One HR question and the owner's answer to it.
 *  · `confirmed`   — his own words, approved by him in a grilling session
 *  · `from-record` — drafted from what the record already states; waits for his word
 *  · `open`        — asked, not answered yet: the agent does not answer it
 */
export interface InterviewEntry {
  id: string;
  topic: InterviewTopic;
  question: string;
  status: "confirmed" | "from-record" | "open";
  /** first person, as he would say it — absent while the entry is `open` */
  answer?: string;
  /** a salary, a start date, an agreement: only the real owner settles it, whatever is on file */
  binding?: boolean;
}
