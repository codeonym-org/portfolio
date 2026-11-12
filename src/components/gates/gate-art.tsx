import type { Gate } from "@/config/types";

/**
 * A gate's cover, drawn in SVG: one iceberg, cut at the waterline.
 * The Surface shows the tip above the water; The Deep shows the mass below.
 * No image files: the catalog stays a few kilobytes.
 */
export function GateArt({ gate, className }: { gate: Gate; className?: string }) {
  const deep = gate.id === "the-deep";
  const water = deep ? 62 : 150;
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${gate.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={deep ? "#07051a" : "#120b2e"} />
          <stop offset="1" stopColor={deep ? "#020109" : "#05040b"} />
        </linearGradient>
        <linearGradient id={`sea-${gate.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={deep ? "#1b1050" : "#16103a"} stopOpacity="0.9" />
          <stop offset="1" stopColor="#030208" />
        </linearGradient>
        <linearGradient id={`ice-${gate.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={deep ? "#f3c96b" : "#c9b6ff"} />
          <stop offset="1" stopColor={deep ? "#7a3df0" : "#5b34d6"} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#sky-${gate.id})`} />
      {[...Array(26)].map((_, i) => (
        <circle key={i} cx={(i * 73) % 320} cy={(i * 41) % (water - 6)} r={i % 5 === 0 ? 0.9 : 0.5} fill="#fff" opacity={0.25 + (i % 4) * 0.12} />
      ))}
      <rect y={water} width="320" height={200 - water} fill={`url(#sea-${gate.id})`} />
      {deep ? (
        <g>
          <polygon points="150,62 172,40 190,62" fill="#c9b6ff" opacity="0.5" />
          <polygon points="96,62 224,62 252,104 214,168 160,196 112,170 74,112" fill={`url(#ice-${gate.id})`} opacity="0.9" />
          <polygon points="96,62 160,100 224,62" fill="#fff" opacity="0.14" />
          <polygon points="160,100 252,104 214,168 160,196" fill="#000" opacity="0.28" />
          <polygon points="160,100 74,112 112,170 160,196" fill="#000" opacity="0.12" />
          <polyline points="96,62 160,100 224,62 M160,100 160,196 M74,112 160,100 252,104" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" />
        </g>
      ) : (
        <g>
          <polygon points="160,26 204,92 190,150 130,150 116,92" fill={`url(#ice-${gate.id})`} />
          <polygon points="160,26 160,96 116,92" fill="#fff" opacity="0.22" />
          <polygon points="160,96 204,92 190,150 160,150" fill="#000" opacity="0.25" />
          <polyline points="160,26 160,150 M116,92 160,96 204,92" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" />
          <polygon points="130,150 190,150 206,176 160,198 114,176" fill="#7a5cf0" opacity="0.22" />
        </g>
      )}
      <line x1="0" x2="320" y1={water} y2={water} stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="2 5" />
    </svg>
  );
}
