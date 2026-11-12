"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineBasicMaterial, type LineSegments } from "three";
import { nodeKeyOf } from "@/record/case-file";
import { nodeIndex, nodesOfSector } from "@/record/nodes";
import { isSectorId } from "@/config/world.config";
import { live, useWorldStore } from "@/store/world-store";
import { nodeFlash, nodePositions } from "./constellation";
import { COLORS } from "./view";

const MAX = 48;
/** seconds for a beam to cross, then to fade */
const TRAVEL = 0.42;
const FADE = 0.75;

interface Beam {
  node: number;
  at: number;
  landed: boolean;
}

/**
 * The System's reach, drawn: whenever it touches part of the record
 * (a tool call, an inspection, a sector opening) a beam leaves the
 * Monolith for the shards involved. A case file keeps its evidence
 * tethered for as long as it is open.
 */
export function Beams() {
  const lines = useRef<LineSegments>(null);
  const beams = useRef<Beam[]>([]);
  const read = useRef(0);

  const { geometry, material, positions, colors } = useMemo(() => {
    const positions = new Float32Array(MAX * 6);
    const colors = new Float32Array(MAX * 6);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    const material = new LineBasicMaterial({ vertexColors: true, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    return { geometry, material, positions, colors };
  }, []);

  const hot = useMemo(() => new Color(COLORS.arcaneHot).multiplyScalar(2.6), []);
  const cool = useMemo(() => new Color(COLORS.system).multiplyScalar(0.5), []);

  useFrame(() => {
    const now = performance.now();

    // turn new pulses into beams (a sector pulse fans out to a few of its shards)
    for (; read.current < live.pulses.length; read.current++) {
      const { target, at } = live.pulses[read.current];
      const sector = target.startsWith("sector:") ? target.slice(7) : null;
      const keys = sector && isSectorId(sector) ? nodesOfSector(sector).map((n) => n.key) : [target];
      const step = Math.max(1, Math.ceil(keys.length / 9));
      keys.forEach((key, i) => {
        const node = nodeIndex.get(key);
        if (node !== undefined && i % step === 0) beams.current.push({ node, at: at + (i / step) * 45, landed: false });
      });
    }
    if (live.pulses.length > 20) {
      live.pulses.splice(0, read.current);
      read.current = 0;
    }
    beams.current = beams.current.filter((b) => now - b.at < (TRAVEL + FADE) * 1000).slice(-MAX);

    let n = 0;
    const segment = (node: number, from: number, to: number, r: number, g: number, b: number) => {
      if (n >= MAX) return;
      const x = nodePositions[node * 3];
      const y = nodePositions[node * 3 + 1];
      const z = nodePositions[node * 3 + 2];
      positions.set([x * from, y * from, z * from, x * to, y * to, z * to], n * 6);
      colors.set([r * 0.25, g * 0.25, b * 0.25, r, g, b], n * 6);
      n++;
    };

    for (const beam of beams.current) {
      const age = (now - beam.at) / 1000;
      if (age < 0) continue;
      const head = Math.min(1, age / TRAVEL);
      const fade = age < TRAVEL ? 1 : Math.max(0, 1 - (age - TRAVEL) / FADE);
      if (head >= 1 && !beam.landed) {
        beam.landed = true;
        nodeFlash[beam.node] = 1;
      }
      segment(beam.node, Math.max(0.06, head - 0.55), head, hot.r * fade, hot.g * fade, hot.b * fade);
    }

    // a case keeps its evidence tethered to the Monolith
    const file = useWorldStore.getState().caseFile;
    if (file) {
      const breathe = 0.7 + Math.sin(now / 700) * 0.3;
      for (const e of file.evidence) {
        const node = nodeIndex.get(nodeKeyOf(e));
        if (node !== undefined) segment(node, 0.1, 0.92, cool.r * breathe, cool.g * breathe, cool.b * breathe);
      }
    }

    geometry.setDrawRange(0, n * 2);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />;
}
