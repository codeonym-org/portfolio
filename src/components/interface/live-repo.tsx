"use client";

import { useEffect, useState } from "react";
import { GitCommitHorizontal, Radio, Tag } from "lucide-react";
import { ago, type RepoLive } from "@/github/format";

/**
 * What GitHub says about a project right now, under its inspect card.
 * Shows nothing until the answer arrives, and nothing at all if GitHub
 * does not answer: the record above it still holds.
 */
export function LiveRepo({ id }: { id: string }) {
  const [live, setLive] = useState<RepoLive | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/github/${id}`, { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RepoLive | null) => setLive(data))
      .catch(() => {});
    return () => abort.abort();
  }, [id]);
  if (!live) return null;
  const now = new Date();
  return (
    <section className="border border-system/25 bg-system/[0.04] px-3.5 py-3" aria-label="Live from GitHub">
      <p className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-system uppercase">
        <Radio className="size-3.5 animate-pulse" /> Live from GitHub
      </p>
      <ul className="space-y-1.5 text-[13px] text-foreground/80">
        <li className="flex items-start gap-2">
          <Tag className="mt-0.5 size-3.5 shrink-0 text-rank-s" />
          {live.release ? (
            <span>
              Latest release{" "}
              <a href={live.release.url} target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-white/30 underline-offset-2">
                {live.release.tag}
              </a>{" "}
              · {ago(live.release.publishedAt, now)}
            </span>
          ) : (
            <span>No release published yet</span>
          )}
        </li>
        {live.commits.map((c) => (
          <li key={c.date + c.message} className="flex items-start gap-2">
            <GitCommitHorizontal className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="break-words">{c.message}</span> <span className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">· {ago(c.date, now)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        {[live.language, live.license, `${live.openIssues} open issues`].filter(Boolean).join(" · ")}
      </p>
    </section>
  );
}
