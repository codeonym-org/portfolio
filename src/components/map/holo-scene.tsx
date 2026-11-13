"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, type Group, type LineBasicMaterial, Matrix4, type Mesh, type MeshBasicMaterial, type PerspectiveCamera, Vector3 } from "three";
import { COLORS } from "@/components/scene/view";
import { damp } from "@/record/layout";

/**
 * ── THE HOLOGRAM ──────────────────────────────────────────────
 * A globe of light the visitor can turn and zoom, from the whole
 * planet down to the streets of one city. Levels 0–2 orbit the globe
 * (Globe, Region, Country); between 2 and 3 the camera leaves orbit
 * and comes down over a flat plate that carries the city's roads.
 * Everything drawn comes from `public/data/holo-map.json`.
 */

export interface HoloData {
  land: number[][];
  borders: number[][];
  home: number[][];
  roads: { major: number[][]; minor: number[][]; small: number[][] };
}

export interface HoloPlace {
  lon: number;
  lat: number;
  /** where to centre the country level: the middle of the country, not the city */
  country: { lon: number; lat: number };
}

export const LEVELS = ["Globe", "Region", "Country", "City"] as const;

const DEG = Math.PI / 180;
const Y = new Vector3(0, 1, 0);
/** camera distance from the globe's centre at levels 0, 1 and 2 */
const ORBIT = [3.7, 1.95, 1.6];
/** plate units per degree of latitude at the city level (0.1° is about 11 km) */
const CITY_SCALE = 4;
const KM = CITY_SCALE / 111.2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function onGlobe(lon: number, lat: number, r = 1, out = new Vector3()) {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  return out.set(r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lambda));
}

/** flat [lon, lat, …] lines → one geometry of line segments on the globe */
function globeLines(lines: number[][], r: number) {
  const points: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  for (const flat of lines) {
    for (let i = 0; i + 3 < flat.length; i += 2) {
      // a jump across the date line is not a coast
      if (Math.abs(flat[i] - flat[i + 2]) > 90) continue;
      onGlobe(flat[i], flat[i + 1], r, a);
      onGlobe(flat[i + 2], flat[i + 3], r, b);
      points.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  return segmentGeometry(points);
}

function segmentGeometry(points: number[]) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  return g;
}

function graticule() {
  const lines: number[][] = [];
  for (let lat = -75; lat <= 75; lat += 15) lines.push(Array.from({ length: 121 }, (_, i) => [-180 + i * 3, lat]).flat());
  for (let lon = -180; lon < 180; lon += 15) lines.push(Array.from({ length: 57 }, (_, i) => [lon, -84 + i * 3]).flat());
  return globeLines(lines, 1.001);
}

/** the city's roads on the plate: x east, z south, the place at the origin */
function plateLines(lines: number[][], place: HoloPlace) {
  const points: number[] = [];
  const kx = Math.cos(place.lat * DEG) * CITY_SCALE;
  for (const flat of lines) {
    for (let i = 0; i + 3 < flat.length; i += 2) {
      points.push((flat[i] - place.lon) * kx, 0, -(flat[i + 1] - place.lat) * CITY_SCALE, (flat[i + 2] - place.lon) * kx, 0, -(flat[i + 3] - place.lat) * CITY_SCALE);
    }
  }
  return segmentGeometry(points);
}

function rings(radii: number[]) {
  const points: number[] = [];
  for (const r of radii) {
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const b = ((i + 1) / 96) * Math.PI * 2;
      points.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r);
    }
  }
  // the cross through the place
  const reach = Math.max(...radii) * 1.08;
  points.push(-reach, 0, 0, reach, 0, 0, 0, 0, -reach, 0, 0, reach);
  return segmentGeometry(points);
}

interface Control {
  /** the level asked for by the steps (0–3), with a counter so the same level can be asked twice */
  want: { level: number; n: number };
  still: boolean;
  onLevel: (level: number) => void;
}

