/* eslint-disable jsx-a11y/alt-text -- react-pdf's Image is drawn into the PDF and takes no alt */
import { Circle, Defs, Document, Font, G, Image, LinearGradient, Link, Page, Path, RadialGradient, Rect, Stop, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import type { Block, Exchange, Run, Transcript } from "./transcript";
import { familyName } from "./vcard";

/**
 * ── THE TRANSCRIPT, PRINTED ───────────────────────────────────
 * The interview as an A4 document the stranger keeps: a dark cover
 * with my name, the facts of the conversation (when, how long, how
 * many questions) and its contents, each line a link to its question;
 * my CV a click away; then every exchange, numbered and timed, my
 * answer set in a serif under the question, with what I showed and the
 * steps I took, and an index of everything shown; last, a page of every
 * way to reach me and my business card at its real size, both faces.
 * Arabic is set right to left in Plex Sans Arabic. A running header and
 * a page count on every page after the cover. Loaded only when a
 * transcript is asked for.
 */

const FULL_NAME = `${player.firstName} ${familyName(player.name, player.firstName)}`;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.codeonym.work").replace(/\/$/, "");
/** on the cover with the facts, or on a page of their own when there are many */
const CONTENTS_ON_COVER = 11;
/** Arabic has no Plex Serif or Mono: every face falls back to Plex Sans Arabic, glyph by glyph */
const SANS = ["Plex Sans", "Plex Arabic"];
const SERIF = ["Plex Serif", "Plex Arabic"];
const MONO = ["Plex Mono", "Plex Arabic"];
/** the last page's dark band */
const BAND_H = 250;
/** the business card at its real size: ISO ID-1, 85.6 × 54 mm */
const CARD_W = 242.6;
const CARD_H = 153;
/** the card's own unit (1% of its width), as on the site */
const u = CARD_W / 100;

const c = {
  ink: "#0E0C19",
  ink2: "#191530",
  text: "#18161F",
  body: "#33303F",
  muted: "#77738A",
  faint: "#A7A3B6",
  hair: "#E6E3EE",
  paper: "#FFFFFF",
  violet: "#6544F0",
  lilac: "#B7A2FF",
  violetSoft: "#F3F0FF",
  violetLine: "#D9CFFF",
  cyan: "#1597C4",
  cyanSoft: "#E5F5FB",
};

let registered = "";
/** the type, from the site itself: IBM Plex (SIL Open Font Licence, `public/transcript/OFL.txt`) */
export function registerFonts(base: string) {
  if (registered === base) return;
  registered = base;
  const f = (file: string) => `${base}/transcript/${file}.ttf`;
  Font.register({
    family: "Plex Sans",
    fonts: [
      { src: f("IBMPlexSans-Regular"), fontWeight: 400 },
      { src: f("IBMPlexSans-Italic"), fontWeight: 400, fontStyle: "italic" },
      { src: f("IBMPlexSans-Medium"), fontWeight: 500 },
      { src: f("IBMPlexSans-SemiBold"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Plex Serif",
    fonts: [
      { src: f("IBMPlexSerif-Light"), fontWeight: 300 },
      { src: f("IBMPlexSerif-LightItalic"), fontWeight: 300, fontStyle: "italic" },
      { src: f("IBMPlexSerif-Regular"), fontWeight: 400 },
      { src: f("IBMPlexSerif-Italic"), fontWeight: 400, fontStyle: "italic" },
      { src: f("IBMPlexSerif-SemiBold"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Plex Arabic",
    fonts: (["Light", "Regular", "Medium", "SemiBold"] as const).flatMap((w, i) =>
      (["normal", "italic"] as const).map((fontStyle) => ({ src: f(`IBMPlexSansArabic-${w}`), fontWeight: 300 + i * 100, fontStyle })),
    ),
  });
  Font.register({ family: "Michroma", src: f("Michroma") });
  Font.register({
    family: "Plex Mono",
    fonts: [
      { src: f("IBMPlexMono-Regular"), fontWeight: 400 },
      { src: f("IBMPlexMono-Medium"), fontWeight: 500 },
    ],
  });
  // words are never cut across lines
  Font.registerHyphenationCallback((word) => [word]);
}

const s = StyleSheet.create({
  // ── cover ──
  cover: { backgroundColor: c.paper, fontFamily: SANS, color: c.text },
  band: { height: 336, backgroundColor: c.ink, paddingHorizontal: 56, paddingTop: 46, paddingBottom: 40, position: "relative", justifyContent: "space-between" },
  bandTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 138, height: 37 },
  kicker: { fontFamily: MONO, fontSize: 7, letterSpacing: 2.2, color: c.lilac, textAlign: "right" },
  ref: { fontFamily: MONO, fontSize: 7, letterSpacing: 1.4, color: "rgba(255,255,255,0.5)", textAlign: "right", marginTop: 5 },
  eyebrow: { fontFamily: MONO, fontSize: 7.5, letterSpacing: 2.6, color: c.lilac, marginBottom: 10 },
  name: { fontFamily: SERIF, fontWeight: 300, fontSize: 44, color: "#FFFFFF", letterSpacing: -0.6, lineHeight: 1.05 },
  who: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  face: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(183,162,255,0.6)", marginRight: 10 },
  role: { fontSize: 10, color: "rgba(255,255,255,0.86)", fontWeight: 500 },
  place: { fontSize: 8.5, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  sheet: { paddingHorizontal: 56, paddingTop: 30 },
  facts: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: c.text },
  fact: { width: "33.33%", paddingTop: 11, paddingBottom: 12, paddingRight: 10, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  label: { fontFamily: MONO, fontSize: 6.6, letterSpacing: 1.8, color: c.muted, marginBottom: 4 },
  value: { fontSize: 10.5, fontWeight: 500, color: c.text },
  valueSub: { fontSize: 8, color: c.muted, marginTop: 2 },
  preface: { fontFamily: SERIF, fontWeight: 300, fontStyle: "italic", fontSize: 11, lineHeight: 1.55, color: c.body, marginTop: 22, maxWidth: 400 },

  coverFoot: { position: "absolute", left: 56, right: 56, bottom: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 0.6, borderTopColor: c.hair, paddingTop: 9 },
  footNote: { fontSize: 6.8, color: c.faint, maxWidth: 330, lineHeight: 1.45 },
  footMono: { fontFamily: MONO, fontSize: 6.6, letterSpacing: 1.2, color: c.faint },

  // ── contents ──
  contents: { marginTop: 26 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontFamily: SERIF, fontWeight: 300, fontSize: 19, color: c.text, letterSpacing: -0.2 },
  row: { flexDirection: "row", alignItems: "flex-end", paddingVertical: 4.2, textDecoration: "none" },
  rowN: { fontFamily: MONO, fontSize: 7.5, fontWeight: 500, color: c.violet, width: 24 },
  rowQ: { fontSize: 9, color: c.text, maxWidth: 330, maxLines: 1, textOverflow: "ellipsis" },
  leader: { flexGrow: 1, borderBottomWidth: 0.7, borderBottomColor: c.faint, borderBottomStyle: "dotted", marginHorizontal: 6, marginBottom: 2.5 },
  rowT: { fontFamily: MONO, fontSize: 7.2, color: c.muted },

  // ── the conversation ──
  page: { backgroundColor: c.paper, fontFamily: SANS, color: c.text, paddingTop: 80, paddingBottom: 66, paddingHorizontal: 56 },
  head: { position: "absolute", top: 30, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 9, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  headBrand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 11, height: 11, marginRight: 6 },
  headText: { fontFamily: MONO, fontSize: 6.6, letterSpacing: 1.8, color: c.muted },
  foot: { position: "absolute", left: 56, right: 56, bottom: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  pageN: { fontFamily: MONO, fontSize: 7, letterSpacing: 1.2, color: c.text },

  intro: { marginBottom: 6 },
  introLine: { fontFamily: MONO, fontSize: 6.8, letterSpacing: 1.8, color: c.muted, marginTop: 6 },

  day: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 2 },
  dayRule: { flexGrow: 1, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  dayText: { fontFamily: MONO, fontSize: 6.8, letterSpacing: 2, color: c.violet, marginHorizontal: 10 },

  exchange: { paddingTop: 18, paddingBottom: 6 },
  rule: { borderTopWidth: 0.6, borderTopColor: c.hair },
  qRow: { flexDirection: "row" },
  num: { width: 52, fontFamily: SERIF, fontWeight: 300, fontSize: 28, color: c.violet, lineHeight: 1, marginTop: -2 },
  qCol: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  metaText: { fontFamily: MONO, fontSize: 6.8, letterSpacing: 1.1, color: c.muted },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: c.faint, marginHorizontal: 6 },
  chip: { borderRadius: 2, paddingHorizontal: 4.5, paddingTop: 1.6, paddingBottom: 1.2, marginLeft: 8 },
  chipText: { fontFamily: MONO, fontSize: 5.8, letterSpacing: 1.4, fontWeight: 500 },
  question: { fontSize: 12, fontWeight: 600, lineHeight: 1.38, color: c.text },

  answer: { marginLeft: 52, marginTop: 10 },
  by: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  byFace: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  byText: { fontFamily: MONO, fontSize: 6.6, letterSpacing: 1.6, color: c.violet },
  byWait: { fontFamily: MONO, fontSize: 6.6, letterSpacing: 0.6, color: c.faint, marginLeft: 6 },
  said: { borderLeftWidth: 1.4, borderLeftColor: c.violetLine, paddingLeft: 12 },
  saidRtl: { borderLeftWidth: 0, paddingLeft: 0, borderRightWidth: 1.4, borderRightColor: c.violetLine, paddingRight: 12 },
  p: { fontFamily: SERIF, fontSize: 10.2, lineHeight: 1.62, color: c.body, marginBottom: 5 },
  item: { flexDirection: "row", marginBottom: 3 },
  marker: { width: 14, fontFamily: SERIF, fontSize: 10.2, lineHeight: 1.62, color: c.violet },
  itemText: { flex: 1, fontFamily: SERIF, fontSize: 10.2, lineHeight: 1.62, color: c.body },
  subhead: { fontFamily: MONO, fontSize: 7, letterSpacing: 1.8, color: c.violet, marginTop: 4, marginBottom: 4 },
  none: { fontFamily: SERIF, fontStyle: "italic", fontWeight: 300, fontSize: 10, color: c.muted },
  code: { fontFamily: MONO, fontSize: 9, color: c.violet },
  link: { color: c.violet, textDecoration: "underline" },

  extra: { flexDirection: "row", marginTop: 8, marginLeft: 13.4, alignItems: "flex-start" },
  extraLabel: { width: 46, fontFamily: MONO, fontSize: 6.2, letterSpacing: 1.5, color: c.faint, paddingTop: 2.4 },
  pills: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  pill: { backgroundColor: c.violetSoft, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2.4, marginRight: 4, marginBottom: 4 },
  pillText: { fontSize: 7.4, color: c.violet, fontWeight: 500 },
  did: { flex: 1, fontSize: 7.8, color: c.muted, lineHeight: 1.45 },

  // ── on the cover: the CV ──
  cv: { position: "absolute", right: 56, bottom: 40, alignItems: "flex-end" },
  cvPill: { flexDirection: "row", alignItems: "center", borderWidth: 0.8, borderColor: "rgba(183,162,255,0.55)", backgroundColor: "rgba(101,68,240,0.18)", borderRadius: 11, paddingHorizontal: 11, paddingTop: 5.6, paddingBottom: 5, textDecoration: "none" },
  cvText: { fontFamily: MONO, fontSize: 7, letterSpacing: 1.8, color: "#FFFFFF", fontWeight: 500 },
  cvArrow: { fontFamily: MONO, fontSize: 8, color: c.lilac, marginLeft: 6 },
  cvSub: { fontFamily: MONO, fontSize: 6, letterSpacing: 0.8, color: "rgba(255,255,255,0.42)", marginTop: 5 },

  // ── everything I showed ──
  shownSec: { marginTop: 30, paddingTop: 18, borderTopWidth: 1, borderTopColor: c.text },
  shownRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  shownKind: { width: 70, fontFamily: MONO, fontSize: 6.4, letterSpacing: 1.5, color: c.muted },
  shownName: { flex: 1, fontSize: 9.2, color: c.text, fontWeight: 500 },
  shownIn: { flexDirection: "row" },
  shownQ: { fontFamily: MONO, fontSize: 7, fontWeight: 500, color: c.violet, backgroundColor: c.violetSoft, borderRadius: 2, paddingHorizontal: 4, paddingTop: 1.6, paddingBottom: 1.2, marginLeft: 3, textDecoration: "none" },

  // ── the last page ──
  last: { backgroundColor: c.paper, fontFamily: SANS, color: c.text, paddingBottom: 66 },
  lastBand: { height: BAND_H, backgroundColor: c.ink, paddingHorizontal: 56, paddingTop: 52, position: "relative" },
  lastTitle: { fontFamily: SERIF, fontWeight: 300, fontSize: 30, color: "#FFFFFF", letterSpacing: -0.4, lineHeight: 1.1, marginTop: 4 },
  lastText: { fontSize: 9.4, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginTop: 10, maxWidth: 380 },
  actions: { flexDirection: "row", marginTop: 24 },
  act: { flexDirection: "row", alignItems: "center", borderRadius: 13, paddingHorizontal: 13, paddingTop: 7, paddingBottom: 6.4, marginRight: 8, textDecoration: "none" },
  actText: { fontFamily: MONO, fontSize: 7.2, letterSpacing: 1.6, fontWeight: 500 },
  sign: { position: "absolute", right: 56, bottom: 34, fontFamily: SERIF, fontWeight: 300, fontStyle: "italic", fontSize: 14, color: c.lilac },
  signRole: { position: "absolute", right: 56, bottom: 22, fontFamily: MONO, fontSize: 6, letterSpacing: 1.6, color: "rgba(255,255,255,0.42)" },

  lastSheet: { paddingHorizontal: 56, paddingTop: 26 },
  links: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: c.text },
  linkTile: { width: "50%", flexDirection: "row", alignItems: "flex-start", paddingTop: 9, paddingBottom: 9, paddingRight: 14, borderBottomWidth: 0.6, borderBottomColor: c.hair, textDecoration: "none" },
  linkN: { width: 20, fontFamily: MONO, fontSize: 6.4, color: c.faint, paddingTop: 1.4 },
  linkLabel: { fontFamily: MONO, fontSize: 6.4, letterSpacing: 1.6, color: c.violet, marginBottom: 2.6 },
  linkValue: { fontSize: 9.2, color: c.text, fontWeight: 500 },
  linkSub: { fontSize: 7.4, color: c.muted, marginTop: 1.6 },

  cards: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: -6, marginTop: 14 },
  cardWrap: { width: CARD_W, alignItems: "center" },
  cardCap: { fontFamily: MONO, fontSize: 6, letterSpacing: 1.6, color: c.faint, marginTop: 11 },

  // ── the card itself, measured in its own unit like the site's ──
  card: { width: CARD_W, height: CARD_H, position: "relative", borderRadius: 2.6 * u, overflow: "hidden", backgroundColor: "#15121F" },
  cardImg: { position: "absolute", top: 0, left: 0, width: CARD_W, height: CARD_H },
  carved: { fontFamily: "Michroma", fontSize: 4.6 * u, letterSpacing: 0.16 * 4.6 * u, color: "#07060C", lineHeight: 1 },
  groove: { height: 0.36 * u, borderRadius: 1, backgroundColor: "rgba(0,0,0,0.75)", borderBottomWidth: 0.16 * u, borderBottomColor: "rgba(255,255,255,0.2)" },
  foilTitle: { fontFamily: MONO, fontSize: 1.9 * u, letterSpacing: 0.42 * 1.9 * u, color: "#DAD6EA" },
  cardSite: { position: "absolute", right: 4 * u, bottom: 3 * u, fontFamily: MONO, fontSize: 1.55 * u, letterSpacing: 0.3 * 1.55 * u, color: "rgba(255,255,255,0.4)", textDecoration: "none" },
  backName: { fontFamily: "Michroma", fontSize: 3.7 * u, letterSpacing: 0.1 * 3.7 * u, color: "#ECE8F7", lineHeight: 1.2 },
  backTitle: { fontFamily: MONO, fontSize: 1.8 * u, letterSpacing: 0.34 * 1.8 * u, color: "#B9A6F5", marginTop: 1 * u },
  lines: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignContent: "center" },
  line: { width: "50%", flexDirection: "row", alignItems: "center", paddingRight: 1.5 * u, marginVertical: 1.3 * u, textDecoration: "none" },
  lineLabel: { fontFamily: MONO, fontSize: 1.35 * u, letterSpacing: 0.32 * 1.35 * u, color: "rgba(255,255,255,0.42)", marginBottom: 0.5 * u },
  lineValue: { fontFamily: MONO, fontSize: 2.15 * u, color: "rgba(255,255,255,0.92)", maxLines: 1, textOverflow: "ellipsis" },
});

function Glow({ width, height, id, line = true, radius = 0 }: { width: number; height: number; id: string; line?: boolean; radius?: number }) {
  return (
    <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <RadialGradient id={`${id}-v`} cx="0.86" cy="0.08" r="0.62">
          <Stop offset="0" stopColor="#7A4DFF" stopOpacity={0.55} />
          <Stop offset="0.55" stopColor="#5A3DE0" stopOpacity={0.14} />
          <Stop offset="1" stopColor="#5A3DE0" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}-c`} cx="0.04" cy="1" r="0.55">
          <Stop offset="0" stopColor="#3FC8F6" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#3FC8F6" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#E3D4FF" />
          <Stop offset="0.45" stopColor="#9D70FF" />
          <Stop offset="0.8" stopColor="#5A7DFF" />
          <Stop offset="1" stopColor="#3FC8F6" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} rx={radius} ry={radius} fill={`url(#${id}-v)`} />
      <Rect x="0" y="0" width={width} height={height} rx={radius} ry={radius} fill={`url(#${id}-c)`} />
      {line ? <Rect x="0" y={height - 2} width={width} height="2" fill={`url(#${id}-l)`} /> : null}
    </Svg>
  );
}

/** a paragraph's styled stretches; each carries the direction itself, react-pdf does not pass it down */
function Runs({ runs, rtl }: { runs: Run[]; rtl?: boolean }) {
  const dir = rtl ? { direction: "rtl" as const } : {};
  return (
    <>
      {runs.map((r, i) =>
        r.href ? (
          <Link key={i} src={r.href} style={[s.link, dir]}>
            {r.text}
          </Link>
        ) : (
          <Text key={i} style={[dir, r.bold ? { fontWeight: 600, color: c.text } : {}, r.italic ? { fontStyle: "italic" } : {}, r.code ? s.code : {}]}>
            {r.text}
          </Text>
        ),
      )}
    </>
  );
}

/** a paragraph written right to left: set from the right, its marker on the right */
const RTL = { direction: "rtl", textAlign: "right" } as const;

function Said({ block }: { block: Block }) {
  const dir = block.rtl ? RTL : {};
  if (block.kind === "heading")
    return (
      <Text style={[s.subhead, block.rtl ? { ...RTL, letterSpacing: 0 } : {}]}>
        {block.rtl ? block.runs.map((r) => r.text).join("") : block.runs.map((r) => r.text).join("").toUpperCase()}
      </Text>
    );
  if (block.kind === "item")
    return (
      <View style={[s.item, block.rtl ? { flexDirection: "row-reverse" } : {}]} wrap={false}>
        <Text style={[s.marker, block.rtl ? { textAlign: "right" } : {}]}>{block.marker}</Text>
        <Text style={[s.itemText, dir]}>
          <Runs runs={block.runs} rtl={block.rtl} />
        </Text>
      </View>
    );
  return (
    <Text style={[s.p, dir]}>
      <Runs runs={block.runs} rtl={block.rtl} />
    </Text>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={s.fact}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
      {sub ? <Text style={s.valueSub}>{sub}</Text> : null}
    </View>
  );
}

function Contents({ t }: { t: Transcript }) {
  return (
    <View style={s.contents}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>In this conversation</Text>
        <Text style={s.label}>CONTENTS · {t.questions} {t.questions === 1 ? "QUESTION" : "QUESTIONS"}</Text>
      </View>
      {t.exchanges.map((e) => (
        <Link key={e.n} src={`#${e.anchor}`} style={s.row}>
          <Text style={s.rowN}>{e.number}</Text>
          <Text style={[s.rowQ, e.questionRtl ? RTL : {}]}>{e.question}</Text>
          <View style={s.leader} />
          <Text style={s.rowT}>{e.clock.slice(0, 5)}</Text>
        </Link>
      ))}
    </View>
  );
}

function Mode({ spoken }: { spoken: boolean }) {
  return (
    <View style={[s.chip, { backgroundColor: spoken ? c.cyanSoft : "#F1F0F4" }]}>
      <Text style={[s.chipText, { color: spoken ? c.cyan : c.muted }]}>{spoken ? "SPOKEN" : "TYPED"}</Text>
    </View>
  );
}

function ExchangeView({ e, first, face }: { e: Exchange; first: boolean; face: string }) {
  return (
    <>
      {e.day ? (
        <View style={s.day} wrap={false}>
          <View style={s.dayRule} />
          <Text style={s.dayText}>{e.day.toUpperCase()}</Text>
          <View style={s.dayRule} />
        </View>
      ) : null}
      <View style={[s.exchange, first || e.day ? {} : s.rule]} id={e.anchor} {...outline(`${e.number}  ${clip(e.question, 72)}`)}>
        {/* the question never stands alone at the foot of a page */}
        <View style={s.qRow} wrap={false} minPresenceAhead={70}>
          <Text style={s.num}>{e.number}</Text>
          <View style={s.qCol}>
            <View style={s.meta}>
              <Text style={s.metaText}>{e.clock}</Text>
              <View style={s.dot} />
              <Text style={s.metaText}>{e.offset}</Text>
              <Mode spoken={e.spoken} />
            </View>
            <Text style={[s.question, e.questionRtl ? RTL : {}]}>{e.question}</Text>
          </View>
        </View>

        <View style={s.answer}>
          <View style={s.by} wrap={false}>
            <Image src={face} style={s.byFace} />
            <Text style={s.byText}>{player.firstName.toUpperCase()}</Text>
            {e.wait ? <Text style={s.byWait}>· answered in {e.wait}</Text> : null}
          </View>
          <View style={[s.said, e.answerRtl ? s.saidRtl : {}]}>
            {e.unanswered ? <Text style={s.none}>No answer was recorded for this question.</Text> : e.answer.map((b, i) => <Said key={i} block={b} />)}
          </View>
          {e.shown.length ? (
            <View style={s.extra} wrap={false}>
              <Text style={s.extraLabel}>SHOWN</Text>
              <View style={s.pills}>
                {e.shown.map((x) => (
                  <View key={x} style={s.pill}>
                    <Text style={s.pillText}>{x}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {e.did.length ? (
            <View style={s.extra} wrap={false}>
              <Text style={s.extraLabel}>STEPS</Text>
              <Text style={s.did}>{e.did.join("  ·  ")}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const CV = `${SITE}/cv.pdf`;
const { email, phone, linkedin, github } = player.links;

/** on the cover, by my name: the CV, one click away */
function CvLink() {
  return (
    <View style={s.cv}>
      <Link src={CV} style={s.cvPill}>
        <Text style={s.cvText}>MY CV · PDF</Text>
        <Text style={s.cvArrow}>↗</Text>
      </Link>
      <Text style={s.cvSub}>{bare(CV)}</Text>
    </View>
  );
}

/** everything I put on the table, once each, with the questions it answered */
function ShownIndex({ t }: { t: Transcript }) {
  if (!t.shownIndex.length) return null;
  return (
    // a short list is kept whole: a row left alone on the next page reads as a mistake
    <View style={s.shownSec} wrap={t.shownIndex.length > 14} {...outline("Everything I showed")}>
      <View style={s.sectionHead} wrap={false} minPresenceAhead={60}>
        <Text style={s.sectionTitle}>Everything I showed</Text>
        <Text style={s.label}>
          {t.shownIndex.length} {t.shownIndex.length === 1 ? "ITEM" : "ITEMS"} · WITH THE QUESTIONS THEY ANSWERED
        </Text>
      </View>
      {t.shownIndex.map((x) => (
        <View key={`${x.kind}·${x.name}`} style={s.shownRow} wrap={false}>
          <Text style={s.shownKind}>{(x.kind || "—").toUpperCase()}</Text>
          <Text style={s.shownName}>{x.name}</Text>
          <View style={s.shownIn}>
            {x.in.map((q) => (
              <Link key={q.anchor} src={`#${q.anchor}`} style={s.shownQ}>
                {q.number}
              </Link>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── the business card ──

const ICON = "#A9C8FF";
/** the card's icons (lucide's, and the two brand marks), in their 24-unit box */
const ICONS: Record<string, { stroke?: string[]; fill?: string; circle?: [number, number, number]; rect?: boolean }> = {
  EMAIL: { rect: true, stroke: ["m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"] },
  PHONE: {
    stroke: [
      "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
    ],
  },
  LINKEDIN: {
    fill: "M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z",
  },
  GITHUB: {
    fill: "M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3",
  },
  RECORD: { circle: [12, 12, 10], stroke: ["M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", "M2 12h20"] },
  "BASED IN": { circle: [12, 10, 3], stroke: ["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"] },
};

/** a round well pressed into the card, an icon at its bottom */
function Well({ name }: { name: string }) {
  const d = 5 * u;
  const icon = ICONS[name];
  const k = (2.3 * u) / 24;
  const o = (d - 2.3 * u) / 2;
  return (
    <Svg width={d} height={d + 0.2 * u} style={{ marginRight: 1.8 * u }}>
      <Circle cx={d / 2} cy={d / 2 + 0.16 * u} r={d / 2} fill="#FFFFFF" fillOpacity={0.16} />
      <Circle cx={d / 2} cy={d / 2} r={d / 2} fill="#08070D" fillOpacity={0.62} />
      <G transform={`translate(${o} ${o}) scale(${k})`}>
        {icon.rect ? <Rect x="2" y="4" width="20" height="16" rx="2" stroke={ICON} strokeWidth={2} fill="none" /> : null}
        {icon.circle ? <Circle cx={icon.circle[0]} cy={icon.circle[1]} r={icon.circle[2]} stroke={ICON} strokeWidth={2} fill="none" /> : null}
        {icon.stroke?.map((p) => <Path key={p} d={p} stroke={ICON} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
        {icon.fill ? <Path d={icon.fill} fill={ICON} /> : null}
      </G>
    </Svg>
  );
}

/** the face: the metal and the carved mark are the site's own (`scripts/assets/card-faces.mjs`), the words are set here */
function CardFront({ base }: { base: string }) {
  return (
    <View style={s.card}>
      <Image src={`${base}/transcript/card-front.jpg`} style={s.cardImg} />
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 6 * u + 30 * u + 4 * u, justifyContent: "center" }}>
        <View>
          <Text style={[s.carved, { position: "absolute", top: 0.2 * u, left: 0, color: "rgba(255,255,255,0.34)" }]}>{player.handle.toUpperCase()}</Text>
          <Text style={s.carved}>{player.handle.toUpperCase()}</Text>
        </View>
        <View style={[s.groove, { width: 30 * u, marginVertical: 2.4 * u }]} />
        <Text style={s.foilTitle}>{player.title.toUpperCase()}</Text>
      </View>
      <Link src={SITE} style={s.cardSite}>
        {bare(SITE).toUpperCase()}
      </Link>
    </View>
  );
}

function CardBack({ base }: { base: string }) {
  const lines = [
    { label: "EMAIL", value: email, href: `mailto:${email}` },
    ...(phone ? [{ label: "PHONE", value: phone, href: `tel:${phone.replace(/\s+/g, "")}` }] : []),
    { label: "LINKEDIN", value: bare(linkedin), href: linkedin },
    { label: "GITHUB", value: bare(github), href: github },
    { label: "RECORD", value: bare(SITE), href: SITE },
    { label: "BASED IN", value: player.location },
  ];
  return (
    <View style={s.card}>
      <Image src={`${base}/transcript/card-back.jpg`} style={s.cardImg} />
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, paddingHorizontal: 5.5 * u, paddingVertical: 4.5 * u }}>
        <View style={{ maxWidth: 72 * u }}>
          <Text style={s.backName}>{FULL_NAME.toUpperCase()}</Text>
          <Text style={s.backTitle}>{player.title.toUpperCase()}</Text>
        </View>
        <View style={[s.groove, { marginVertical: 3 * u }]} />
        <View style={s.lines}>
          {lines.map((l) => {
            const body = (
              <>
                <Well name={l.label} />
                <View style={{ flex: 1 }}>
                  <Text style={s.lineLabel}>{l.label}</Text>
                  <Text style={s.lineValue}>{l.value}</Text>
                </View>
              </>
            );
            return l.href ? (
              <Link key={l.label} src={l.href} style={s.line}>
                {body}
              </Link>
            ) : (
              <View key={l.label} style={s.line}>
                {body}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** the last page: what comes next, every way to reach me, and my card to keep */
function LastPage({ base, footer }: { base: string; footer: ReactNode }) {
  const links = [
    { label: "MY CV", value: bare(CV), sub: "My curriculum vitae, as a PDF", href: CV },
    { label: "SAVE MY CONTACT", value: bare(`${SITE}/contact.vcf`), sub: "My card as a contact, for your phone or mail", href: `${SITE}/contact.vcf` },
    { label: "INTERVIEW ME AGAIN", value: bare(`${SITE}/interview`), sub: "The room this conversation took place in", href: `${SITE}/interview` },
    { label: "THE RECORD", value: bare(`${SITE}/record`), sub: "My whole record on one plain page", href: `${SITE}/record` },
    { label: "EMAIL", value: email, sub: "The quickest way to reach me", href: `mailto:${email}` },
    ...(phone ? [{ label: "PHONE", value: phone, sub: player.location, href: `tel:${phone.replace(/\s+/g, "")}` }] : []),
    { label: "LINKEDIN", value: bare(linkedin), sub: "My professional profile", href: linkedin },
    { label: "GITHUB", value: bare(github), sub: "My code, in the open", href: github },
  ];
  return (
    <Page size="A4" style={s.last} bookmark={{ title: "What comes next", fit: true }}>
      {footer}
      <View style={s.lastBand}>
        <Glow width={595.28} height={BAND_H} id="last" />
        <Text style={[s.label, { color: c.lilac }]}>WHAT COMES NEXT</Text>
        <Text style={s.lastTitle}>Let&apos;s continue the conversation.</Text>
        <Text style={s.lastText}>
          Thank you for your questions. Anything binding (terms, dates, an offer) I settle with you directly, never here. Everything on this page is a link.
        </Text>
        <View style={s.actions}>
          <Link src={CV} style={[s.act, { backgroundColor: c.violet }]}>
            <Text style={[s.actText, { color: "#FFFFFF" }]}>DOWNLOAD MY CV ↗</Text>
          </Link>
          <Link src={`${SITE}/interview`} style={[s.act, { borderWidth: 0.8, borderColor: "rgba(183,162,255,0.6)" }]}>
            <Text style={[s.actText, { color: c.lilac }]}>INTERVIEW ME AGAIN ↗</Text>
          </Link>
        </View>
        <Text style={s.sign}>{FULL_NAME}</Text>
        <Text style={s.signRole}>{player.title.toUpperCase()}</Text>
      </View>

      <View style={s.lastSheet}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Where to find me</Text>
          <Text style={s.label}>EVERY LINE IS A LINK</Text>
        </View>
        <View style={s.links}>
          {links.map((l, i) => (
            <Link key={l.label} src={l.href} style={s.linkTile}>
              <Text style={s.linkN}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.linkLabel}>{l.label}</Text>
                <Text style={s.linkValue}>{l.value}</Text>
                <Text style={s.linkSub}>{l.sub}</Text>
              </View>
            </Link>
          ))}
        </View>

        <View style={[s.sectionHead, { marginTop: 26, marginBottom: 0 }]}>
          <Text style={s.sectionTitle}>My card</Text>
          <Text style={s.label}>ACTUAL SIZE · 85.6 × 54 MM</Text>
        </View>
        <View style={s.cards}>
          <View style={s.cardWrap}>
            <CardFront base={base} />
            <Text style={s.cardCap}>FRONT</Text>
          </View>
          <View style={s.cardWrap}>
            <CardBack base={base} />
            <Text style={s.cardCap}>BACK</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

export function TranscriptDocument({ t, base }: { t: Transcript; base: string }) {
  const face = `${base}/transcript/avatar.jpg`;
  const contentsOnCover = t.questions <= CONTENTS_ON_COVER;
  const typedSpoken = [t.typed && `${t.typed} typed`, t.spoken && `${t.spoken} spoken`].filter(Boolean).join(" · ");
  const header = (
    <View style={s.head} fixed>
      <View style={s.headBrand}>
        <Image src={`${base}/transcript/mark.png`} style={s.mark} />
        <Text style={[s.headText, { color: c.text }]}>{player.handle.toUpperCase()}</Text>
      </View>
      <Text style={s.headText}>
        INTERVIEW TRANSCRIPT · {t.shortDate.toUpperCase()} · {t.reference}
      </Text>
    </View>
  );
  const footer = (
    <View style={s.foot} fixed>
      <Text style={s.footNote}>{world.agent.footer}</Text>
      <Text style={s.pageN} render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
    </View>
  );

  return (
    <Document
      title={`Interview with ${FULL_NAME} · ${t.shortDate}`}
      author={FULL_NAME}
      subject={`Transcript of an interview with ${FULL_NAME}, ${player.title}: ${t.questions} questions, ${t.date}, ${t.started}–${t.ended}`}
      keywords={`interview, transcript, ${player.title}, ${player.handle}, ${t.reference}`}
      creator={`${player.handle} portfolio`}
      producer={`${player.handle} portfolio`}
      language="en"
      pageMode="useOutlines"
    >
      <Page size="A4" style={s.cover} bookmark={{ title: "Cover", fit: true }}>
        <View style={s.band}>
          <Glow width={595.28} height={336} id="cover" />
          <View style={s.bandTop}>
            <Image src={`${base}/transcript/logo.png`} style={s.logo} />
            <View>
              <Text style={s.kicker}>INTERVIEW TRANSCRIPT</Text>
              <Text style={s.ref}>REF. {t.reference}</Text>
            </View>
          </View>
          <View>
            <Text style={s.eyebrow}>A CONVERSATION WITH</Text>
            <Text style={s.name}>{FULL_NAME}</Text>
            <View style={s.who}>
              <Image src={face} style={s.face} />
              <View>
                <Text style={s.role}>{player.title}</Text>
                <Text style={s.place}>{player.location}</Text>
              </View>
            </View>
          </View>
          <CvLink />
        </View>

        <View style={s.sheet}>
          <View style={s.facts}>
            <Fact label="DATE" value={t.date} />
            <Fact label="TIME" value={`${t.started} – ${t.ended}`} sub={t.duration} />
            <Fact label="QUESTIONS" value={String(t.questions)} sub={typedSpoken || undefined} />
            <Fact label="TIME ZONE" value={t.zone.split(" · ")[0]} sub={t.zone.split(" · ")[1]} />
            <Fact label="MY ANSWERS" value={`${t.words.toLocaleString("en-GB")} words`} />
            <Fact label="REFERENCE" value={t.reference} sub={`made ${t.generated}`} />
          </View>
          {contentsOnCover ? (
            <Contents t={t} />
          ) : (
            <Text style={s.preface}>
              The full record of our conversation, every question in the order it was asked, timed to the second, with my answers exactly as I gave them.
            </Text>
          )}
        </View>

        <View style={s.coverFoot}>
          <Text style={s.footNote}>{world.agent.footer}</Text>
          <Text style={s.footMono}>{bareSite()}</Text>
        </View>
      </Page>

      <Page size="A4" style={s.page} wrap>
        {header}
        {footer}
        {contentsOnCover ? null : (
          <View style={{ marginBottom: 18 }}>
            <Contents t={t} />
          </View>
        )}
        <View style={s.intro} break={!contentsOnCover} wrap={false}>
          <Text style={s.sectionTitle}>The conversation</Text>
          <Text style={s.introLine}>
            {t.date.toUpperCase()} · {t.started}–{t.ended} · {t.duration.toUpperCase()}
          </Text>
        </View>
        {t.exchanges.map((e, i) => (
          <ExchangeView key={e.n} e={e} first={i === 0} face={face} />
        ))}
        <ShownIndex t={t} />
      </Page>

      <LastPage base={base} footer={footer} />
    </Document>
  );
}

/** an entry in the PDF's outline: react-pdf draws it from any node, its types allow it on pages only */
const outline = (title: string) => ({ bookmark: { title, fit: true } }) as object;
const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);
const bareSite = () => SITE.replace(/^https?:\/\//, "").toUpperCase();
