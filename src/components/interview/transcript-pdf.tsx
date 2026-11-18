/* eslint-disable jsx-a11y/alt-text -- react-pdf's Image is drawn into the PDF and takes no alt */
import { Defs, Document, Font, Image, LinearGradient, Link, Page, RadialGradient, Rect, Stop, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import type { Block, Exchange, Run, Transcript } from "./transcript";
import { familyName } from "./vcard";

/**
 * ── THE TRANSCRIPT, PRINTED ───────────────────────────────────
 * The interview as an A4 document the stranger keeps: a dark cover
 * with my name, the facts of the conversation (when, how long, how
 * many questions) and its contents, each line a link to its question;
 * then every exchange, numbered and timed, my answer set in a serif
 * under the question, with what I showed and the steps I took; last,
 * how to reach me. A running header and a page count on every page
 * after the cover. Loaded only when a transcript is asked for.
 */

const FULL_NAME = `${player.firstName} ${familyName(player.name, player.firstName)}`;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.codeonym.work").replace(/\/$/, "");
/** on the cover with the facts, or on a page of their own when there are many */
const CONTENTS_ON_COVER = 11;
/** the closing card: fixed, so its glow fits it */
const CLOSE_H = 226;

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
  cover: { backgroundColor: c.paper, fontFamily: "Plex Sans", color: c.text },
  band: { height: 336, backgroundColor: c.ink, paddingHorizontal: 56, paddingTop: 46, paddingBottom: 40, position: "relative", justifyContent: "space-between" },
  bandTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 138, height: 37 },
  kicker: { fontFamily: "Plex Mono", fontSize: 7, letterSpacing: 2.2, color: c.lilac, textAlign: "right" },
  ref: { fontFamily: "Plex Mono", fontSize: 7, letterSpacing: 1.4, color: "rgba(255,255,255,0.5)", textAlign: "right", marginTop: 5 },
  eyebrow: { fontFamily: "Plex Mono", fontSize: 7.5, letterSpacing: 2.6, color: c.lilac, marginBottom: 10 },
  name: { fontFamily: "Plex Serif", fontWeight: 300, fontSize: 44, color: "#FFFFFF", letterSpacing: -0.6, lineHeight: 1.05 },
  who: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  face: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(183,162,255,0.6)", marginRight: 10 },
  role: { fontSize: 10, color: "rgba(255,255,255,0.86)", fontWeight: 500 },
  place: { fontSize: 8.5, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  sheet: { paddingHorizontal: 56, paddingTop: 30 },
  facts: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: c.text },
  fact: { width: "33.33%", paddingTop: 11, paddingBottom: 12, paddingRight: 10, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  label: { fontFamily: "Plex Mono", fontSize: 6.6, letterSpacing: 1.8, color: c.muted, marginBottom: 4 },
  value: { fontSize: 10.5, fontWeight: 500, color: c.text },
  valueSub: { fontSize: 8, color: c.muted, marginTop: 2 },
  preface: { fontFamily: "Plex Serif", fontWeight: 300, fontStyle: "italic", fontSize: 11, lineHeight: 1.55, color: c.body, marginTop: 22, maxWidth: 400 },

  coverFoot: { position: "absolute", left: 56, right: 56, bottom: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 0.6, borderTopColor: c.hair, paddingTop: 9 },
  footNote: { fontSize: 6.8, color: c.faint, maxWidth: 330, lineHeight: 1.45 },
  footMono: { fontFamily: "Plex Mono", fontSize: 6.6, letterSpacing: 1.2, color: c.faint },

  // ── contents ──
  contents: { marginTop: 26 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontFamily: "Plex Serif", fontWeight: 300, fontSize: 19, color: c.text, letterSpacing: -0.2 },
  row: { flexDirection: "row", alignItems: "flex-end", paddingVertical: 4.2, textDecoration: "none" },
  rowN: { fontFamily: "Plex Mono", fontSize: 7.5, fontWeight: 500, color: c.violet, width: 24 },
  rowQ: { fontSize: 9, color: c.text, maxWidth: 330, maxLines: 1, textOverflow: "ellipsis" },
  leader: { flexGrow: 1, borderBottomWidth: 0.7, borderBottomColor: c.faint, borderBottomStyle: "dotted", marginHorizontal: 6, marginBottom: 2.5 },
  rowT: { fontFamily: "Plex Mono", fontSize: 7.2, color: c.muted },

  // ── the conversation ──
  page: { backgroundColor: c.paper, fontFamily: "Plex Sans", color: c.text, paddingTop: 80, paddingBottom: 66, paddingHorizontal: 56 },
  head: { position: "absolute", top: 30, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 9, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  headBrand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 11, height: 11, marginRight: 6 },
  headText: { fontFamily: "Plex Mono", fontSize: 6.6, letterSpacing: 1.8, color: c.muted },
  foot: { position: "absolute", left: 56, right: 56, bottom: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  pageN: { fontFamily: "Plex Mono", fontSize: 7, letterSpacing: 1.2, color: c.text },

  intro: { marginBottom: 6 },
  introLine: { fontFamily: "Plex Mono", fontSize: 6.8, letterSpacing: 1.8, color: c.muted, marginTop: 6 },

  day: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 2 },
  dayRule: { flexGrow: 1, borderBottomWidth: 0.6, borderBottomColor: c.hair },
  dayText: { fontFamily: "Plex Mono", fontSize: 6.8, letterSpacing: 2, color: c.violet, marginHorizontal: 10 },

  exchange: { paddingTop: 18, paddingBottom: 6 },
  rule: { borderTopWidth: 0.6, borderTopColor: c.hair },
  qRow: { flexDirection: "row" },
  num: { width: 52, fontFamily: "Plex Serif", fontWeight: 300, fontSize: 28, color: c.violet, lineHeight: 1, marginTop: -2 },
  qCol: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  metaText: { fontFamily: "Plex Mono", fontSize: 6.8, letterSpacing: 1.1, color: c.muted },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: c.faint, marginHorizontal: 6 },
  chip: { borderRadius: 2, paddingHorizontal: 4.5, paddingTop: 1.6, paddingBottom: 1.2, marginLeft: 8 },
  chipText: { fontFamily: "Plex Mono", fontSize: 5.8, letterSpacing: 1.4, fontWeight: 500 },
  question: { fontSize: 12, fontWeight: 600, lineHeight: 1.38, color: c.text },

  answer: { marginLeft: 52, marginTop: 10 },
  by: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  byFace: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  byText: { fontFamily: "Plex Mono", fontSize: 6.6, letterSpacing: 1.6, color: c.violet },
  byWait: { fontFamily: "Plex Mono", fontSize: 6.6, letterSpacing: 0.6, color: c.faint, marginLeft: 6 },
  said: { borderLeftWidth: 1.4, borderLeftColor: c.violetLine, paddingLeft: 12 },
  p: { fontFamily: "Plex Serif", fontSize: 10.2, lineHeight: 1.62, color: c.body, marginBottom: 5 },
  item: { flexDirection: "row", marginBottom: 3 },
  marker: { width: 14, fontFamily: "Plex Serif", fontSize: 10.2, lineHeight: 1.62, color: c.violet },
  itemText: { flex: 1, fontFamily: "Plex Serif", fontSize: 10.2, lineHeight: 1.62, color: c.body },
  subhead: { fontFamily: "Plex Mono", fontSize: 7, letterSpacing: 1.8, color: c.violet, marginTop: 4, marginBottom: 4 },
  none: { fontFamily: "Plex Serif", fontStyle: "italic", fontWeight: 300, fontSize: 10, color: c.muted },
  code: { fontFamily: "Plex Mono", fontSize: 9, color: c.violet },
  link: { color: c.violet, textDecoration: "underline" },

  extra: { flexDirection: "row", marginTop: 8, marginLeft: 13.4, alignItems: "flex-start" },
  extraLabel: { width: 46, fontFamily: "Plex Mono", fontSize: 6.2, letterSpacing: 1.5, color: c.faint, paddingTop: 2.4 },
  pills: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  pill: { backgroundColor: c.violetSoft, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2.4, marginRight: 4, marginBottom: 4 },
  pillText: { fontSize: 7.4, color: c.violet, fontWeight: 500 },
  did: { flex: 1, fontSize: 7.8, color: c.muted, lineHeight: 1.45 },

  // ── the close ──
  close: { marginTop: 26, height: CLOSE_H, backgroundColor: c.ink, borderRadius: 8, padding: 28, position: "relative" },
  closeTitle: { fontFamily: "Plex Serif", fontWeight: 300, fontSize: 21, color: "#FFFFFF", letterSpacing: -0.2 },
  closeText: { fontSize: 9, color: "rgba(255,255,255,0.68)", lineHeight: 1.55, marginTop: 6, maxWidth: 360 },
  channels: { flexDirection: "row", flexWrap: "wrap", marginTop: 18, borderTopWidth: 0.6, borderTopColor: "rgba(255,255,255,0.14)", paddingTop: 6 },
  channel: { width: "33.33%", paddingVertical: 7, paddingRight: 10 },
  channelLabel: { fontFamily: "Plex Mono", fontSize: 6.2, letterSpacing: 1.8, color: c.lilac, marginBottom: 3 },
  channelValue: { fontSize: 9.5, color: "#FFFFFF", textDecoration: "none" },
  sign: { position: "absolute", right: 28, bottom: 34, fontFamily: "Plex Serif", fontWeight: 300, fontStyle: "italic", fontSize: 13, color: c.lilac },
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

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) =>
        r.href ? (
          <Link key={i} src={r.href} style={s.link}>
            {r.text}
          </Link>
        ) : (
          <Text key={i} style={[r.bold ? { fontWeight: 600, color: c.text } : {}, r.italic ? { fontStyle: "italic" } : {}, r.code ? s.code : {}]}>
            {r.text}
          </Text>
        ),
      )}
    </>
  );
}

