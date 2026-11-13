"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Orbit } from "lucide-react";
import { findGate } from "@/config/gates.config";
import { planets, realm } from "@/config/realm.config";
import { cn } from "@/lib/utils";
import { PlanetArt } from "./planet-art";
import { RankBadge } from "./rank-badge";

// three.js arrives after the page is readable, in its own chunk
const RealmScene = dynamic(() => import("./realm-scene"), { ssr: false });

/** no WebGL, or the scene failed: the page keeps working on its flat art */
class SceneGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const gateOf = planets.map((p) => (p.gate ? findGate(p.gate) : undefined));
const sealed = gateOf.map((g) => g?.state === "sealed");
const names = gateOf.map((g) => g?.name);
const home = planets.findIndex((p) => p.gate && gateOf[planets.indexOf(p)]?.state === "open");

/**
 * The Gate Realm: one star and seven worlds. Each gate is a world;
 * the others are uncharted. Arrow keys, a click, a tap or a swipe
 * travel between them; Enter opens the gate of the selected world.
 * Everything that can be read or followed is HTML: the 3D scene is
 * the view behind it.
 */
export function GateRealm() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(home);
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);

  const list = useRef<HTMLOListElement>(null);
  // on a narrow screen the list scrolls: keep the selected world in view
  useEffect(() => {
    if (selected !== null) list.current?.children[selected + 1]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  const travel = useCallback((step: number) => setSelected((s) => (s === null ? (step > 0 ? 0 : planets.length - 1) : (s + step + planets.length) % planets.length)), []);
  const planet = selected === null ? null : planets[selected];
  const gate = selected === null ? undefined : gateOf[selected];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") travel(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") travel(-1);
      else if (e.key === "Escape") setSelected(null);
      else if (e.key === "Enter" && gate && !(e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement)) router.push(`/gates/${gate.id}`);
      else return;
      if (e.key !== "Enter") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [travel, gate, router]);

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden"
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const from = swipe.current;
        swipe.current = null;
        if (!from || e.pointerType === "mouse") return;
        const dx = e.clientX - from.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - from.y) * 1.5) travel(dx < 0 ? 1 : -1);
      }}
    >
      {/* the flat stand-in: shown until the scene is up, and for good when it cannot run */}
      <div className={cn("pointer-events-none absolute inset-0 transition-opacity duration-1000", ready ? "opacity-0" : "opacity-100")} aria-hidden="true">
        {planet && <PlanetArt planet={planet} dim={!planet.gate} className="absolute top-[4%] left-1/2 size-[min(92vw,56vh)] -translate-x-1/2 sm:top-1/2 sm:left-[68%] sm:size-[min(52vw,78vh)] sm:-translate-y-1/2" />}
      </div>
      <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
        <SceneGuard>
          <RealmScene selected={selected} sealed={sealed} names={names} still={still} onSelect={setSelected} onReady={() => setReady(true)} />
        </SceneGuard>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent sm:bg-gradient-to-r sm:via-background/40" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />

      <header className="pointer-events-none relative z-10 flex items-center justify-between px-5 pt-5 sm:px-[5vw] sm:pt-8">
        <Link href="/" prefetch={false} className="pointer-events-auto flex items-center gap-3" aria-label="codeonym — open the default gate">
          {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB local SVG mark */}
          <img src="/brand/mark-small.svg" alt="" className="size-8" />
          <span className="hidden font-display text-[13px] tracking-[0.34em] text-white sm:inline">CODEONYM</span>
        </Link>
        <nav className="pointer-events-auto flex shrink-0 gap-4 font-mono text-[11px] tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase">
          <Link href="/record" className="plain-link">
            plain record
          </Link>
          <a href="/cv.pdf" className="plain-link">
            cv.pdf
          </a>
        </nav>
      </header>

      <section className="pointer-events-none relative z-10 flex flex-1 flex-col justify-end px-5 pt-[42dvh] pb-4 sm:justify-center sm:px-[5vw] sm:py-10" aria-live="polite">
        <p className="eyebrow mb-4">
          {realm.eyebrow} · {planets.length} worlds · {gateOf.filter(Boolean).length} charted
        </p>
        <div key={selected ?? "realm"} className="pointer-events-auto max-w-xl animate-[gate-in_0.5s_ease-out]">
          {gate && planet ? (
            <>
              <div className="mb-4 flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                <RankBadge rank={gate.rank} className="size-9 text-base" />
                <span>Rank {gate.rank}</span>
                <span>·</span>
                <span className={gate.state === "sealed" ? "text-rank-s" : "text-system"}>{gate.state === "sealed" ? "Sealed" : "Open"}</span>
                <span>·</span>
                <span>{gate.cost}</span>
              </div>
              <h1 className="font-serif text-5xl leading-[0.95] text-balance text-white sm:text-8xl">{gate.name}</h1>
              <p className="mt-4 font-serif text-xl leading-snug text-foreground/90 italic sm:text-2xl">{gate.tagline}</p>
              <p className="mt-3 hidden text-[15px] leading-relaxed text-foreground/75 sm:block">{gate.description}</p>
              <ul className="mt-4 hidden space-y-1.5 text-sm text-foreground/80 sm:block">
                {gate.holds.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <span className="mt-2 size-1 shrink-0 rotate-45 bg-arcane-hot" />
                    {h}
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">For: {gate.audience}</p>
              <Link href={`/gates/${gate.id}`} prefetch={false} data-active={gate.state === "open"} className="hud-chip mt-4 px-6 py-3 font-display text-[11px] tracking-[0.3em]">
                {gate.state === "sealed" ? (
                  <>
                    <Lock className="size-4" /> {realm.seal}
                  </>
                ) : (
                  <>
                    {realm.enter} <ArrowRight className="size-4" />
                  </>
                )}
              </Link>
            </>
          ) : planet ? (
            <>
              <p className="mb-4 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Orbit {String((selected ?? 0) + 1).padStart(2, "0")} · no gate</p>
              <h1 className="font-serif text-5xl leading-[0.95] text-white/70 sm:text-8xl">{realm.uncharted.name}</h1>
              <p className="mt-4 font-serif text-xl leading-snug text-foreground/80 italic sm:text-2xl">{realm.uncharted.tagline}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65 sm:text-[15px]">{realm.uncharted.description}</p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-5xl leading-[0.95] text-balance text-white sm:text-7xl">{realm.title}</h1>
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">{realm.intro}</p>
            </>
          )}
        </div>
      </section>

      <nav className="relative z-10 px-5 pb-6 sm:px-[5vw] sm:pb-9" aria-label="Worlds of the Gate Realm">
        <ol ref={list} className="flex items-end gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
          <li className="shrink-0 self-center pr-2">
            <button type="button" onClick={() => setSelected(null)} aria-pressed={selected === null} data-active={selected === null} className="hud-chip size-11" aria-label={realm.overview} title={realm.overview}>
              <Orbit className="size-4" />
            </button>
          </li>
          {planets.map((p, i) => {
            const g = gateOf[i];
            const active = i === selected;
            return (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => (active && g ? router.push(`/gates/${g.id}`) : setSelected(i))}
                  aria-current={active ? "true" : undefined}
                  aria-label={g ? `${g.name}, rank ${g.rank} gate, ${g.state}` : `${realm.uncharted.name} world, orbit ${i + 1}`}
                  className={cn("group flex w-[4.6rem] flex-col items-center gap-1 border-t pt-2 transition-colors sm:w-24", active ? "border-white/80" : "border-white/10 hover:border-white/40")}
                >
                  <PlanetArt planet={p} dim={!g} className={cn("transition-transform duration-300", active ? "scale-110" : "opacity-75 group-hover:opacity-100")} />
                  <span className={cn("font-mono text-[9px] tracking-[0.14em] whitespace-nowrap uppercase", g ? (active ? "text-white" : "text-foreground/75") : "text-muted-foreground/60")}>
                    {g ? g.name : "· · ·"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 uppercase">
          <span className="hidden sm:inline">{realm.hint}</span>
          <span className="sm:hidden">{realm.touchHint}</span>
        </p>
        {/* every gate as a plain link: for readers that do not run the buttons above */}
        <ul className="sr-only">
          {planets.map((p, i) => gateOf[i] && <li key={p.id}><Link href={`/gates/${gateOf[i]!.id}`} prefetch={false}>{gateOf[i]!.name} — rank {gateOf[i]!.rank} gate, {gateOf[i]!.state}</Link></li>)}
        </ul>
      </nav>
    </div>
  );
}
