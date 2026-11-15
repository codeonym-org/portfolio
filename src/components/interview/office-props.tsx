"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { DoubleSide, PlaneGeometry } from "three";
import { rand } from "./office-kit";

/**
 * ── THE SMALL THINGS ──────────────────────────────────────────
 * What makes the office somebody's: the lamp on his desk, his mug,
 * his notebook and phone, a plant in the corner, the curtains.
 * Each is a few clean shapes, placed by its foot.
 */

type At = { position: [number, number, number]; rotation?: number };

const STEEL = { color: "#2b2d33", roughness: 0.35, metalness: 0.8 };

/** an arm lamp: a round foot, two arms, a shade turned down onto the desk, lit */
export function DeskLamp({ position, rotation = 0 }: At) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.008, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.075, 0.016, 40]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <group position={[0, 0.016, 0]} rotation={[0, 0, 0.4]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 12]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <group position={[0, 0.3, 0]} rotation={[0, 0, -1.3]}>
          <mesh castShadow>
            <sphereGeometry args={[0.012, 16, 12]} />
            <meshStandardMaterial color="#b08a4a" roughness={0.3} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.28, 12]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
          <group position={[0, 0.28, 0]} rotation={[0, 0, 1.2]}>
            {/* the shade opens downward; inside, the bulb */}
            <mesh position={[0, -0.03, 0]} castShadow>
              <cylinderGeometry args={[0.022, 0.07, 0.09, 40, 1, true]} />
              <meshStandardMaterial {...STEEL} side={DoubleSide} />
            </mesh>
            <mesh position={[0, 0.016, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.004, 24]} />
              <meshStandardMaterial {...STEEL} />
            </mesh>
            <mesh position={[0, -0.05, 0]}>
              <sphereGeometry args={[0.022, 20, 16]} />
              <meshStandardMaterial color="#fff1d6" emissive="#ffd9a0" emissiveIntensity={4} />
            </mesh>
            <pointLight position={[0, -0.1, 0]} intensity={0.55} distance={1.3} decay={2} color="#ffd9a6" />
          </group>
        </group>
      </group>
    </group>
  );
}

/** a mug of coffee, its handle to one side */
export function Mug({ position, rotation = 0 }: At) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 40, 1, true]} />
        <meshStandardMaterial color="#27434a" roughness={0.3} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.004, 40]} />
        <meshStandardMaterial color="#27434a" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.074, 0]}>
        <cylinderGeometry args={[0.0385, 0.0385, 0.002, 40]} />
        <meshStandardMaterial color="#2a160c" roughness={0.15} />
      </mesh>
      <mesh position={[0.04, 0.045, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <torusGeometry args={[0.026, 0.006, 12, 28, Math.PI]} />
        <meshStandardMaterial color="#27434a" roughness={0.3} />
      </mesh>
    </group>
  );
}

/** a closed notebook with its elastic band, and a phone lying beside it */
export function Notebook({ position, rotation = 0 }: At) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[0.148, 0.004, 0.21]} radius={0.002} smoothness={2} position={[0, 0.002, 0]} receiveShadow>
        <meshStandardMaterial color="#1d2a44" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0.002, 0.009, 0]} castShadow>
        <boxGeometry args={[0.142, 0.01, 0.204]} />
        <meshStandardMaterial color="#efe9dc" roughness={0.9} />
      </mesh>
      <RoundedBox args={[0.148, 0.004, 0.21]} radius={0.002} smoothness={2} position={[0, 0.016, 0]} castShadow>
        <meshStandardMaterial color="#1d2a44" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0.048, 0.0185, 0]}>
        <boxGeometry args={[0.008, 0.0012, 0.212]} />
        <meshStandardMaterial color="#0f1626" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Phone({ position, rotation = 0 }: At) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[0.072, 0.008, 0.15]} radius={0.0038} smoothness={3} position={[0, 0.004, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1a1b1f" roughness={0.3} metalness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.0082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.066, 0.143]} />
        <meshStandardMaterial color="#06070a" roughness={0.06} metalness={0.2} />
      </mesh>
    </group>
  );
}

/** a rubber plant in a pot: a stem, and broad glossy leaves around it, bigger lower down */
export function Plant({ position, rotation = 0, height = 1.1 }: At & { height?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => {
        const k = i / 12;
        return {
          y: 0.34 + k * (height - 0.36),
          turn: i * 2.39996 + rand(i) * 0.4,
          tilt: 0.55 + k * 0.5 + (rand(i + 20) - 0.5) * 0.2,
          size: 1.15 - k * 0.45 + (rand(i + 40) - 0.5) * 0.15,
          tone: rand(i + 60),
        };
      }),
    [height],
  );
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.125, 0.3, 40]} />
        <meshStandardMaterial color="#d9d3c8" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.302, 0]}>
        <cylinderGeometry args={[0.158, 0.158, 0.004, 40]} />
        <meshStandardMaterial color="#2b2018" roughness={1} />
      </mesh>
      <mesh position={[0, 0.3 + (height - 0.3) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.014, height - 0.3, 10]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={[0, l.y, 0]} rotation={[0, l.turn, 0]}>
          <group rotation={[l.tilt - Math.PI / 2, 0, 0]}>
            <mesh position={[0, 0.02 + 0.115 * l.size, 0]} scale={[0.062 * l.size, 0.125 * l.size, 0.006]} castShadow>
              <sphereGeometry args={[1, 20, 14]} />
              <meshStandardMaterial color={l.tone > 0.5 ? "#2f5a35" : "#27492d"} roughness={0.35} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** a curtain drawn to one side: real folds, so the light catches them */
export function Curtain({ position, width, height, colour = "#b3a793" }: { position: [number, number, number]; width: number; height: number; colour?: string }) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(width, height, 72, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / width + 0.5;
      p.setZ(i, Math.sin(u * Math.PI * 2 * 6) * 0.028 + Math.sin(u * Math.PI * 2 * 2.3 + 1) * 0.012);
    }
    g.computeVertexNormals();
    return g;
  }, [width, height]);
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshStandardMaterial color={colour} roughness={0.95} side={DoubleSide} />
    </mesh>
  );
}
