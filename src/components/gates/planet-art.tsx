import type { Planet } from "@/config/types";

/**
 * A planet as a flat SVG disc, from the same palette the shader uses.
 * It stands in wherever the 3D realm is not: the list of worlds, the
 * sealed screen, and the whole page when WebGL is missing.
 */
export function PlanetArt({ planet, className, dim }: { planet: Planet; className?: string; dim?: boolean }) {
  const [low, high, glow] = planet.palette;
  const id = planet.id;
  const banded = planet.kind === "gas";
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" style={dim ? { filter: "saturate(0.45) brightness(0.6)" } : undefined}>
      <defs>
        <radialGradient id={`body-${id}`} cx="0.34" cy="0.3" r="0.9">
          <stop offset="0" stopColor={high} />
          <stop offset="0.55" stopColor={low} />
          <stop offset="1" stopColor="#020106" />
        </radialGradient>
        <radialGradient id={`halo-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.62" stopColor={glow} stopOpacity="0.5" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`disc-${id}`}>
          <circle cx="100" cy="100" r="56" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="92" fill={`url(#halo-${id})`} />
      {planet.ring && (
        <ellipse cx="100" cy="100" rx="94" ry="20" fill="none" stroke={glow} strokeOpacity="0.4" strokeWidth="7" strokeDasharray={planet.ring === "broken" ? "46 14 9 22 60 30" : undefined} transform="rotate(-18 100 100)" />
      )}
      <circle cx="100" cy="100" r="56" fill={`url(#body-${id})`} />
      <g clipPath={`url(#disc-${id})`}>
        {banded && [72, 88, 106, 124].map((y, i) => <rect key={y} x="40" y={y} width="120" height={i % 2 ? 5 : 9} fill={i % 2 ? low : high} opacity="0.4" />)}
        {(planet.kind === "cracked" || planet.kind === "lava") && (
          <path d="M52 92 L80 100 L92 84 L118 104 L150 96 M80 100 L74 128 L96 146 M118 104 L126 132 L112 152 M92 84 L98 60" fill="none" stroke={glow} strokeWidth="2.2" strokeLinejoin="round" />
        )}
        {planet.kind === "shroud" && (
          <path d="M40 78 Q70 66 96 80 T160 76 M36 104 Q66 94 100 108 T166 100 M48 130 Q80 120 108 132 T156 126" fill="none" stroke={glow} strokeOpacity="0.32" strokeWidth="9" strokeLinecap="round" />
        )}
        {planet.kind === "crystal" && <path d="M44 100 L100 44 L156 100 L100 156 Z M100 44 L100 156 M44 100 L156 100 M72 72 L128 128 M128 72 L72 128" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" />}
        {planet.kind === "ocean" && <path d="M58 70 Q84 58 104 76 T142 82 M66 122 Q92 108 118 126 T150 118" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" />}
      </g>
      {planet.ring && (
        <path d="M6 100 A94 20 0 0 0 194 100" fill="none" stroke={glow} strokeOpacity="0.55" strokeWidth="7" strokeDasharray={planet.ring === "broken" ? "46 14 9 22 60 30" : undefined} transform="rotate(-18 100 100)" />
      )}
    </svg>
  );
}
