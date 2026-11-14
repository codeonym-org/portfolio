/**
 * The data behind the holographic map (`public/data/holo-map.json`).
 *
 *   node scripts/assets/holo-map.mjs <ne_110m_land.geojson> <ne_50m_admin_0_countries.geojson> \
 *                                    <ne_10m_admin_0_countries.geojson> <overpass-roads.json>
 *
 * Inputs
 * - Natural Earth (public domain), https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
 * - OpenStreetMap roads (© OpenStreetMap contributors, ODbL), fetched ONCE from the Overpass API:
 *     [out:json][timeout:60];
 *     way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](34.61,-2.01,34.75,-1.81);
 *     out geom;
 *
 * Output: every line is a flat array [lon, lat, lon, lat, …].
 * - land:    the world's coastlines, 0.1° steps
 * - borders: countries around the base (the region level), 0.05° steps
 * - home:    the base country's outline, 0.01° steps
 * - roads:   the city's roads in three classes, 0.0001° steps (about 10 m)
 *
 * The base country is drawn as the owner's country draws it: Morocco with the Sahara, as one outline.
 * The line Natural Earth puts between its "Morocco" and "Western Sahara" features is left out.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [land110, countries50, countries10, roadsFile] = process.argv.slice(2);
if (!roadsFile) throw new Error("usage: see the header of this file");
const read = (f) => JSON.parse(readFileSync(f, "utf8"));

const HOME = ["Morocco", "Western Sahara"];
const REGION = { west: -32, east: 38, south: 8, north: 62 };

const ringsOf = (geometry) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).flatMap((polygon) => polygon);
const snap = (step) => (n) => Math.round(n / step) * step;
const tidy = (n) => Number(n.toFixed(4));

/** a ring as a flat line on a grid of `step` degrees, repeats dropped */
function line(ring, step) {
  const r = snap(step);
  const out = [];
  for (const [lon, lat] of ring) {
    const x = tidy(r(lon));
    const y = tidy(r(lat));
    if (out.length && out[out.length - 2] === x && out[out.length - 1] === y) continue;
    out.push(x, y);
  }
  return out;
}

/** cut a line wherever a segment is shared with `other` (a set of "x,y|x,y" keys) */
function withoutShared(flat, other) {
  const pieces = [];
  let current = [];
  for (let i = 0; i + 3 < flat.length; i += 2) {
    const a = `${flat[i]},${flat[i + 1]}`;
    const b = `${flat[i + 2]},${flat[i + 3]}`;
    if (other.has(`${a}|${b}`) || other.has(`${b}|${a}`)) {
      if (current.length > 2) pieces.push(current);
      current = [];
    } else {
      if (!current.length) current.push(flat[i], flat[i + 1]);
      current.push(flat[i + 2], flat[i + 3]);
    }
  }
  if (current.length > 2) pieces.push(current);
  return pieces;
}
const segments = (lines) => {
  const set = new Set();
  for (const flat of lines) for (let i = 0; i + 3 < flat.length; i += 2) set.add(`${flat[i]},${flat[i + 1]}|${flat[i + 2]},${flat[i + 3]}`);
  return set;
};

/** the home country's features as one outline at `step`, the line between them removed */
function homeOutline(features, step) {
  const parts = HOME.map((name) => {
    const f = features.find((x) => x.properties.ADMIN === name || x.properties.NAME === name);
    if (!f) throw new Error(`no feature named ${name}`);
    return ringsOf(f.geometry).map((ring) => line(ring, step));
  });
  const [a, b] = parts;
  return [...a.flatMap((l) => withoutShared(l, segments(b))), ...b.flatMap((l) => withoutShared(l, segments(a)))];
}

// ── land ──
const land = read(land110)
  .features.flatMap((f) => ringsOf(f.geometry))
  .map((ring) => line(ring, 0.1))
  .filter((l) => l.length > 6);

// ── the region's borders ──
const c50 = read(countries50).features;
const inRegion = (ring) => ring.some(([lon, lat]) => lon > REGION.west && lon < REGION.east && lat > REGION.south && lat < REGION.north);
const borders = c50
  .filter((f) => !HOME.includes(f.properties.ADMIN))
  .flatMap((f) => ringsOf(f.geometry))
  .filter(inRegion)
  .map((ring) => line(ring, 0.05))
  .filter((l) => l.length > 8);

// ── the home country ──
const home = homeOutline(read(countries10).features, 0.01).filter((l) => l.length > 6);

// ── the city's roads ──
// Overpass returns a way whole, even when most of it is outside the box (a motorway runs for 100 km):
// keep only what lies within REACH_KM of the base, which is what the plate shows.
// BASE is the same point as `player.base` in src/config/player.config.ts.
const BASE = { lon: -1.91, lat: 34.68 };
const REACH_KM = 12.5;
const near = (lon, lat) => Math.hypot((lon - BASE.lon) * Math.cos((BASE.lat * Math.PI) / 180), lat - BASE.lat) * 111.2 <= REACH_KM;
function withinReach(flat) {
  const pieces = [];
  let current = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    if (near(flat[i], flat[i + 1])) current.push(flat[i], flat[i + 1]);
    else {
      if (current.length >= 4) pieces.push(current);
      current = [];
    }
  }
  if (current.length >= 4) pieces.push(current);
  return pieces;
}
const CLASS = { motorway: "major", trunk: "major", primary: "major", secondary: "minor", tertiary: "small" };
const roads = { major: [], minor: [], small: [] };
for (const way of read(roadsFile).elements) {
  const cls = CLASS[way.tags?.highway];
  if (!cls || !way.geometry) continue;
  const flat = line(way.geometry.map((p) => [p.lon, p.lat]), 0.0001);
  for (const piece of withinReach(flat)) roads[cls].push(piece);
}

const data = {
  credits: { land: "Natural Earth (public domain)", roads: "© OpenStreetMap contributors (ODbL)" },
  land,
  borders,
  home,
  roads,
};
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(data);
writeFileSync("public/data/holo-map.json", json);
const count = (lines) => lines.reduce((n, l) => n + l.length / 2, 0);
console.log(
  `wrote public/data/holo-map.json (${(json.length / 1024).toFixed(0)} kB): land ${count(land)} pts, borders ${count(borders)}, home ${count(home)}, roads ${count(roads.major)}/${count(roads.minor)}/${count(roads.small)}`,
);
