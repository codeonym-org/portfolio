"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import { Check, Copy, Download, Globe, Mail, MapPin, Phone, RotateCw, X } from "lucide-react";
import { GithubMark, LinkedinMark } from "@/components/system/brand-marks";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { familyName, printed, vcard, type CardPerson } from "./vcard";

const copy = world.interview.card;
const SITE = "https://portfolio.codeonym.work";

const person: CardPerson = {
  name: player.name,
  firstName: player.firstName,
  title: player.title,
  brand: player.handle,
  location: player.location,
  email: player.links.email,
  phone: player.links.phone,
  site: SITE,
  github: player.links.github,
  linkedin: player.links.linkedin,
};
const fullName = `${player.firstName} ${familyName(player.name, player.firstName)}`;

const LINES: { icon: ComponentType<{ className?: string }>; label: string; value: string; href?: string }[] = [
  { icon: Mail, label: "Email", value: person.email, href: `mailto:${person.email}` },
  { icon: Phone, label: "Phone", value: person.phone, href: `tel:${person.phone.replace(/\s+/g, "")}` },
  { icon: LinkedinMark, label: "LinkedIn", value: printed(person.linkedin), href: person.linkedin },
  { icon: GithubMark, label: "GitHub", value: printed(person.github), href: person.github },
  { icon: Globe, label: "Record", value: printed(SITE), href: SITE },
  { icon: MapPin, label: "Based in", value: person.location },
];

/**
 * The brand mark, carved: each stroke is cut into the card (a shadow
 * under its upper edge, a lit lip under its lower one), and the
 * brand's own colours lie at the bottom of the cut.
 */
