"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, CircleDot, Flame, GitCommitHorizontal, GitMerge, GitPullRequest, Trophy } from "lucide-react";
import { GithubMark } from "@/components/system/brand-marks";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import { bestDay, byWeekday, levels, streaks, weeks, type Activity, type Day } from "@/github/activity";
import { ago } from "@/github/format";
import { loadActivity, useActivity } from "@/github/load-activity";
import { play } from "@/lib/audio";

/**
 * ── MY GITHUB ───────────────────────────────────────────────────
 * My GitHub activity, live: the year's calendar, what it is made of,
 * the streaks, my week, the years, the languages and where the
 * commits went. One view for the home page's window and the
 * interview's table; its own glass, sized by its container.
 */

const copy = world.github;
const nf = new Intl.NumberFormat("en-GB");
const n = (v: number) => nf.format(v);
const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const rise = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };

export function GithubActivity() {
  const activity = useActivity((s) => s.activity);
  const failed = useActivity((s) => s.failed);
  useEffect(() => {
    void loadActivity();
  }, []);
  if (activity) return <Loaded a={activity} />;
  return failed ? <Failed /> : <Loading />;
}

function Loading() {
  return (
    <div className="gha" aria-busy>
      <p className="gha-kicker">{copy.loading}</p>
      <div className="gha-skeleton gha-skeleton--num" />
      <div className="gha-skeleton gha-skeleton--cal" />
      <div className="gha-tiles">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="gha-skeleton gha-skeleton--tile" />
        ))}
      </div>
    </div>
  );
}

function Failed() {
  return (
    <div className="gha">
      <p className="gha-lead">{copy.failed}</p>
      <ProfileLink url={player.links.github} />
    </div>
  );
}

function ProfileLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="gha-profile" onClick={() => play("click", { volume: 0.35 })}>
      <GithubMark className="size-4" /> {copy.profile} <ArrowUpRight className="size-3.5" />
    </a>
  );
}

function Loaded({ a }: { a: Activity }) {
  const s = useMemo(() => streaks(a.days), [a.days]);
  const best = useMemo(() => bestDay(a.days), [a.days]);
  const lastYears = a.lifetime.byYear;
  return (
    <motion.div className="gha" variants={stagger} initial="hidden" animate="show">
      <motion.header variants={rise} className="gha-hero">
        <div className="min-w-0">
          <p className="gha-kicker">
            <span className="gha-live" aria-hidden /> {copy.kicker}
          </p>
          <p className="gha-total">
            <Count to={a.year.total} />
          </p>
          <p className="gha-total__label">{copy.lastYear}</p>
        </div>
        <div className="gha-hero__aside">
          <p className="gha-hero__big">{n(a.lifetime.total)}</p>
          <p className="gha-hero__small">{copy.since(a.since.slice(0, 4))}</p>
        </div>
      </motion.header>

      <motion.section variants={rise} className="gha-card">
        <Head title={copy.calendar} />
        <Calendar days={a.days} best={best} />
      </motion.section>

      <motion.div variants={rise} className="gha-tiles">
        <Tile icon={GitCommitHorizontal} label={copy.stats.commits} value={a.year.commits} />
        <Tile icon={GitPullRequest} label={copy.stats.pullRequests} value={a.year.pullRequests} />
        <Tile icon={CircleDot} label={copy.stats.issues} value={a.year.issues} />
        <Tile icon={GitMerge} label={copy.stats.merged} value={a.lifetime.mergedPullRequests} />
      </motion.div>

      <motion.div variants={rise} className="gha-streaks">
        <div className="gha-streak gha-streak--hot">
          <Flame className="gha-streak__icon" />
          <p className="gha-streak__n">{copy.days(s.current)}</p>
          <p className="gha-streak__label">{copy.streak}</p>
        </div>
        <div className="gha-streak">
          <Trophy className="gha-streak__icon" />
          <p className="gha-streak__n">{copy.days(s.longest)}</p>
          <p className="gha-streak__label">
            {copy.longest}
            {s.longestFrom && s.longestTo && <span className="gha-streak__when"> · {shortDate(s.longestFrom)} – {shortDate(s.longestTo)}</span>}
          </p>
        </div>
        <div className="gha-streak">
          <Ring part={s.active / Math.max(1, a.days.length)} />
          <p className="gha-streak__n">
            {n(s.active)} <span className="gha-streak__of">{copy.ofYear(a.days.length)}</span>
          </p>
          <p className="gha-streak__label">{copy.active}</p>
        </div>
      </motion.div>

      <motion.div variants={rise} className="gha-pair">
        <section className="gha-card">
          <Head title={copy.rhythm} />
          <Week days={a.days} />
        </section>
        {lastYears.length > 1 && (
          <section className="gha-card">
            <Head title={copy.years} />
            <Years years={lastYears} />
          </section>
        )}
      </motion.div>

      {a.languages.length > 0 && (
        <motion.section variants={rise} className="gha-card">
          <Head title={copy.languages} note={copy.languagesNote} />
          <Languages langs={a.languages} />
        </motion.section>
      )}

      {a.repositories.length > 0 && (
        <motion.section variants={rise} className="gha-card">
          <Head title={copy.repositories} />
          <Repositories repos={a.repositories} />
        </motion.section>
      )}

      <motion.footer variants={rise} className="gha-foot">
        <ProfileLink url={a.url} />
        <span className="gha-foot__meta">
          {a.year.private > 0 && <>{copy.private(a.year.private)} </>}
          {copy.read(ago(a.readAt, new Date()))}
        </span>
      </motion.footer>
    </motion.div>
  );
}

