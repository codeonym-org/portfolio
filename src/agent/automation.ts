/**
 * ── AUTOMATION HELPERS ────────────────────────────────────────
 * Pure pieces behind the platform tools (copy / open a channel,
 * name a snapshot). Dependency-free (unit-tested with `node --test`).
 */

export const CHANNELS = ["email", "github", "linkedin", "portfolio"] as const;
export type Channel = (typeof CHANNELS)[number];

interface Links {
  github: string;
  linkedin: string;
  email: string;
}

const LABELS: Record<Channel, string> = {
  email: "email address",
  github: "GitHub profile",
  linkedin: "LinkedIn profile",
  portfolio: "portfolio link",
};

/** what to copy for a channel, and where opening it goes */
export function channelTarget(channel: Channel, links: Links, origin: string) {
  const text = channel === "portfolio" ? origin : links[channel];
  return { label: LABELS[channel], text, href: channel === "email" ? `mailto:${text}` : text };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function snapshotFileName(at: Date) {
  const day = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return `codeonym-record-${day}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}.png`;
}
