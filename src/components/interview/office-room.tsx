"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox, useGLTF } from "@react-three/drei";
import { CanvasTexture, Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Object3D } from "three";

/**
 * ── THE OFFICE ────────────────────────────────────────────────
 * The room and what stands in it, built here from clean shapes: a
 * desk of oak with his laptop, his papers, a pen and a glass of
 * water; behind him a window onto the city at dusk between two
 * curtains, shelves of books, two prints, a floor lamp. Only his
 * chair is a model. Every surface that needs one gets a texture
 * drawn on a canvas (wood grain, planks, written lines, the sky).
 */

export const CHAIR = "/models/office/chair.glb";
const DRACO = "/draco/";

/** the room, in metres: the floor, the far wall, the side walls, the ceiling */
export const ROOM = { floor: -0.74, back: -1.5, side: 2.4, ceiling: 1.95 };
/** the desk: the height of its top, its centre, its size */
const DESK = { top: 0, x: 0.3, z: 0.7, width: 1.8, depth: 0.78, thick: 0.035 };

/** a number in 0..1 from an integer, the same every time */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function canvasTexture(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** wood: a base colour with long, slightly wavy grain lines */
function useWood(base: string, grain: string, seed: number) {
  return useMemo(
    () =>
      canvasTexture(512, 512, (g) => {
        g.fillStyle = base;
        g.fillRect(0, 0, 512, 512);
        g.strokeStyle = grain;
        for (let i = 0; i < 150; i++) {
          const y = rand(seed + i) * 512;
          g.globalAlpha = 0.05 + rand(seed + i * 3) * 0.14;
          g.lineWidth = 0.5 + rand(seed + i * 7) * 1.6;
          g.beginPath();
          g.moveTo(0, y);
          for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 3 + (rand(seed + i + x) - 0.5) * 1.5);
          g.stroke();
        }
        g.globalAlpha = 1;
      }),
    [base, grain, seed],
  );
}

/** a wood floor: planks of slightly different tones, with dark joints */
function usePlanks() {
  return useMemo(() => {
    const t = canvasTexture(1024, 1024, (g) => {
      const tones = ["#6b4a33", "#73513a", "#654530", "#7a563d", "#5f412d"];
      const rows = 12;
      const h = 1024 / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rand(r) * 300;
        for (let k = 0; x < 1024; k++) {
          const w = 260 + rand(r * 17 + k) * 240;
          g.fillStyle = tones[Math.floor(rand(r * 31 + k * 7) * tones.length)];
          g.fillRect(x, r * h, w, h);
          g.strokeStyle = "#2a1c12";
          g.globalAlpha = 0.08;
          for (let i = 0; i < 9; i++) {
            const y = r * h + rand(r * 53 + k * 11 + i) * h;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + w, y + (rand(i + k) - 0.5) * 4);
            g.stroke();
          }
          g.globalAlpha = 0.55;
          g.strokeRect(x, r * h, w, h);
          g.globalAlpha = 1;
          x += w;
        }
      }
    });
    if (t) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(2.4, 3);
    }
    return t;
  }, []);
}

/** a written page: a title and lines of text, as grey strokes */
function usePage(seed: number) {
  return useMemo(
    () =>
      canvasTexture(256, 360, (g) => {
        g.fillStyle = "#f4f1ea";
        g.fillRect(0, 0, 256, 360);
        g.fillStyle = "#2b2b30";
        g.fillRect(28, 30, 110 + rand(seed) * 50, 9);
        g.fillStyle = "#8b8b93";
        for (let i = 0; i < 26; i++) {
          if (i % 7 === 6) continue;
          g.fillRect(28, 58 + i * 11, 120 + rand(seed + i) * 80, 3.5);
        }
      }),
    [seed],
  );
}

