import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { PlanetArt } from "@/components/gates/planet-art";
import { RankBadge } from "@/components/gates/rank-badge";
import { ErebusLoader } from "@/components/erebus/erebus-loader";
import { FirstLightGate } from "@/components/gates/first-light-gate";
import { defaultGate, findGate, gates } from "@/config/gates.config";
import { planetOfGate } from "@/config/realm.config";

type Props = { params: Promise<{ gate: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => gates.map((g) => ({ gate: g.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const gate = findGate((await params).gate);
  if (!gate) return {};
  return {
    title: `${gate.name} — rank ${gate.rank} gate — CODEONYM`,
    description: `${gate.tagline} ${gate.description}`,
    // the default gate also lives at `/`: one address for search engines
    alternates: gate.id === defaultGate.id ? { canonical: "/" } : undefined,
  };
}

export default async function GatePage({ params }: Props) {
  const gate = findGate((await params).gate);
  if (!gate) notFound();
  if (gate.state === "open") return gate.id === "erebus" ? <ErebusLoader /> : <FirstLightGate />;
  const planet = planetOfGate(gate.id);

  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {planet && <PlanetArt planet={planet} className="pointer-events-none absolute top-1/2 left-1/2 size-[min(130vw,120vh)] -translate-1/2 opacity-40" />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,var(--background)_78%)]" />
      <div className="relative z-10 max-w-xl">
        <div className="mx-auto mb-7 grid size-20 place-items-center border border-rank-s/60 bg-black/50 text-rank-s shadow-[0_0_50px_oklch(0.8_0.15_80/0.35)]">
          <Lock className="size-8" />
        </div>
        <p className="eyebrow mb-4 flex items-center justify-center gap-3">
          <RankBadge rank={gate.rank} className="size-7 text-xs" /> Rank {gate.rank} gate · sealed
        </p>
        <h1 className="font-serif text-6xl leading-none text-white sm:text-8xl">{gate.name}</h1>
        <p className="mt-5 font-serif text-2xl leading-snug text-foreground/90 italic">{gate.tagline}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-foreground/75">{gate.description}</p>
        <ul className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
          {gate.holds.map((h) => (
            <li key={h} className="border border-white/15 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              {h}
            </li>
          ))}
        </ul>
        <p className="mt-8 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          This gate is not open yet. Everything it will hold is already in the record.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/gates/${defaultGate.id}`} prefetch={false} data-active="true" className="hud-chip px-5 py-2.5 font-display text-[10px] tracking-[0.3em]">
            ENTER {defaultGate.name.toUpperCase()}
          </Link>
          <Link href="/gates" className="hud-chip px-5 py-2.5 text-sm">
            <ArrowLeft className="size-4" /> The Gate Realm
          </Link>
        </div>
      </div>
    </main>
  );
}
