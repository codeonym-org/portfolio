"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, ShaderMaterial } from "three";
import { seeded } from "@/record/layout";
import { live } from "@/store/world-store";
import { COLORS, view } from "./view";

const FLOOR_Y = -4.3;

/** one material for the page's lifetime — its uniforms are written every frame */
const floor = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: AdditiveBlending,
  toneMapped: false,
  uniforms: {
    uTime: { value: 0 },
    uOpen: { value: 0 },
    uShock: { value: 0 },
    uA: { value: new Color(COLORS.arcane) },
    uB: { value: new Color(COLORS.system) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vPos;
    void main() {
      vPos = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec2 vPos;
    uniform float uTime, uOpen, uShock;
    uniform vec3 uA, uB;
    void main() {
      float d = length(vPos);
      float fade = exp(-d * 0.11);
      // standing rings, drifting outward
      float rings = smoothstep(0.93, 1.0, sin(d * 2.2 - uTime * 0.5) * 0.5 + 0.5);
      // a lattice of points, so the plane reads as a surface
      vec2 cell = abs(fract(vPos * 0.75) - 0.5);
      float dots = smoothstep(0.06, 0.0, length(cell));
      // the pool of light under the body
      float pool = exp(-d * d * 0.09) * (0.12 + uOpen * 0.5);
      // ARISE: one bright ring racing out
      float front = (1.0 - uShock) * 26.0;
      float shock = uShock * smoothstep(1.4, 0.0, abs(d - front));
      vec3 col = mix(uA, uB, clamp(d * 0.07, 0.0, 1.0));
      float a = (rings * 0.16 + dots * 0.2) * fade + pool + shock * 1.3;
      gl_FragColor = vec4(col * a, a);
    }
  `,
});

/**
 * The void under the Monolith: not a floor, a surface of standing
 * rings that the body disturbs. Shockwaves cross it on ARISE, and it
 * brightens under the Monolith as it opens.
 */
export function Void() {
  const dust = useRef<Points>(null);

  const motes = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + seeded(i, 20) * 15;
      const a = seeded(i, 21) * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (seeded(i, 22) - 0.5) * 12;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    floor.uniforms.uTime.value = clock.elapsedTime;
    floor.uniforms.uOpen.value = Math.min(view.open, 1.2);
    floor.uniforms.uShock.value = live.shock;
    if (dust.current) dust.current.rotation.y = clock.elapsedTime * 0.012 + view.spin * 0.5;
  });

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y} material={floor}>
        <planeGeometry args={[90, 90]} />
      </mesh>
      <points ref={dust} geometry={motes}>
        <pointsMaterial color={COLORS.arcaneHot} size={0.045} sizeAttenuation transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} />
      </points>
    </>
  );
}