/** the sky at dusk over the city: a gradient, a far and a near skyline, lit windows */
function useDusk() {
  return useMemo(
    () =>
      canvasTexture(1024, 1024, (g) => {
        const sky = g.createLinearGradient(0, 0, 0, 1024);
        sky.addColorStop(0, "#131c3d");
        sky.addColorStop(0.45, "#3a4a80");
        sky.addColorStop(0.7, "#9a7289");
        sky.addColorStop(0.86, "#e39a6c");
        sky.addColorStop(1, "#f3bd7c");
        g.fillStyle = sky;
        g.fillRect(0, 0, 1024, 1024);
        // a few stars high up
        g.fillStyle = "#ffffff";
        for (let i = 0; i < 60; i++) {
          g.globalAlpha = 0.25 + rand(i) * 0.5;
          g.fillRect(rand(i * 3) * 1024, rand(i * 7) * 380, 1.6, 1.6);
        }
        g.globalAlpha = 1;
        const skyline = (base: number, colour: string, seed: number, min: number, max: number, lights: number) => {
          let x = -20;
          for (let i = 0; x < 1024; i++) {
            const w = 38 + rand(seed + i) * 70;
            const h = min + rand(seed + i * 5) * (max - min);
            g.fillStyle = colour;
            g.fillRect(x, base - h, w, h + 40);
            if (rand(seed + i * 9) > 0.7) g.fillRect(x + w * 0.45, base - h - 26, 3, 26);
            for (let r = 0; r < h / 13 - 1; r++)
              for (let c = 0; c < w / 11 - 1; c++)
                if (rand(seed + i * 131 + r * 17 + c * 3) < lights) {
                  g.fillStyle = rand(i + r + c) > 0.3 ? "#ffd58a" : "#bfe0ff";
                  g.globalAlpha = 0.55 + rand(r * c + i) * 0.45;
                  g.fillRect(x + 5 + c * 11, base - h + 7 + r * 13, 5, 6);
                  g.globalAlpha = 1;
                }
            x += w + 2;
          }
        };
        skyline(1024, "#39375c", 11, 150, 330, 0.1);
        skyline(1024, "#151729", 47, 60, 240, 0.22);
      }),
    [],
  );
}

/** a curtain: vertical folds, light on the ridges */
function useFolds() {
  return useMemo(
    () =>
      canvasTexture(256, 64, (g) => {
        for (let x = 0; x < 256; x++) {
          const v = 0.5 + 0.5 * Math.sin((x / 256) * Math.PI * 2 * 7);
          const l = Math.round(96 + v * 70);
          g.fillStyle = `rgb(${l},${Math.round(l * 0.92)},${Math.round(l * 0.82)})`;
          g.fillRect(x, 0, 1, 64);
        }
      }),
    [],
  );
}

export function prepare(root: Object3D, shadows: boolean) {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.name.toLowerCase().startsWith("icosphere")) mesh.visible = false;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    const m = mesh.material as MeshStandardMaterial;
    if (m.map) m.map.colorSpace = SRGBColorSpace;
    m.metalness = Math.min(m.metalness, 0.05);
    m.envMapIntensity = 0.5;
  });
}

function Laptop() {
  // open toward him: the stranger sees the back of the lid
  return (
    <group position={[DESK.x + 0.22, DESK.top, DESK.z - 0.08]} rotation={[0, 0.2, 0]}>
      <RoundedBox args={[0.34, 0.014, 0.235]} radius={0.006} smoothness={3} position={[0, 0.007, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#9a9ca3" metalness={0.85} roughness={0.32} />
      </RoundedBox>
      <group position={[0, 0.014, 0.115]} rotation={[0.3, 0, 0]}>
        <RoundedBox args={[0.34, 0.225, 0.007]} radius={0.0034} smoothness={3} position={[0, 0.1125, 0]} castShadow>
          <meshStandardMaterial color="#8d9097" metalness={0.85} roughness={0.3} />
        </RoundedBox>
        {/* a mark on the lid */}
        <mesh position={[0, 0.115, 0.0038]}>
          <circleGeometry args={[0.02, 40]} />
          <meshStandardMaterial color="#c9ccd3" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* the screen, lit, on his side */}
        <mesh position={[0, 0.1125, -0.0038]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.322, 0.207]} />
          <meshBasicMaterial color="#cfe0ff" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.14, -0.2]} intensity={0.06} distance={1} decay={2} color="#cfe0ff" />
      </group>
    </group>
  );
}

