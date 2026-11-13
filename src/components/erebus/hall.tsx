"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { BackSide, Object3D, RepeatWrapping, SRGBColorSpace, type InstancedMesh, type MeshBasicMaterial, type PointLight, type Texture } from "three";
import { game } from "@/erebus/game";
import { ARENA } from "@/erebus/sim";

/**
 * The sealed hall: a round chamber of cut stone with no way out. The
 * fight happens inside the ring of columns; behind them, in the
 * ambulatory, stand the statues, the colossus and the door that shut.
 * Stone textures: Poly Haven, CC0 (scripts/assets/README.md).
 */

export const HALL = {
  /** the columns stand just outside the floor the hunter can reach */
  columns: ARENA + 2.4,
  /** where the statues stand */
  aisle: ARENA + 6.5,
  wall: ARENA + 11,
  height: 24,
};
const COLUMNS = 16;

const TEXTURES = ["/textures/erebus/floor.webp", "/textures/erebus/floor-normal.webp", "/textures/erebus/wall.webp", "/textures/erebus/wall-normal.webp"];
useTexture.preload(TEXTURES);

/** a copy of a texture that repeats; the loaded one is shared and stays as it is */
function tiled(source: Texture, x: number, y: number, color: boolean) {
  const t = source.clone();
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(x, y);
  if (color) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const TORCH = "#ff8a3a";

export function Hall() {
  const [floor, floorN, wall, wallN] = useTexture(TEXTURES);
  const maps = useMemo(
    () => ({
      floor: tiled(floor, 20, 20, true),
      floorN: tiled(floorN, 20, 20, false),
      wall: tiled(wall, 30, 4, true),
      wallN: tiled(wallN, 30, 4, false),
      column: tiled(wall, 2, 7, true),
      columnN: tiled(wallN, 2, 7, false),
      step: tiled(wall, 6, 1, true),
    }),
    [floor, floorN, wall, wallN],
  );
  const shafts = useRef<InstancedMesh>(null);
  const blocks = useRef<InstancedMesh>(null);
  const flames = useRef<InstancedMesh>(null);
  const flameMat = useRef<MeshBasicMaterial>(null);
  const lights = useRef<(PointLight | null)[]>([]);

  useLayoutEffect(() => {
    const s = shafts.current;
    const b = blocks.current;
    const f = flames.current;
    if (!s || !b || !f) return;
    const o = new Object3D();
    for (let i = 0; i < COLUMNS; i++) {
      const a = ((i + 0.5) / COLUMNS) * Math.PI * 2;
      const x = Math.sin(a) * HALL.columns;
      const z = Math.cos(a) * HALL.columns;
      o.rotation.set(0, a, 0);
      o.scale.setScalar(1);
      o.position.set(x, HALL.height / 2, z);
      o.updateMatrix();
      s.setMatrixAt(i, o.matrix);
      // a base and a capital for each shaft
      o.position.set(x, 0.7, z);
      o.updateMatrix();
      b.setMatrixAt(i * 2, o.matrix);
      o.position.set(x, HALL.height - 0.7, z);
      o.updateMatrix();
      b.setMatrixAt(i * 2 + 1, o.matrix);
      // a torch on the side that faces the floor
      o.position.set(Math.sin(a) * (HALL.columns - 1.75), 5.2, Math.cos(a) * (HALL.columns - 1.75));
      o.scale.set(0.3, 0.55, 0.3);
      o.updateMatrix();
      f.setMatrixAt(i, o.matrix);
    }
    s.instanceMatrix.needsUpdate = b.instanceMatrix.needsUpdate = f.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // the System turning the light off takes the torches with it
    const dark = game.sim?.twist?.kind === "blackout" ? 0.08 : 1;
    const flicker = 0.85 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23.7) * 0.05;
    flameMat.current?.color.set(TORCH).multiplyScalar(2.2 * flicker * dark);
    lights.current.forEach((l, i) => {
      if (l) l.intensity = (260 + Math.sin(t * 9 + i * 2.1) * 40) * dark;
    });
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[HALL.wall + 0.5, 96]} />
        <meshStandardMaterial map={maps.floor} normalMap={maps.floorN} color="#c9c4dc" roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, HALL.height / 2, 0]}>
        <cylinderGeometry args={[HALL.wall, HALL.wall, HALL.height, 96, 1, true]} />
        <meshStandardMaterial map={maps.wall} normalMap={maps.wallN} color="#b8b3cc" roughness={0.95} side={BackSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL.height, 0]}>
        <circleGeometry args={[HALL.wall + 0.5, 48]} />
        <meshStandardMaterial color="#0b0a10" roughness={1} />
      </mesh>

      <instancedMesh ref={shafts} args={[undefined, undefined, COLUMNS]} frustumCulled={false}>
        <cylinderGeometry args={[1.45, 1.6, HALL.height, 14, 1, true]} />
        <meshStandardMaterial map={maps.column} normalMap={maps.columnN} color="#9a95b4" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={blocks} args={[undefined, undefined, COLUMNS * 2]} frustumCulled={false}>
        <boxGeometry args={[4.1, 1.4, 4.1]} />
        <meshStandardMaterial map={maps.step} color="#8d88a6" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[undefined, undefined, COLUMNS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 1]} />
        <meshBasicMaterial ref={flameMat} color={TORCH} toneMapped={false} />
      </instancedMesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <pointLight
            key={i}
            ref={(l) => {
              lights.current[i] = l;
            }}
            color={TORCH}
            intensity={170}
            distance={70}
            decay={1.7}
            position={[Math.sin(a) * (ARENA - 6), 7, Math.cos(a) * (ARENA - 6)]}
          />
        );
      })}

      {/* the dais at the north end, where the colossus stands */}
      <group position={[0, 0, -HALL.aisle - 1]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.45 + i * 0.9, 0]}>
            <cylinderGeometry args={[8.5 - i * 1.5, 8.9 - i * 1.5, 0.9, 8]} />
            <meshStandardMaterial map={maps.step} color="#8d88a6" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* the door at the south end: it closed behind you, and the seam still glows */}
      <group position={[0, 0, HALL.wall - 0.6]}>
        <mesh position={[0, 8, 0]}>
          <boxGeometry args={[13, 16, 1.2]} />
          <meshStandardMaterial color="#17141f" roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0, 8, -0.65]}>
          <boxGeometry args={[0.14, 15.4, 0.1]} />
          <meshBasicMaterial color="#ff3b2f" toneMapped={false} />
        </mesh>
        <mesh position={[0, 16.6, 0]}>
          <boxGeometry args={[16, 1.6, 2]} />
          <meshStandardMaterial map={maps.step} color="#8d88a6" roughness={0.9} />
        </mesh>
      </group>
    </>
  );
}
