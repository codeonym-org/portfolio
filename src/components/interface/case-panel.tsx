"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Download, Link2, Mail } from "lucide-react";
import { achievements, chronicle } from "@/config/chronicle.config";
import { findItem } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { findSkill } from "@/config/skills.config";
import { play } from "@/lib/audio";
import { encodeCase, nodeKeyOf, type CaseFile, type Evidence } from "@/record/case-file";
import { inspectTargetOf, nodeByKey } from "@/record/nodes";
import { masteryGrade } from "@/lib/rarity";
import { useWorldStore } from "@/store/world-store";
import { hueColor } from "@/components/scene/view";

/** the record's own words for a piece of evidence — never the model's */
function factsOf(e: Evidence): { kind: string; title: string; meta?: string; tags?: string[] } | null {
  switch (e.kind) {
    case "quest": {
      const q = quests.find((x) => x.id === e.id);
      return q ? { kind: `Project · rank ${q.rank}`, title: q.name, meta: [q.period, q.status].filter(Boolean).join(" · "), tags: q.rewards.slice(0, 5) } : null;
    }
    case "skill": {
      const s = findSkill(e.id);
      return s ? { kind: `Skill · grade ${masteryGrade(s.mastery)}`, title: s.name, meta: `self-rated ${s.mastery}/100`, tags: s.tags } : null;
    }
    case "experience": {
      const c = chronicle.find((x) => x.id === e.id);
      return c ? { kind: "Experience", title: c.role, meta: `${c.organization} · ${c.period}`, tags: c.highlights.slice(0, 4) } : null;
    }
    case "education": {
      const a = achievements.find((x) => x.id === e.id);
      return a ? { kind: "Education", title: a.title, meta: `${a.issuer} · ${a.period}` } : null;
    }
    case "item": {
      const i = findItem(e.id);
      return i ? { kind: "Document", title: i.name, meta: i.meta, tags: i.tags } : null;
    }
  }
}

/**
 * The System's generative answer, laid out: its thesis, then each
 * piece of evidence with the record's facts on top and the System's
 * reasoning under them, numbered like the shards in the halo.
 */
export function CasePanel({ file }: { file: CaseFile }) {
  const setHovered = useWorldStore((s) => s.setHovered);
  const setInspect = useWorldStore((s) => s.setInspect);
  const openSector = useWorldStore((s) => s.openSector);
  const [copied, setCopied] = useState(false);

  const share = () => {
    const url = `${window.location.origin}${window.location.pathname}#${encodeCase(file)}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      play("confirm");
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="space-y-7">
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-serif text-[1.45rem] leading-snug text-bone">
        {file.thesis}
      </motion.p>

      <ol className="space-y-3">
        {file.evidence.map((e, i) => {
          const facts = factsOf(e);
          const node = nodeByKey.get(nodeKeyOf(e));
          if (!facts || !node) return null;
          const target = inspectTargetOf(node);
          return (
            <motion.li
              key={node.key}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.11, type: "spring", stiffness: 240, damping: 26 }}
            >
              <button
                type="button"
                onPointerEnter={() => setHovered(node.key)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => (target ? setInspect(target) : openSector(node.sector))}
                className="group grid w-full grid-cols-[2.25rem_1fr] gap-3 border border-white/[0.07] bg-white/[0.025] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                style={{ ["--hue" as string]: hueColor[node.hue] }}
              >
                <span className="font-display text-lg leading-none text-[var(--hue)]">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 space-y-1.5">
                  <span className="eyebrow block text-[var(--hue)]">{facts.kind}</span>
                  <span className="block text-base leading-tight font-semibold text-white">{facts.title}</span>
                  {facts.meta && <span className="block font-mono text-[10px] text-muted-foreground">{facts.meta}</span>}
                  <span className="block border-l border-[var(--hue)] pl-3 font-serif text-[1.05rem] leading-snug text-foreground/90 italic">{e.why}</span>
                  {!!facts.tags?.length && (
                    <span className="flex flex-wrap gap-1 pt-0.5">
                      {facts.tags.map((t) => (
                        <span key={t} className="border border-white/10 px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>

      {file.verdict && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + file.evidence.length * 0.11 }} className="space-y-2">
          <h3 className="sys-heading">Verdict</h3>
          <p className="text-[15px] leading-relaxed text-foreground/85">{file.verdict}</p>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${player.links.email}?subject=${encodeURIComponent(file.title)}`} data-active="true" className="hud-chip px-4 py-2.5 text-sm">
          <Mail className="size-4" /> Reach {player.handle}
        </a>
        <button type="button" onClick={share} className="hud-chip px-4 py-2.5 text-sm">
          <Link2 className="size-4" /> {copied ? "Link copied" : "Share this case"}
        </button>
        <a href="/cv.pdf" download="bouarour-ayoub-cv.pdf" className="hud-chip px-4 py-2.5 text-sm">
          <Download className="size-4" /> CV
        </a>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/60">
        Assembled by THE SYSTEM for this question. The facts on each card are the record&apos;s; the lines in italics are the System&apos;s reading of them and can be wrong.
      </p>
    </div>
  );
}