function Head({ title, note }: { title: string; note?: string }) {
  return (
    <header className="gha-head">
      <h3>{title}</h3>
      {note && <p>{note}</p>}
    </header>
  );
}

/** counts up once, on arrival */
function Count({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const ms = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = ms ? Math.min(1, (t - t0) / ms) : 1;
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n(v)}</>;
}

function Tile({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: number }) {
  return (
    <div className="gha-tile">
      <Icon className="gha-tile__icon" strokeWidth={1.8} />
      <p className="gha-tile__n">{n(value)}</p>
      <p className="gha-tile__label">{label}</p>
    </div>
  );
}

function Ring({ part }: { part: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className="gha-streak__icon gha-ring" aria-hidden>
      <circle cx="12" cy="12" r={r} className="gha-ring__track" />
      <motion.circle cx="12" cy="12" r={r} className="gha-ring__arc" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - part) }} transition={{ duration: 1, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }} />
    </svg>
  );
}

// ── the calendar ──

const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 18;

function Calendar({ days, best }: { days: Day[]; best?: Day }) {
  const cols = useMemo(() => weeks(days), [days]);
  const level = useMemo(() => levels(days), [days]);
  const [hover, setHover] = useState<Day | null>(null);
  const months = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    let last = -1;
    cols.forEach((w, i) => {
      const first = w.find(Boolean);
      if (!first) return;
      const m = Number(first.date.slice(5, 7));
      if (m !== last) {
        last = m;
        // a month that starts in the last two columns has no room for its name
        if (i < cols.length - 2) out.push({ x: LEFT + i * STEP, label: new Date(`${first.date}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) });
      }
    });
    // the first column often holds the tail of a month: its name would crowd the next one
    if (out.length > 1 && out[1].x - out[0].x < STEP * 3) out.shift();
    return out;
  }, [cols]);
  const shown = hover ?? best;
  const width = LEFT + cols.length * STEP - GAP;
  const height = TOP + 7 * STEP - GAP;
  return (
    <div className="gha-cal">
      <div className="gha-cal__scroll">
        <svg viewBox={`0 0 ${width} ${height}`} className="gha-cal__svg" role="img" aria-label={`${copy.calendar}: ${days.reduce((t, d) => t + d.count, 0)} contributions`} onPointerLeave={() => setHover(null)}>
          {months.map((m) => (
            <text key={m.x} x={m.x} y={10} className="gha-cal__month">
              {m.label}
            </text>
          ))}
          {[1, 3, 5].map((row) => (
            <text key={row} x={0} y={TOP + row * STEP + CELL - 1.5} className="gha-cal__day">
              {copy.weekdays[(row + 6) % 7]}
            </text>
          ))}
          {cols.map((w, i) =>
            w.map((d, j) =>
              d ? (
                <rect
                  key={d.date}
                  x={LEFT + i * STEP}
                  y={TOP + j * STEP}
                  width={CELL}
                  height={CELL}
                  rx={2.6}
                  className="gha-cell"
                  data-l={level(d.count)}
                  data-on={shown?.date === d.date || undefined}
                  style={{ "--i": i } as CSSProperties}
                  onPointerEnter={() => setHover(d)}
                  onPointerDown={() => setHover(d)}
                >
                  <title>{`${longDate(d.date)} · ${d.count ? copy.on(d.count) : copy.none}`}</title>
                </rect>
              ) : null,
            ),
          )}
        </svg>
      </div>
      <div className="gha-cal__foot">
        <p className="gha-cal__said" aria-live="polite">
          {shown && (
            <>
              {!hover && <span className="gha-cal__tag">{copy.best}</span>}
              <strong>{shown.count ? copy.on(shown.count) : copy.none}</strong> · {longDate(shown.date)}
            </>
          )}
        </p>
        <span className="gha-legend" aria-hidden>
          {copy.less}
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className="gha-cell gha-legend__cell" data-l={l} />
          ))}
          {copy.more}
        </span>
      </div>
    </div>
  );
}

// ── my week, my years ──

function Week({ days }: { days: Day[] }) {
  const sums = useMemo(() => byWeekday(days), [days]);
  const max = Math.max(1, ...sums);
  const top = sums.indexOf(max);
  return (
    <div className="gha-bars" role="list">
      {sums.map((v, i) => (
        <div key={i} className="gha-bar" role="listitem" aria-label={`${copy.weekdays[i]}: ${v}`} data-top={i === top || undefined}>
          <span className="gha-bar__n">{n(v)}</span>
          <span className="gha-bar__track">
            <motion.span className="gha-bar__fill" initial={{ scaleY: 0 }} animate={{ scaleY: v / max }} transition={{ duration: 0.7, delay: 0.15 + i * 0.04, ease: [0.2, 0.8, 0.2, 1] }} />
          </span>
          <span className="gha-bar__label">{copy.weekdays[i].slice(0, 2)}</span>
        </div>
      ))}
    </div>
  );
}

function Years({ years }: { years: Activity["lifetime"]["byYear"] }) {
  const max = Math.max(1, ...years.map((y) => y.total));
  const top = years.reduce((b, y) => (y.total > b.total ? y : b), years[0]);
  return (
    <div className="gha-bars" role="list">
      {years.map((y, i) => (
        <div key={y.year} className="gha-bar" role="listitem" aria-label={`${y.year}: ${y.total}`} data-top={y === top || undefined}>
          <span className="gha-bar__n">{n(y.total)}</span>
          <span className="gha-bar__track">
            <motion.span className="gha-bar__fill" initial={{ scaleY: 0 }} animate={{ scaleY: y.total / max }} transition={{ duration: 0.7, delay: 0.15 + i * 0.04, ease: [0.2, 0.8, 0.2, 1] }} />
          </span>
          <span className="gha-bar__label">’{String(y.year).slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ── languages, repositories ──

const pct = (share: number) => (share >= 0.095 ? `${Math.round(share * 100)}%` : `${(share * 100).toFixed(1)}%`);

function Languages({ langs }: { langs: Activity["languages"] }) {
  return (
    <>
      <div className="gha-langbar" aria-hidden>
        {langs.map((l, i) => (
          <motion.span
            key={l.name}
            style={{ background: l.color, flexGrow: l.share }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
          />
        ))}
      </div>
      <ul className="gha-langs">
        {langs.map((l) => (
          <li key={l.name}>
            <i style={{ background: l.color }} aria-hidden />
            <span className="gha-langs__name">{l.name}</span>
            <span className="gha-langs__pct">{pct(l.share)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Repositories({ repos }: { repos: Activity["repositories"] }) {
  const max = Math.max(1, ...repos.map((r) => r.commits));
  return (
    <ul className="gha-repos">
      {repos.map((r) => {
        const [owner, name] = r.name.split("/");
        return (
          <li key={r.name}>
            <a href={r.url} target="_blank" rel="noreferrer" className="gha-repo" onClick={() => play("click", { volume: 0.35 })}>
              <span className="min-w-0 flex-1">
                <span className="gha-repo__name">
                  <span className="gha-repo__owner">{owner}/</span>
                  {name}
                </span>
                <span className="gha-repo__meter" aria-hidden>
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: r.commits / max }} transition={{ duration: 0.7, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }} />
                </span>
              </span>
              <span className="gha-repo__meta">
                {r.language && (
                  <span className="gha-repo__lang">
                    <i style={{ background: r.color ?? "#8b949e" }} aria-hidden /> {r.language}
                  </span>
                )}
                <span className="gha-repo__n">{copy.commits(r.commits)}</span>
              </span>
              <ArrowUpRight className="gha-repo__go size-3.5" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