function Papers() {
  const top = usePage(3);
  const sheet = usePage(8);
  return (
    <>
      {/* the stack */}
      <group position={[DESK.x + 0.6, DESK.top, DESK.z - 0.12]} rotation={[0, -0.25, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[(rand(i) - 0.5) * 0.012, 0.003 + i * 0.006, (rand(i + 9) - 0.5) * 0.012]} rotation={[0, (rand(i + 4) - 0.5) * 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.21, 0.006, 0.297]} />
            <meshStandardMaterial color="#efece4" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.0305, 0]} rotation={[-Math.PI / 2, 0, 0.04]}>
          <planeGeometry args={[0.21, 0.297]} />
          <meshStandardMaterial map={top} roughness={0.9} />
        </mesh>
      </group>
      {/* the sheet in front of him, and his pen */}
      <mesh position={[DESK.x - 0.2, DESK.top + 0.0012, DESK.z - 0.12]} rotation={[-Math.PI / 2, 0, 0.18]} receiveShadow>
        <planeGeometry args={[0.21, 0.297]} />
        <meshStandardMaterial map={sheet} roughness={0.9} />
      </mesh>
      <group position={[DESK.x - 0.05, DESK.top + 0.006, DESK.z - 0.1]} rotation={[0, 0.9, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.005, 0.005, 0.13, 16]} />
          <meshStandardMaterial color="#1b1d24" roughness={0.35} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.073, 0]}>
          <coneGeometry args={[0.005, 0.016, 16]} />
          <meshStandardMaterial color="#b9bcc4" roughness={0.3} metalness={0.9} />
        </mesh>
      </group>
    </>
  );
}