function Said({ block }: { block: Block }) {
  if (block.kind === "heading")
    return (
      <Text style={s.subhead}>
        {block.runs.map((r) => r.text).join("").toUpperCase()}
      </Text>
    );
  if (block.kind === "item")
    return (
      <View style={s.item} wrap={false}>
        <Text style={s.marker}>{block.marker}</Text>
        <Text style={s.itemText}>
          <Runs runs={block.runs} />
        </Text>
      </View>
    );
  return (
    <Text style={s.p}>
      <Runs runs={block.runs} />
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
          <Text style={s.rowQ}>{e.question}</Text>
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
      <View style={[s.exchange, first || e.day ? {} : s.rule]} id={e.anchor}>
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
            <Text style={s.question}>{e.question}</Text>
          </View>
        </View>

        <View style={s.answer}>
          <View style={s.by} wrap={false}>
            <Image src={face} style={s.byFace} />
            <Text style={s.byText}>{player.firstName.toUpperCase()}</Text>
            {e.wait ? <Text style={s.byWait}>· answered in {e.wait}</Text> : null}
          </View>
          <View style={s.said}>
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

function Close() {
  const { email, phone, linkedin, github } = player.links;
  const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const channels = [
    { label: "EMAIL", value: email, href: `mailto:${email}` },
    ...(phone ? [{ label: "PHONE", value: phone, href: `tel:${phone.replace(/\s+/g, "")}` }] : []),
    { label: "LINKEDIN", value: bare(linkedin), href: linkedin },
    { label: "GITHUB", value: bare(github), href: github },
    { label: "PORTFOLIO", value: bare(SITE), href: SITE },
  ];
  return (
    <View style={s.close} wrap={false}>
      <Glow width={483.28} height={CLOSE_H} id="close" line={false} radius={8} />
      <Text style={[s.label, { color: c.lilac }]}>WHAT COMES NEXT</Text>
      <Text style={s.closeTitle}>Let&apos;s continue the conversation.</Text>
      <Text style={s.closeText}>
        Anything binding (terms, dates, an offer) I settle with you directly, never here. These are the ways to reach me.
      </Text>
      <View style={s.channels}>
        {channels.map((ch) => (
          <View key={ch.label} style={s.channel}>
            <Text style={s.channelLabel}>{ch.label}</Text>
            <Link src={ch.href} style={s.channelValue}>
              {ch.value}
            </Link>
          </View>
        ))}
      </View>
      <Text style={s.sign}>{FULL_NAME}</Text>
    </View>
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
      <Page size="A4" style={s.cover}>
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
        <Close />
      </Page>
    </Document>
  );
}

const bareSite = () => SITE.replace(/^https?:\/\//, "").toUpperCase();
