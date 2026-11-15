"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace } from "three";

/**
 * ── THE OFFICE ────────────────────────────────────────────────
 * A bright office made by Hyper3D WorldGen from one photo of a desk:
 * the oak desk with a laptop, an open notebook, a pen cup, a book and
 * a plant on it; behind him a second desk with a monitor, shelves of
 * binders, a tall plant, a lamp. It is one model, already at the
 * room's size: the desk top is at height 0 and he sits at the origin.
 * His chair is its own model, and the desk gets a front panel.
 */

const OFFICE = "/models/office/office.glb";
const CHAIR = "/models/office/chair.glb";
const DRACO = "/draco/";

/** how far the office is moved toward the stranger, so the desk's edge is in front of him */
const FORWARD = 0.24;

export function prepare(root: Object3D) {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.name.toLowerCase().startsWith("icosphere")) mesh.visible = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const m = mesh.material as MeshStandardMaterial;
    if (m.map) m.map.colorSpace = SRGBColorSpace;
    m.metalness = Math.min(m.metalness, 0.05);
    m.envMapIntensity = 0.5;
  });
}

export function Office() {
  const office = useGLTF(OFFICE, DRACO);
  const chair = useGLTF(CHAIR, DRACO);
  useEffect(() => prepare(office.scene), [office.scene]);
  useEffect(() => prepare(chair.scene), [chair.scene]);
  return (
    <>
      <primitive object={office.scene} position={[0, 0, FORWARD]} />
      {/* the desk's front panel: the stranger sees a desk, not his knees */}
      <mesh position={[0, -0.3, 0.66 + FORWARD]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.5, 0.02]} />
        <meshStandardMaterial color="#4f5653" roughness={0.6} />
      </mesh>
      <primitive object={chair.scene} position={[0, -0.265, -0.06]} scale={0.5} />
    </>
  );
}

useGLTF.preload(OFFICE, DRACO);
useGLTF.preload(CHAIR, DRACO);