function Glass() {
  return (
    <group position={[DESK.x - 0.52, DESK.top, DESK.z + 0.08]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.036, 0.03, 0.12, 40, 1, true]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.04} metalness={0} transparent opacity={0.22} envMapIntensity={2} side={2} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.004, 40]} />
        <meshPhysicalMaterial color="#e9f2f5" roughness={0.05} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.042, 0]}>
        <cylinderGeometry args={[0.0335, 0.0295, 0.076, 40]} />
        <meshPhysicalMaterial color="#cfe6ee" roughness={0.02} transparent opacity={0.35} envMapIntensity={1.6} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Desk() {
  const oak = useWood("#c9a67a", "#7a5632", 5);
  const dark = useWood("#5a4332", "#2a1c12", 21);
  const { top, x, z, width, depth, thick } = DESK;
  const legH = top - thick - ROOM.floor;
  return (
    <group>
      <RoundedBox args={[width, thick, depth]} radius={0.012} smoothness={3} position={[x, top - thick / 2, z]} castShadow receiveShadow>
        <meshStandardMaterial map={oak} roughness={0.45} />
      </RoundedBox>
      {/* two slab legs and the front panel (the scan ends at his knees, and nobody needs to see that) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[x + s * (width / 2 - 0.06), ROOM.floor + legH / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[0.04, legH, depth - 0.12]} />
          <meshStandardMaterial map={dark} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[x, ROOM.floor + legH / 2 + 0.06, z + depth / 2 - 0.1]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.16, legH - 0.12, 0.025]} />
        <meshStandardMaterial map={dark} roughness={0.5} />
      </mesh>
      <Laptop />
      <Papers />
      <Glass />
    </group>
  );
}

/** books on a shelf: muted spines of different heights */
function Shelf({ position, seed }: { position: [number, number, number]; seed: number }) {
  const wood = useWood("#5a4332", "#2a1c12", 33);
  const books = useMemo(() => {
    const colors = ["#3b4a5a", "#6b4a3a", "#2f3a33", "#8a7a62", "#4a3b52", "#5a5a5a", "#7a3b32", "#2e2e36", "#b9a98a", "#27445a"];
    let x = -0.44;
    const out: { x: number; h: number; w: number; d: number; c: string; tilt: number }[] = [];
    for (let i = 0; x < 0.3; i++) {
      const w = 0.022 + rand(seed + i) * 0.03;
      const h = 0.19 + rand(seed + i * 3) * 0.09;
      out.push({ x: x + w / 2, h, w, d: 0.14 + rand(seed + i * 5) * 0.04, c: colors[Math.floor(rand(seed + i * 7) * colors.length)], tilt: 0 });
      x += w + 0.002;
    }
    // the last one leans on the others
    const last = out[out.length - 1];
    last.tilt = 0.22;
    last.x += 0.02;
    return out;
  }, [seed]);
  return (
    <group position={position}>
      <RoundedBox args={[1, 0.03, 0.24]} radius={0.006} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial map={wood} roughness={0.55} />
      </RoundedBox>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, 0.015 + b.h / 2, -0.02]} rotation={[0, 0, b.tilt]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.c} roughness={0.75} />
        </mesh>
      ))}
      {/* a small pot at the end of the shelf */}
      <mesh position={[0.41, 0.055, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.08, 24]} />
        <meshStandardMaterial color="#d8d2c6" roughness={0.6} />
      </mesh>
      <mesh position={[0.41, 0.12, 0]} castShadow>
        <icosahedronGeometry args={[0.05, 1]} />
        <meshStandardMaterial color="#3f5a3a" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Print({ position, size, colours }: { position: [number, number, number]; size: [number, number]; colours: [string, string, string] }) {
  const [w, h] = size;
  return (
    <group position={position}>
      <RoundedBox args={[w, h, 0.03]} radius={0.004} smoothness={2} castShadow>
        <meshStandardMaterial color="#1c1916" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0155]}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshStandardMaterial color="#efe9dd" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.0165]}>
        <planeGeometry args={[w - 0.16, h - 0.16]} />
        <meshStandardMaterial color={colours[0]} roughness={0.95} />
      </mesh>
      <mesh position={[-w * 0.08, h * 0.03, 0.0175]}>
        <circleGeometry args={[Math.min(w, h) * 0.2, 48]} />
        <meshStandardMaterial color={colours[1]} roughness={0.95} />
      </mesh>
      <mesh position={[w * 0.1, -h * 0.07, 0.0185]}>
        <circleGeometry args={[Math.min(w, h) * 0.13, 48]} />
        <meshStandardMaterial color={colours[2]} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Window() {
  const dusk = useDusk();
  const folds = useFolds();
  const frame = <meshStandardMaterial color="#2a2522" roughness={0.45} />;
  const W = 1.5;
  const H = 1.3;
  return (
    <group position={[1.3, 0.93, ROOM.back]}>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={dusk} toneMapped={false} />
      </mesh>
      {/* the frame, a mullion and a transom, the sill */}
      {[-W / 2, 0, W / 2].map((x) => (
        <mesh key={x} position={[x, 0, 0.035]} castShadow>
          <boxGeometry args={[x === 0 ? 0.035 : 0.07, H + 0.07, 0.07]} />
          {frame}
        </mesh>
      ))}
      {[-H / 2, 0.22, H / 2].map((y) => (
        <mesh key={y} position={[0, y, 0.035]} castShadow>
          <boxGeometry args={[W + 0.07, y === 0.22 ? 0.035 : 0.07, 0.07]} />
          {frame}
        </mesh>
      ))}
      <mesh position={[0, -H / 2 - 0.045, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.2, 0.03, 0.16]} />
        <meshStandardMaterial color="#e6e0d6" roughness={0.6} />
      </mesh>
      {/* curtains, drawn back on both sides, on a rail */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.16), -0.05, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.34, H + 0.42, 0.06]} />
          <meshStandardMaterial map={folds} color="#cfc4b4" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, H / 2 + 0.2, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, W + 0.8, 12]} />
        <meshStandardMaterial color="#2a2522" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.15, 0.024, 32]} />
        <meshStandardMaterial color="#26221f" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 12]} />
        <meshStandardMaterial color="#26221f" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.13, 0.19, 0.3, 32, 1, true]} />
        <meshStandardMaterial color="#f3e2c4" emissive="#ffcf8f" emissiveIntensity={1.1} roughness={0.9} side={2} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={2.4} distance={4} decay={1.7} color="#ffd29c" />
    </group>
  );
}

