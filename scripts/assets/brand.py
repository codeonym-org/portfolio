#!/usr/bin/env python3
"""
The codeonym mark and wordmark, drawn from numbers. No font, no tracing:
every letter is strokes with round ends on the same circle as the mark.

  python3 scripts/assets/brand.py            # writes public/brand/*.svg and src/app/icon.svg
  inkscape src/app/icon.svg -o src/app/apple-icon.png -w 180 -b "#08060f"
  for s in 16 32 48; do inkscape src/app/icon.svg -o f$s.png -w $s; done && magick f16.png f32.png f48.png src/app/favicon.ico

The mark: an open ring (a C, an orbit, an eclipse seen edge-on) and the one
body that closes it. A thin inner orbit carries a second, smaller body.
"""
from math import cos, radians, sin
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INK = "#f4f2fb"
NIGHT = "#08060f"
GAP = 38  # half the opening of the ring, in degrees


def f(n: float) -> str:
    return f"{n:.2f}".rstrip("0").rstrip(".")


def ring(cx: float, cy: float, r: float, gap: float = GAP) -> str:
    """an arc open to the right, from the upper lip round the left to the lower lip"""
    x = cx + r * cos(radians(gap))
    dy = r * sin(radians(gap))
    return f"M{f(x)},{f(cy - dy)} A{f(r)},{f(r)} 0 1 0 {f(x)},{f(cy + dy)}"


def defs(p: str) -> str:
    return f"""
    <linearGradient id="{p}-arc" gradientUnits="userSpaceOnUse" x1="300" y1="96" x2="300" y2="416">
      <stop offset="0" stop-color="#e3d4ff"/><stop offset=".42" stop-color="#9d70ff"/><stop offset=".78" stop-color="#5a7dff"/><stop offset="1" stop-color="#3fc8f6"/>
    </linearGradient>
    <radialGradient id="{p}-aura" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7a4dff" stop-opacity=".42"/><stop offset=".55" stop-color="#5a3de0" stop-opacity=".14"/><stop offset="1" stop-color="#5a3de0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="{p}-orb" cx=".38" cy=".34" r=".75">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfe9ff"/><stop offset="1" stop-color="#6fb6ff"/>
    </radialGradient>
    <filter id="{p}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="{p}-halo" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>"""


def mark(p: str, stroke: float = 30, r: float = 150, orb: float = 23, inner: bool = True, aura: bool = True) -> str:
    """the mark in a 512 box, centred on 256,256"""
    arc = ring(256, 256, r)
    out = []
    if aura:
        out.append(f'<circle cx="256" cy="256" r="250" fill="url(#{p}-aura)"/>')
    out.append(f'<path d="{arc}" fill="none" stroke="url(#{p}-arc)" stroke-width="{f(stroke)}" stroke-linecap="round" filter="url(#{p}-glow)" opacity=".6"/>')
    if inner:
        out.append(f'<circle cx="256" cy="256" r="{f(r * 0.6)}" fill="none" stroke="{INK}" stroke-width="2" opacity=".2"/>')
        a = radians(214)
        out.append(f'<circle cx="{f(256 + r * 0.6 * cos(a))}" cy="{f(256 - r * 0.6 * sin(a))}" r="6.5" fill="#bca4ff"/>')
    out.append(f'<path d="{arc}" fill="none" stroke="url(#{p}-arc)" stroke-width="{f(stroke)}" stroke-linecap="round"/>')
    out.append(f'<circle cx="{f(256 + r)}" cy="256" r="{f(orb * 1.5)}" fill="#8fd0ff" filter="url(#{p}-halo)" opacity=".85"/>')
    out.append(f'<circle cx="{f(256 + r)}" cy="256" r="{f(orb)}" fill="url(#{p}-orb)"/>')
    return "\n    ".join(out)


# ── the wordmark: c o d e o n y m, on a baseline at y=0, x-height 2R ──
R = 40
ASC = 46
DESC = 44
TRACK = 30


