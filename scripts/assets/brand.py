#!/usr/bin/env python3
"""
The codeonym mark and wordmark, drawn from numbers. No font, no tracing:
every letter is strokes with round ends on the same circle as the mark.

  python3 scripts/assets/brand.py            # writes public/brand/*.svg and src/app/icon.svg
  inkscape src/app/icon.svg -o src/app/apple-icon.png -w 180 -b "#08060f"
  for s in 16 32 48; do inkscape src/app/icon.svg -o f$s.png -w $s; done && magick f16.png f32.png f48.png src/app/favicon.ico

The mark: an open ring (a C, an orbit, an eclipse seen edge-on) and the one
body that closes it. Around it, an instrument: a graduated dial, broken outer
arcs, a tilted orbit passing behind the ring, a counter-ring turned the other
way, and a four-pointed core. Three levels of detail, so the favicon and the
32 px mark in the interface keep only what survives at their size.
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
    <linearGradient id="{p}-counter" gradientUnits="userSpaceOnUse" x1="150" y1="360" x2="360" y2="150">
      <stop offset="0" stop-color="#3fc8f6"/><stop offset=".55" stop-color="#7f8dff"/><stop offset="1" stop-color="#d9c8ff"/>
    </linearGradient>
    <radialGradient id="{p}-aura" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7a4dff" stop-opacity=".42"/><stop offset=".55" stop-color="#5a3de0" stop-opacity=".14"/><stop offset="1" stop-color="#5a3de0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="{p}-orb" cx=".38" cy=".34" r=".75">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfe9ff"/><stop offset="1" stop-color="#6fb6ff"/>
    </radialGradient>
    <filter id="{p}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="{p}-halo" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>"""


def arc(cx: float, cy: float, r: float, a0: float, a1: float) -> str:
    """an arc from angle a0 to a1, in degrees, counter-clockwise, 0 pointing right"""
    x0, y0 = cx + r * cos(radians(a0)), cy - r * sin(radians(a0))
    x1, y1 = cx + r * cos(radians(a1)), cy - r * sin(radians(a1))
    return f"M{f(x0)},{f(y0)} A{f(r)},{f(r)} 0 {1 if a1 - a0 > 180 else 0} 0 {f(x1)},{f(y1)}"


def at(r: float, a: float) -> tuple[float, float]:
    return 256 + r * cos(radians(a)), 256 - r * sin(radians(a))


def spark(cx: float, cy: float, r: float, pinch: float = 0.14) -> str:
    """a four-pointed star with hollow sides"""
    k = r * pinch
    return (
        f"M{f(cx)},{f(cy - r)} Q{f(cx + k)},{f(cy - k)} {f(cx + r)},{f(cy)} Q{f(cx + k)},{f(cy + k)} {f(cx)},{f(cy + r)} "
        f"Q{f(cx - k)},{f(cy + k)} {f(cx - r)},{f(cy)} Q{f(cx - k)},{f(cy - k)} {f(cx)},{f(cy - r)}Z"
    )


def dial(r: float, every: int = 5) -> str:
    """the graduated outer ring: a tick each `every` degrees, a longer one each 30, none across the opening"""
    d = []
    for a in range(0, 360, every):
        if a < 22 or a > 338:
            continue
        long = a % 30 == 0
        (x0, y0), (x1, y1) = at(r, a), at(r + (13 if long else 6), a)
        d.append(f"M{f(x0)},{f(y0)} L{f(x1)},{f(y1)}")
    return " ".join(d)


# the tilted orbit that passes behind the ring
TILT = -24
ORBIT = (238, 66)


def on_orbit(a: float) -> tuple[float, float]:
    x, y = ORBIT[0] * cos(radians(a)), -ORBIT[1] * sin(radians(a))
    t = radians(TILT)
    return 256 + x * cos(t) - y * sin(t), 256 + x * sin(t) + y * cos(t)