export function Room() {
  const { floor, back, side, ceiling } = ROOM;
  const planks = usePlanks();
  const h = ceiling - floor;
  const wall = "#cfc6ba";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floor, 0.5]} receiveShadow>
        <planeGeometry args={[side * 2, 6]} />
        <meshStandardMaterial map={planks} roughness={0.5} />
      </mesh>
      {/* a rug under the desk, with a border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, floor + 0.004, 0.5]} receiveShadow>
        <planeGeometry args={[3, 2.2]} />
        <meshStandardMaterial color="#8b8478" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, floor + 0.006, 0.5]} receiveShadow>
        <planeGeometry args={[2.76, 1.96]} />
        <meshStandardMaterial color="#5d6470" roughness={1} />
      </mesh>
      <mesh position={[0, floor + h / 2, back]} receiveShadow>
        <planeGeometry args={[side * 2, h]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * side, floor + h / 2, 0.5]} rotation={[0, -s * (Math.PI / 2), 0]} receiveShadow>
          <planeGeometry args={[6, h]} />
          <meshStandardMaterial color="#c4baad" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, ceiling, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[side * 2, 6]} />
        <meshStandardMaterial color="#e9e4dc" roughness={1} />
      </mesh>
      {/* skirting, and a rail at chair height with panels under it */}
      <mesh position={[0, floor + 0.06, back + 0.012]} receiveShadow>
        <boxGeometry args={[side * 2, 0.12, 0.024]} />
        <meshStandardMaterial color="#efeae2" roughness={0.6} />
      </mesh>
      <mesh position={[0, floor + 0.95, back + 0.014]} castShadow receiveShadow>
        <boxGeometry args={[side * 2, 0.045, 0.028]} />
        <meshStandardMaterial color="#efeae2" roughness={0.6} />
      </mesh>
      <mesh position={[0, floor + 0.53, back + 0.004]} receiveShadow>
        <planeGeometry args={[side * 2, 0.8]} />
        <meshStandardMaterial color="#e2dcd2" roughness={0.9} />
      </mesh>
      {[-1.9, -1.1, -0.3, 0.5, 1.3, 2.1].map((x) => (
        <mesh key={x} position={[x, floor + 0.53, back + 0.01]} receiveShadow>
          <boxGeometry args={[0.66, 0.6, 0.012]} />
          <meshStandardMaterial color="#e9e4dc" roughness={0.8} />
        </mesh>
      ))}

      <Window />
      <Shelf position={[-1.3, 0.3, back + 0.13]} seed={1} />
      <Print position={[-1.56, 0.82, back + 0.02]} size={[0.42, 0.36]} colours={["#e7dfd0", "#7c5cff", "#3fb8e8"]} />
      <Print position={[-1.06, 0.82, back + 0.02]} size={[0.42, 0.36]} colours={["#e7dfd0", "#e8a15c", "#2f3a4a"]} />
      <FloorLamp position={[-2.05, floor, back + 0.45]} />
    </group>
  );
}

export function Furniture() {
  const chair = useGLTF(CHAIR, DRACO);
  useEffect(() => prepare(chair.scene, true), [chair.scene]);
  return (
    <>
      <Desk />
      <primitive object={chair.scene} position={[0, -0.265, -0.06]} scale={0.5} />
    </>
  );
}

useGLTF.preload(CHAIR, DRACO);
