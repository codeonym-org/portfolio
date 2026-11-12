import type { Metadata } from "next";
import Link from "next/link";
import { plainHeader, plainSections } from "@/record/plain";

export const metadata: Metadata = {
  title: "The plain record — CODEONYM",
  description: "Bouarour Ayoub (codeonym), AI Agent Engineer: experience, projects, skills and education as plain text. No WebGL, no agent.",
  alternates: { types: { "text/markdown": "/llms.txt" } },
};

/**
 * The record with nothing in the way — server-rendered, readable
 * without JavaScript, printable. The living record at `/` is the
 * same data, argued by an agent.
 */
export default function PlainRecord() {
  const h = plainHeader;
  return (
    <main className="plain mx-auto max-w-[46rem] px-5 pt-10 pb-24 sm:px-8 sm:pt-16">
      <nav className="mb-14 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase print:hidden">
        <Link href="/" className="plain-link">
          ← the living record
        </Link>
        <span className="flex gap-4">
          <a href="/llms.txt" className="plain-link">
            llms.txt
          </a>
          <a href="/cv.pdf" className="plain-link">
            cv.pdf
          </a>
        </span>
      </nav>

      <header className="mb-14">
        <p className="eyebrow mb-4">The plain record</p>
        <h1 className="font-serif text-5xl leading-[1.02] text-balance sm:text-6xl">
          {h.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
          <span className="text-muted-foreground"> — {h.title}</span>
        </h1>
        <p className="mt-5 font-mono text-xs text-muted-foreground">
          {h.handle} · {h.line}
        </p>
        <div className="mt-8 space-y-4 text-[1.05rem] leading-relaxed text-foreground/85">
          {h.profile.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
          {h.links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="plain-link text-foreground">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-xs text-muted-foreground">Languages: {h.languages}</p>
      </header>

      {plainSections.map((section, n) => (
        <section key={section.id} id={section.id} className="mt-16 scroll-mt-8">
          <h2 className="flex items-baseline gap-4 border-b border-white/10 pb-3">
            <span className="font-mono text-[11px] text-arcane-hot">{String(n + 1).padStart(2, "0")}</span>
            <span className="font-serif text-3xl">{section.title}</span>
          </h2>
          {section.note && <p className="mt-3 text-sm text-muted-foreground">{section.note}</p>}
          <div className="mt-2 divide-y divide-white/[0.06]">
            {section.entries.map((e) => (
              <article key={e.id} className="py-6 break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 className="text-lg font-medium">{e.title}</h3>
                  {e.meta && <p className="font-mono text-[11px] text-muted-foreground">{e.meta}</p>}
                </div>
                {e.body && <p className="mt-2 leading-relaxed text-foreground/80">{e.body}</p>}
                {e.points && e.points.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/70">
                    {e.points.map((p) => (
                      <li key={p} className="relative pl-5 before:absolute before:left-0 before:text-arcane-hot before:content-['—']">
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
                {e.tags && e.tags.length > 0 && <p className="mt-3 font-mono text-[11px] leading-6 text-muted-foreground">{e.tags.join("  ·  ")}</p>}
                {e.link && (
                  <a href={e.link} className="plain-link mt-3 inline-block font-mono text-xs text-foreground">
                    {e.link.replace(/^https?:\/\//, "")} ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <footer className="mt-20 border-t border-white/10 pt-6 font-mono text-[11px] leading-6 text-muted-foreground">
        Rendered from the same typed configs as the living record. Nothing here was written by a model.
      </footer>
    </main>
  );
}