function CarvedMark({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="40 40 432 432" className={className} role="img" aria-label={player.handle}>
      <defs>
        <linearGradient id={`${id}-arc`} gradientUnits="userSpaceOnUse" x1="300" y1="96" x2="300" y2="416">
          <stop offset="0" stopColor="#e3d4ff" />
          <stop offset=".42" stopColor="#9d70ff" />
          <stop offset=".78" stopColor="#5a7dff" />
          <stop offset="1" stopColor="#3fc8f6" />
        </linearGradient>
        <linearGradient id={`${id}-counter`} gradientUnits="userSpaceOnUse" x1="150" y1="360" x2="360" y2="150">
          <stop offset="0" stopColor="#3fc8f6" />
          <stop offset=".55" stopColor="#7f8dff" />
          <stop offset="1" stopColor="#d9c8ff" />
        </linearGradient>
        <radialGradient id={`${id}-orb`} cx=".38" cy=".34" r=".75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#cfe9ff" />
          <stop offset="1" stopColor="#6fb6ff" />
        </radialGradient>
        <filter id={`${id}-carve`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          {/* the shadow the upper edge throws into the cut */}
          <feComponentTransfer in="SourceAlpha" result="outside">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="outside" stdDeviation="4" />
          <feOffset dx="4" dy="9" result="thrown" />
          <feFlood floodColor="#02020a" floodOpacity="0.95" />
          <feComposite in2="thrown" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="shade" />
          {/* the lip under the cut catches the light */}
          <feOffset in="SourceAlpha" dx="1.4" dy="3" result="lower" />
          <feFlood floodColor="#ffffff" floodOpacity="0.6" />
          <feComposite in2="lower" operator="in" />
          <feComposite in2="SourceAlpha" operator="out" result="lip" />
          {/* the floor of the cut: the brand's colours, dimmed */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="0.34 0 0 0 0  0 0.34 0 0 0  0 0 0.42 0 0  0 0 0 1 0" result="floor" />
          <feMerge>
            <feMergeNode in="lip" />
            <feMergeNode in="floor" />
            <feMergeNode in="shade" />
          </feMerge>
        </filter>
        <filter id={`${id}-glow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <g filter={`url(#${id}-carve)`} fill="none" strokeLinecap="round">
        <path d="M389.96,151.34 A170,170 0 1 0 389.96,360.66" stroke={`url(#${id}-arc)`} strokeWidth="34" />
        <path d="M339.96,98.09 A178.84,178.84 0 0 0 81.07,218.82" stroke="#cfc4ee" strokeWidth="4" />
        <path d="M184.83,347.09 A115.6,115.6 0 1 0 142.93,231.97" stroke={`url(#${id}-counter)`} strokeWidth="12.24" />
        <circle cx="146.06" cy="291.72" r="8.5" fill="#bca4ff" />
        <path d="M256,205 Q263.14,248.86 307,256 Q263.14,263.14 256,307 Q248.86,263.14 205,256 Q248.86,248.86 256,205Z" fill={`url(#${id}-orb)`} />
        <circle cx="426" cy="256" r="28" fill={`url(#${id}-orb)`} />
      </g>
      {/* the one thing not carved: the orb is set in the card, and lit */}
      <circle className="bc-orb" cx="426" cy="256" r="30" fill="#8fd0ff" filter={`url(#${id}-glow)`} />
      <circle cx="426" cy="256" r="15" fill={`url(#${id}-orb)`} opacity="0.9" />
    </svg>
  );
}

function Front({ tall }: { tall: boolean }) {
  return (
    <div className={cn("relative flex size-full items-center", tall ? "flex-col justify-center gap-[calc(var(--u)*5)]" : "gap-[calc(var(--u)*4)] px-[calc(var(--u)*6)]")}>
      <div className="bc-guilloche" aria-hidden />
      <CarvedMark id="bc-front" className={cn("relative shrink-0", tall ? "w-[calc(var(--u)*30)]" : "w-[calc(var(--u)*30)]")} />
      <div className={cn("relative min-w-0", tall && "text-center")}>
        <p className={cn("bc-carved font-display leading-none tracking-[0.16em]", tall ? "text-[calc(var(--u)*4)]" : "text-[calc(var(--u)*4.6)]")}>{player.handle.toUpperCase()}</p>
        <div className={cn("bc-groove my-[calc(var(--u)*2.4)]", tall && "mx-auto")} />
        <p className="bc-foil font-mono text-[calc(var(--u)*1.9)] tracking-[0.42em] uppercase">{player.title}</p>
      </div>
      <p className="absolute right-[calc(var(--u)*4)] bottom-[calc(var(--u)*3)] font-mono text-[calc(var(--u)*1.55)] tracking-[0.3em] text-white/40">{printed(SITE)}</p>
    </div>
  );
}

function Back({ tall }: { tall: boolean }) {
  return (
    <div className={cn("relative flex size-full flex-col", tall ? "p-[calc(var(--u)*5)]" : "px-[calc(var(--u)*5.5)] py-[calc(var(--u)*4.5)]")}>
      <div className="flex items-start justify-between gap-[calc(var(--u)*2)]">
        <div className="min-w-0">
          <p className={cn("bc-foil font-display leading-tight tracking-[0.1em] uppercase", tall ? "text-[calc(var(--u)*2.9)]" : "text-[calc(var(--u)*3.7)]")}>{fullName}</p>
          <p className="mt-[calc(var(--u)*1)] font-mono text-[calc(var(--u)*1.8)] tracking-[0.34em] text-[oklch(0.8_0.12_285)] uppercase">{player.title}</p>
        </div>
        <CarvedMark id="bc-back" className="w-[calc(var(--u)*10)] shrink-0" />
      </div>
      <div className="bc-groove my-[calc(var(--u)*3)] !w-full" />
      <ul className={cn("grid flex-1 content-center gap-x-[calc(var(--u)*3)] gap-y-[calc(var(--u)*2.6)]", tall ? "grid-cols-1" : "grid-cols-2")}>
        {LINES.map(({ icon: Icon, label, value, href }) => {
          const body = (
            <>
              <span className="bc-well grid size-[calc(var(--u)*5)] shrink-0 place-items-center rounded-full">
                <Icon className="size-[calc(var(--u)*2.3)]" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[calc(var(--u)*1.35)] tracking-[0.32em] text-white/40 uppercase">{label}</span>
                <span className="block truncate font-mono text-[calc(var(--u)*2.25)] text-white/90">{value}</span>
              </span>
            </>
          );
          const row = "flex items-center gap-[calc(var(--u)*1.8)]";
          return (
            <li key={label} className="min-w-0">
              {href ? (
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(row, "rounded-full outline-none transition-[filter] hover:brightness-150 focus-visible:ring-1 focus-visible:ring-white/60")}
                >
                  {body}
                </a>
              ) : (
                <span className={row}>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stage({ close }: { close: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tall, setTall] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const tiltX = useSpring(0, { stiffness: 140, damping: 16 });
  const tiltY = useSpring(0, { stiffness: 140, damping: 16 });
  const turn = useSpring(0, { stiffness: 80, damping: 13 });
  const rotateY = useTransform(() => tiltY.get() + turn.get());

  useEffect(() => {
    const sync = () => setTall(window.innerWidth < 640);
    sync();
    window.addEventListener("resize", sync);
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // after the other Escape handlers have seen that the card is still up, so only the card leaves
      if (e.key === "Escape") window.setTimeout(close, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  const flip = () => {
    play("click", { volume: 0.45 });
    setFlipped((f) => {
      turn.set(f ? 0 : 180);
      return !f;
    });
  };

  // the card leans toward the pointer, and the light on it follows
  const lean = (e: ReactPointerEvent) => {
    const el = card.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = Math.max(-1.4, Math.min(1.4, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const y = Math.max(-1.4, Math.min(1.4, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    tiltY.set(x * 13);
    tiltX.set(-y * 11);
    el.style.setProperty("--px", `${50 + x * 36}%`);
    el.style.setProperty("--py", `${50 + y * 36}%`);
  };
  const rest = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  const save = () => {
    play("confirm", { volume: 0.4 });
    const url = URL.createObjectURL(new Blob([vcard(person)], { type: "text/vcard" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${player.handle}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
      play("confirm", { volume: 0.4 });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // no clipboard here: the address is on the card
    }
  };


  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={copy.label}
      className="bc-room fixed inset-0 z-[60] flex flex-col items-center justify-center gap-7 overflow-hidden px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      onPointerMove={lean}
      onPointerLeave={rest}
    >
      <button type="button" aria-label={copy.close} tabIndex={-1} className="absolute inset-0 cursor-default" onClick={close} />

      <div className="pointer-events-none relative" style={{ perspective: 1400 }}>
        {/* handed over: it comes up from the desk, spinning, and settles */}
        <motion.div
          style={{ transformStyle: "preserve-3d" }}
          initial={{ y: "55vh", rotateX: 78, rotateZ: -28, rotateY: -200, scale: 0.25 }}
          animate={{ y: 0, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 1 }}
          exit={{ y: "55vh", rotateX: 70, rotateZ: 20, scale: 0.3, transition: { duration: 0.3, ease: "easeIn" } }}
          transition={{ type: "spring", stiffness: 95, damping: 15, mass: 0.9 }}
        >
          <div className="bc-idle" style={{ transformStyle: "preserve-3d" }}>
            <motion.div
              ref={card}
              onClick={flip}
              title={copy.hint}
              className={cn("bc pointer-events-auto relative cursor-pointer", tall ? "bc-tall w-[min(300px,78vw)]" : "w-[min(580px,92vw)]")}
              style={{ rotateX: tiltX, rotateY, transformStyle: "preserve-3d" }}
              whileTap={{ scale: 0.985 }}
            >
              <div className="bc-face" inert={flipped} aria-hidden={flipped}>
                <Front tall={tall} />
              </div>
              <div className="bc-face bc-back" inert={!flipped} aria-hidden={!flipped}>
                <Back tall={tall} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <motion.div className="hud pointer-events-auto relative !h-auto max-w-full flex-wrap justify-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.55 } }} exit={{ opacity: 0 }}>
        <button ref={first} type="button" onClick={flip} aria-pressed={flipped} className="hud-btn" style={{ ["--tone" as string]: "oklch(0.8 0.14 300)" }}>
          <RotateCw className={cn("transition-transform duration-500", flipped && "rotate-180")} />
          <span className="hud-label">{copy.flip}</span>
        </button>
        <button type="button" onClick={save} className="hud-btn">
          <Download />
          <span className="hud-label">{copy.save}</span>
        </button>
        <button type="button" onClick={copyEmail} className="hud-btn">
          {copied ? <Check className="text-[oklch(0.85_0.16_160)]" /> : <Copy />}
          <span className="hud-label" aria-live="polite">
            {copied ? copy.copied : copy.copy}
          </span>
        </button>
        <span className="hud-sep" aria-hidden />
        <button type="button" onClick={close} aria-label={copy.close} title={copy.close} className="hud-btn">
          <X />
        </button>
      </motion.div>
      <p className="pointer-events-none relative -mt-3 text-[11.5px] text-white/40">{copy.hint}</p>
    </motion.div>
  );
}

/**
 * ── HIS BUSINESS CARD ─────────────────────────────────────────
 * A card of dark brushed metal, handed across the desk. On its face
 * the brand's mark is carved into the metal, beside the name
 * codeonym; on its back, his name and every way to reach him. It
 * leans toward the pointer and the light slides over it; pressing it
 * turns it over. Under it: turn it, save it as a contact (a vCard),
 * copy the address, put it down. The stranger takes it from the top
 * bar of the interview or of the record, and the agent hands it over when asked how
 * to reach him (`show_business_card`).
 */
export function BusinessCard() {
  const open = useWorldStore((s) => s.cardOpen);
  const close = useCallback(() => {
    play("close", { volume: 0.4 });
    useWorldStore.getState().setCardOpen(false);
  }, []);
  return <AnimatePresence>{open && <Stage close={close} />}</AnimatePresence>;
}