function Hologram({ data, place, want, still, onLevel }: Control & { data: HoloData | null; place: HoloPlace }) {
  const { camera, gl, size } = useThree();
  const view = useRef({ z: still ? 2 : 0, zWant: still ? 2 : 0, lon: place.lon + (still ? 0 : 55), lat: still ? place.country.lat : 12, lonWant: place.lon, latWant: place.lat, yaw: 0, yawWant: 0, touched: still, shown: -1, born: 0 });

  const geometry = useMemo(
    () => ({
      grid: graticule(),
      land: data ? globeLines(data.land, 1.002) : null,
      borders: data ? globeLines(data.borders, 1.002) : null,
      home: data ? globeLines(data.home, 1.004) : null,
      major: data ? plateLines(data.roads.major, place) : null,
      minor: data ? plateLines(data.roads.minor, place) : null,
      small: data ? plateLines(data.roads.small, place) : null,
      rings: rings([2 * KM, 5 * KM, 10 * KM]),
    }),
    [data, place],
  );
  useEffect(() => () => Object.values(geometry).forEach((g) => g?.dispose()), [geometry]);

  /** the place on the globe, and the plate's frame there: x east, y out, z south */
  const frame = useMemo(() => {
    const p = onGlobe(place.lon, place.lat);
    const out = p.clone().normalize();
    const east = new Vector3().crossVectors(Y, out).normalize();
    const south = new Vector3().crossVectors(east, out).normalize();
    return { p, out, east, south, matrix: new Matrix4().makeBasis(east, out, south).setPosition(p) };
  }, [place]);

  const centreOn = (level: number) => {
    const v = view.current;
    const target = level === 2 ? place.country : place;
    v.lonWant = target.lon;
    v.latWant = target.lat;
  };

  // the steps
  useEffect(() => {
    if (!want.n) return;
    const v = view.current;
    v.touched = true;
    v.zWant = want.level;
    v.yawWant = 0;
    centreOn(want.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);

  // drag turns, wheel and pinch zoom
  useEffect(() => {
    const el = gl.domElement;
    const fingers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const spread = () => {
      const [a, b] = [...fingers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) pinch = spread();
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const from = fingers.get(e.pointerId);
      if (!from) return;
      const v = view.current;
      v.touched = true;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size >= 2) {
        const now = spread();
        if (pinch > 0 && now > 0) v.zWant = clamp(v.zWant + Math.log(now / pinch) * 1.6, 0, 3);
        pinch = now;
        return;
      }
      if (v.z > 2.5) {
        v.yawWant -= dx * 0.006;
      } else {
        // the closer the camera, the less one pixel turns the globe
        const reach = (ORBIT[Math.min(2, Math.round(v.z))] - 0.9) * 0.14;
        v.lonWant -= dx * reach;
        v.latWant = clamp(v.latWant + dy * reach, -80, 80);
      }
    };
    const up = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      pinch = 0;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      v.touched = true;
      v.zWant = clamp(v.zWant - clamp(e.deltaY, -120, 120) * 0.0045, 0, 3);
      // zooming in from far away comes down on the place, not on wherever the globe was turned to
      if (e.deltaY < 0 && v.zWant > 2.2) centreOn(3);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  const land = useRef<LineBasicMaterial>(null);
  const borders = useRef<LineBasicMaterial>(null);
  const home = useRef<LineBasicMaterial>(null);
  const grid = useRef<LineBasicMaterial>(null);
  const major = useRef<LineBasicMaterial>(null);
  const minor = useRef<LineBasicMaterial>(null);
  const small = useRef<LineBasicMaterial>(null);
  const ringLines = useRef<LineBasicMaterial>(null);
  const plate = useRef<Group>(null);
  const ping = useRef<Mesh>(null);
  const pingMaterial = useRef<MeshBasicMaterial>(null);
  const dot = useRef<Mesh>(null);
  const scratch = useMemo(() => ({ orbit: new Vector3(), city: new Vector3(), look: new Vector3(), up: new Vector3(), arm: new Vector3() }), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const v = view.current;
    const t = clock.elapsedTime;
    if (!v.born) v.born = t;

    // the opening flight: globe, region, country, city, unless the visitor takes over
    if (!v.touched) {
      const age = t - v.born;
      const level = age > 5.2 ? 3 : age > 3.2 ? 2 : age > 1.1 ? 1 : 0;
      if (level !== v.zWant) {
        v.zWant = level;
        centreOn(level);
      }
    }

    v.z = damp(v.z, v.zWant, 2.3, dt);
    v.lon = damp(v.lon, v.lonWant, 3.2, dt);
    v.lat = damp(v.lat, v.latWant, 3.2, dt);
    v.yaw = damp(v.yaw, v.yawWant, 5, dt);
    const level = Math.round(v.z);
    if (level !== v.shown) {
      v.shown = level;
      onLevel(level);
    }

    const cam = camera as PerspectiveCamera;
    // a narrow screen steps back so the same ground fits
    const aspect = size.width / size.height;
    const fit = aspect < 1 ? clamp(0.85 / aspect, 1, 2) : 1;
    const zo = Math.min(v.z, 2);
    const i = Math.min(1, Math.floor(zo));
    const orbit = Math.exp(Math.log(ORBIT[i]) + (Math.log(ORBIT[i + 1]) - Math.log(ORBIT[i])) * (zo - i));
    onGlobe(v.lon, v.lat, 1 + (orbit - 1) * (1 + (fit - 1) * 0.7), scratch.orbit);

    const down = smooth(2, 3, v.z);
    scratch.arm.copy(frame.south).applyAxisAngle(frame.out, v.yaw);
    scratch.city.copy(frame.p).addScaledVector(frame.out, 1.05 * fit).addScaledVector(scratch.arm, 0.95 * fit);
    cam.position.lerpVectors(scratch.orbit, scratch.city, down);
    scratch.look.copy(frame.p).multiplyScalar(down);
    cam.up.copy(scratch.up.copy(Y).lerp(frame.out, down).normalize());
    cam.lookAt(scratch.look);

    const flicker = 0.94 + Math.sin(t * 31) * 0.03 + Math.sin(t * 7.3) * 0.03;
    if (grid.current) grid.current.opacity = 0.1 * (1 - down * 0.7);
    if (land.current) land.current.opacity = (0.85 - down * 0.7) * flicker;
    if (borders.current) borders.current.opacity = smooth(0.45, 1, v.z) * 0.42 * (1 - down * 0.85);
    if (home.current) home.current.opacity = (1 - down * 0.75) * flicker;
    const city = smooth(2.2, 2.95, v.z);
    if (plate.current) {
      plate.current.visible = city > 0.01;
      plate.current.scale.setScalar(0.25 + 0.75 * city);
    }
    if (major.current) major.current.opacity = city * flicker;
    if (minor.current) minor.current.opacity = city * 0.6;
    if (small.current) small.current.opacity = city * 0.3;
    if (ringLines.current) ringLines.current.opacity = city * 0.45;

    // the place: a point, and a ring that keeps opening around it
    const beat = (t * 0.6) % 1;
    const far = 0.012 + (1 - Math.min(v.z, 2) / 2) * 0.05;
    if (ping.current) ping.current.scale.setScalar(far * (0.6 + beat * 2.6) * (1 - city * 0.5));
    if (pingMaterial.current) pingMaterial.current.opacity = (1 - beat) * 0.9;
    if (dot.current) dot.current.scale.setScalar(far * 0.34 * (1 - city * 0.5));
  });

  const blue = COLORS.system;
  const gold = COLORS.gold;
  const line = { transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false } as const;

  return (
    <>
      {/* the body of the globe: dark, so the far side stays hidden */}
      <mesh>
        <sphereGeometry args={[0.997, 96, 64]} />
        <meshBasicMaterial color="#030812" transparent opacity={0.92} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial color={blue} transparent opacity={0.045} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <lineSegments geometry={geometry.grid}>
        <lineBasicMaterial ref={grid} color={blue} {...line} opacity={0.1} />
      </lineSegments>
      {geometry.land && (
        <lineSegments geometry={geometry.land}>
          <lineBasicMaterial ref={land} color={blue} {...line} />
        </lineSegments>
      )}
      {geometry.borders && (
        <lineSegments geometry={geometry.borders}>
          <lineBasicMaterial ref={borders} color={blue} {...line} opacity={0} />
        </lineSegments>
      )}
      {geometry.home && (
        <lineSegments geometry={geometry.home}>
          <lineBasicMaterial ref={home} color={gold} {...line} />
        </lineSegments>
      )}

      <group matrix={frame.matrix} matrixAutoUpdate={false}>
        <mesh ref={ping} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
          <ringGeometry args={[0.82, 1, 48]} />
          <meshBasicMaterial ref={pingMaterial} color={gold} transparent depthTest={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={dot} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color={gold} transparent opacity={0.95} depthTest={false} toneMapped={false} />
        </mesh>
        <group ref={plate} visible={false}>
          <lineSegments geometry={geometry.rings} renderOrder={3}>
            <lineBasicMaterial ref={ringLines} color={gold} {...line} depthTest={false} opacity={0} />
          </lineSegments>
          {geometry.small && (
            <lineSegments geometry={geometry.small} renderOrder={3}>
              <lineBasicMaterial ref={small} color={blue} {...line} depthTest={false} opacity={0} />
            </lineSegments>
          )}
          {geometry.minor && (
            <lineSegments geometry={geometry.minor} renderOrder={4}>
              <lineBasicMaterial ref={minor} color={blue} {...line} depthTest={false} opacity={0} />
            </lineSegments>
          )}
          {geometry.major && (
            <lineSegments geometry={geometry.major} renderOrder={4}>
              <lineBasicMaterial ref={major} color="#d9f3ff" {...line} depthTest={false} opacity={0} />
            </lineSegments>
          )}
        </group>
      </group>
    </>
  );
}

export default function HoloScene(props: Control & { data: HoloData | null; place: HoloPlace }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 36, near: 0.01, far: 30, position: [0, 0, 3.7] }} gl={{ antialias: true, alpha: true }} style={{ touchAction: "none" }}>
      <Hologram {...props} />
    </Canvas>
  );
}