def letters() -> tuple[str, float]:
    x = 0.0
    d: list[str] = []
    cy = -R

    def o():
        nonlocal x
        d.append(f"M{f(x)},{f(cy)} a{R},{R} 0 1 0 {2 * R},0 a{R},{R} 0 1 0 {-2 * R},0")
        x += 2 * R + TRACK

    def c():
        nonlocal x
        d.append(ring(x + R, cy, R))
        x += 2 * R - 8 + TRACK

    def dd():
        nonlocal x
        d.append(f"M{f(x)},{f(cy)} a{R},{R} 0 1 0 {2 * R},0 a{R},{R} 0 1 0 {-2 * R},0")
        d.append(f"M{f(x + 2 * R)},{f(-2 * R - ASC)} V0")
        x += 2 * R + TRACK

    def e():
        nonlocal x
        ex = x + R + R * cos(radians(GAP))
        d.append(f"M{f(x)},{f(cy)} H{f(x + 2 * R)} A{R},{R} 0 1 0 {f(ex)},{f(cy + R * sin(radians(GAP)))}")
        x += 2 * R + TRACK

    def n():
        nonlocal x
        d.append(f"M{f(x)},{f(-2 * R)} V0 M{f(x)},{f(cy)} A{R},{R} 0 0 1 {f(x + 2 * R)},{f(cy)} V0")
        x += 2 * R + TRACK

    def y():
        nonlocal x
        hook = 26
        d.append(f"M{f(x)},{f(-2 * R)} V{f(cy)} A{R},{R} 0 0 0 {f(x + 2 * R)},{f(cy)}")
        d.append(f"M{f(x + 2 * R)},{f(-2 * R)} V{f(DESC - hook)} a{hook},{hook} 0 0 1 {-hook},{hook} H{f(x + 0.55 * R)}")
        x += 2 * R + TRACK

    def m():
        nonlocal x
        r = 31
        top = -2 * R + r
        d.append(f"M{f(x)},{f(-2 * R)} V0 M{f(x)},{f(top)} A{r},{r} 0 0 1 {f(x + 2 * r)},{f(top)} V0 M{f(x + 2 * r)},{f(top)} A{r},{r} 0 0 1 {f(x + 4 * r)},{f(top)} V0")
        x += 4 * r + TRACK

    for glyph in (c, o, dd, e, o, n, y, m):
        glyph()
    return " ".join(d), x - TRACK


def word(tx: float, ty: float, scale: float, weight: float = 8.5) -> str:
    d, _ = letters()
    return f'<path transform="translate({f(tx)},{f(ty)}) scale({f(scale)})" d="{d}" fill="none" stroke="{INK}" stroke-width="{f(weight)}" stroke-linecap="round" stroke-linejoin="round"/>'


def svg(w: float, h: float, p: str, body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}"><title>codeonym</title><defs>{defs(p)}\n  </defs>\n    {body}\n</svg>\n'


def main() -> None:
    brand = ROOT / "public" / "brand"
    _, width = letters()

    (brand / "mark.svg").write_text(svg(512, 512, "m", mark("m")))

    # horizontal: the mark, then the word on the mark's own centre line
    s = 1.0
    mh = 300
    k = mh / 512
    pad = 20
    wx = pad + mh + 26
    total = wx + width * s + pad + 14
    body = f'<g transform="translate({pad},{pad}) scale({f(k)})">{mark("m")}</g>\n    {word(wx, pad + mh / 2 + R * s, s)}'
    (brand / "logo.svg").write_text(svg(total, mh + 2 * pad, "m", body))

    # stacked: the mark over the word
    sw = max(width + 80, 560)
    body = f'<g transform="translate({f((sw - 380) / 2)},10) scale({f(380 / 512)})">{mark("m")}</g>\n    {word((sw - width) / 2, 380 + 10 + 2 * R + 30, 1)}'
    (brand / "logo-stacked.svg").write_text(svg(sw, 380 + 10 + 2 * R + 30 + DESC + 34, "m", body))

    # the icon: on its own night, heavier, nothing that vanishes at 16 px
    body = f'<rect width="512" height="512" rx="116" fill="{NIGHT}"/>\n    <circle cx="256" cy="256" r="250" fill="url(#i-aura)"/>\n    ' + mark("i", stroke=46, r=138, orb=34, inner=False, aura=False)
    (ROOT / "src" / "app" / "icon.svg").write_text(svg(512, 512, "i", body))


if __name__ == "__main__":
    main()
