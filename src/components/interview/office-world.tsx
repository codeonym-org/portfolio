"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace } from "three";

/**
 * ── THE OFFICE ────────────────────────────────────────────────
 * A bright office, each piece of it a Hyper3D Rodin model at its real
 * size: the oak desk with a laptop, an open notebook and a pen, a book,
 * a pen cup, a snake plant and two printed reports on it; behind him a
 * white desk with a monitor and a lamp, a shelf of binders, a framed
 * print, a fig tree and a dome lamp on a sideboard under the window.
 * The walls, the floor and the window are plain shapes around them.
 * The desk top is at height 0 and he sits at the origin. His chair is
 * its own model.
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
      <primitive object={chair.scene} position={[0, -0.265, -0.06]} scale={0.5} />
    </>
  );
}

useGLTF.preload(OFFICE, DRACO);
useGLTF.preload(CHAIR, DRACO);