def mark(p: str, level: int = 2, stroke: float = 26, r: float = 150, orb: float = 22, aura: bool = True) -> str:
    """
    the mark in a 512 box, centred on 256,256.
    level 0: the ring, its body and the core (the icon).
    level 1: adds the counter-ring (small sizes in the interface).
    level 2: adds the dial, the tilted orbit, the outer arcs and the stars (the logo).
    """
    ring_d = ring(256, 256, r)
    out = []
    if aura:
        out.append(f'<circle cx="256" cy="256" r="250" fill="url(#{p}-aura)"/>')
    if level >= 2:
        # the dial and the broken arcs outside it
        out.append(f'<path d="{dial(206)}" fill="none" stroke="{INK}" stroke-width="1.6" stroke-linecap="round" opacity=".34"/>')
        out.append(f'<circle cx="256" cy="256" r="200" fill="none" stroke="{INK}" stroke-width="1" opacity=".14"/>')
        for a0, a1, w, o in ((52, 128, 3, 0.75), (140, 152, 3, 0.45), (196, 262, 3, 0.7), (272, 280, 3, 0.4), (292, 330, 3, 0.6)):
            out.append(f'<path d="{arc(256, 256, 232, a0, a1)}" fill="none" stroke="url(#{p}-arc)" stroke-width="{w}" stroke-linecap="round" opacity="{o}"/>')
        for a in (134, 268, 286):
            x, y = at(232, a)
            out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="2.6" fill="#cdbcff"/>')
        # the tilted orbit, drawn before the ring so it passes behind it
        out.append(f'<ellipse cx="256" cy="256" rx="{ORBIT[0]}" ry="{ORBIT[1]}" transform="rotate({TILT} 256 256)" fill="none" stroke="url(#{p}-arc)" stroke-width="1.8" opacity=".55"/>')
        x, y = on_orbit(158)
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="13" fill="#b79bff" filter="url(#{p}-halo)" opacity=".7"/>')
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="6" fill="#e9deff"/>')
        x, y = on_orbit(318)
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="3.4" fill="#8fd0ff"/>')
        # far stars
        for x, y, s, o in ((84, 92, 9, 0.8), (432, 108, 6, 0.6), (406, 420, 8, 0.7), (70, 388, 5, 0.5), (300, 34, 4, 0.5)):
            out.append(f'<path d="{spark(x, y, s, 0.1)}" fill="{INK}" opacity="{o}"/>')
    out.append(f'<path d="{ring_d}" fill="none" stroke="url(#{p}-arc)" stroke-width="{f(stroke)}" stroke-linecap="round" filter="url(#{p}-glow)" opacity=".6"/>')
    out.append(f'<path d="{ring_d}" fill="none" stroke="url(#{p}-arc)" stroke-width="{f(stroke)}" stroke-linecap="round"/>')
    if level >= 1:
        # light caught on the upper edge of the ring
        out.append(f'<path d="{arc(256, 256, r + stroke * 0.26, 62, 168)}" fill="none" stroke="#ffffff" stroke-width="{f(stroke * 0.09)}" stroke-linecap="round" opacity=".5"/>')
        # the counter-ring: thinner, turned the other way
        ri = r * 0.68
        out.append(f'<path d="{arc(256, 256, ri, 232, 232 + 296)}" fill="none" stroke="url(#{p}-counter)" stroke-width="{f(stroke * 0.36)}" stroke-linecap="round"/>')
        x, y = at(ri, 198)
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(stroke * 0.25)}" fill="#bca4ff"/>')
    if level >= 2:
        # the innermost ring, dashed, and the marks at its quarters
        out.append(f'<circle cx="256" cy="256" r="{f(r * 0.44)}" fill="none" stroke="{INK}" stroke-width="1.6" stroke-dasharray="2 7" stroke-linecap="round" opacity=".5"/>')
        for a in (45, 135, 225, 315):
            (x0, y0), (x1, y1) = at(r * 0.44 - 5, a), at(r * 0.44 + 5, a)
            out.append(f'<path d="M{f(x0)},{f(y0)} L{f(x1)},{f(y1)}" stroke="{INK}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>')
    # the core
    core = r * (0.3 if level else 0.4)
    out.append(f'<circle cx="256" cy="256" r="{f(core * 0.8)}" fill="#9d70ff" filter="url(#{p}-halo)" opacity=".75"/>')
    out.append(f'<path d="{spark(256, 256, core)}" fill="url(#{p}-orb)"/>')
    if level >= 2:
        out.append(f'<path d="{spark(256, 256, core * 0.52, 0.1)}" transform="rotate(45 256 256)" fill="#ffffff" opacity=".55"/>')
    # the body that closes the ring
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
    dot = f'<circle cx="{f(tx + 2 * R * scale)}" cy="{f(ty - R * scale)}" r="{f(weight * 0.82 * scale)}" fill="#8fd0ff"/>'
    return dot + f'<path transform="translate({f(tx)},{f(ty)}) scale({f(scale)})" d="{d}" fill="none" stroke="{INK}" stroke-width="{f(weight)}" stroke-linecap="round" stroke-linejoin="round"/>'


def svg(w: float, h: float, p: str, body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}"><title>codeonym</title><defs>{defs(p)}\n  </defs>\n    {body}\n</svg>\n'


def main() -> None:
    brand = ROOT / "public" / "brand"
    _, width = letters()

    (brand / "mark.svg").write_text(svg(512, 512, "m", mark("m")))
    # for 24 to 48 px in the interface: no hairlines to turn to mush
    (brand / "mark-small.svg").write_text(svg(512, 512, "s", mark("s", level=1, stroke=34, r=170, orb=28, aura=False)))

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
    body = f'<rect width="512" height="512" rx="116" fill="{NIGHT}"/>\n    <circle cx="256" cy="256" r="250" fill="url(#i-aura)"/>\n    ' + mark("i", level=0, stroke=46, r=138, orb=34, aura=False)
    (ROOT / "src" / "app" / "icon.svg").write_text(svg(512, 512, "i", body))


if __name__ == "__main__":
    main()
