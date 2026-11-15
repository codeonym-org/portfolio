import type { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from "three";

/**
 * ── HIS FACE, ALIVE ───────────────────────────────────────────
 * He is one generated mesh with no face rig, so the jaw is moved
 * and the eyelids are moved by its shader. Nothing is painted on his
 * face: it is the model's own, as generated. Everything is measured in head
 * space: the mesh position moved to HEAD.origin and scaled by
 * HEAD.scale (Y up, face toward +Z, the head about one unit wide).
 *
 * Blink: the skin between each eye and its brow is pulled down over
 * the eye, to the lower lid; his glasses, in front, stay where they are.
 * Jaw: everything below the line where the lips meet turns about a
 * hinge near the ears; the lips part as a lens, the inside is dark,
 * the upper teeth show in shadow.
 */

/** where the head is in the mesh, and how much bigger head space is */
export const HEAD = { origin: [-0.019, 0.515, -0.18] as const, scale: 1.876 };
export const JAW = { stomion: 0.0105, hinge: [0, 0.15, 0] as const, angle: 0.045 };
/** each eye's centre, the half width and half height of its opening, and how far forward the face reaches there (the glasses are further) */
export const EYES = { left: [-0.1257, 0.2927], right: [0.137, 0.2908], rx: 0.064, ry: 0.0244, face: [0.515, 0.54] } as const;

export const headUniforms = { uJaw: { value: 0 }, uBlink: { value: 0 } };

const S = JAW.stomion.toFixed(3);
const v3 = (v: readonly number[]) => `vec3(${v.map((n) => n.toFixed(4)).join(", ")})`;

const VERTEX_HEAD = /* glsl */ `
uniform float uJaw;
uniform float uBlink;
varying float vJaw;
varying float vMouth;
varying float vLens;
varying vec3 vRest;
const vec3 JAW_HINGE = ${v3(JAW.hinge)};
const vec3 HEAD_O = ${v3(HEAD.origin)};
const float HEAD_K = ${HEAD.scale.toFixed(3)};
float jawWeight(vec3 p) {
  float ax = abs(p.x);
  // a sharp seam between the lips, a softer one past the corners, so the cheeks stretch instead of tearing
  float halfWidth = mix(0.008, 0.045, smoothstep(0.12, 0.24, ax));
  float below = 1.0 - smoothstep(${S} - halfWidth, ${S} + halfWidth, p.y);
  // the lips part as a lens: fully in the middle, not at all at the corners; lower down, the whole jaw turns
  float lens = sqrt(max(0.0, 1.0 - pow(ax / 0.125, 2.0)));
  float lip = mix(lens, 1.0, smoothstep(0.0, 0.06, ${S} - p.y));
  float front = smoothstep(0.26, 0.38, p.z);
  float side = 1.0 - smoothstep(0.26, 0.4, ax);
  // the beard moves with the jaw; the collar under it does not
  float chin = smoothstep(-0.34, -0.18, p.y);
  return below * lip * front * side * chin;
}
// how far down a point of the face moves when this eye closes
float lidShift(vec3 p, vec2 c) {
  vec2 d = (p.xy - c) / vec2(${EYES.rx.toFixed(4)}, ${EYES.ry.toFixed(4)});
  // the lids meet at the corners, so nothing moves there; the brow, at 2.6, does not move either
  float close = uBlink * (1.0 - smoothstep(0.6, 1.2, abs(d.x)));
  float line = mix(1.0, -0.85, close);
  float y = d.y;
  if (d.y > -1.0 && d.y <= 1.0) y = -1.0 + (d.y + 1.0) * (line + 1.0) / 2.0;
  else if (d.y > 1.0 && d.y < 2.6) y = line + (d.y - 1.0) * (2.6 - line) / 1.6;
  float onFace = 1.0 - smoothstep(${EYES.face[0].toFixed(3)}, ${EYES.face[1].toFixed(3)}, p.z);
  return (y - d.y) * ${EYES.ry.toFixed(4)} * onFace;
}
vec3 jawTurn(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uJaw;
varying float vJaw;
varying float vMouth;
varying float vLens;
varying vec3 vRest;
`;

export function rigHead(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uJaw = headUniforms.uJaw;
    shader.uniforms.uBlink = headUniforms.uBlink;
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
          vec3 hp = (position - HEAD_O) * HEAD_K;
          float jw = jawWeight(hp);
          vec3 lidded = hp + vec3(0.0, lidShift(hp, vec2(${EYES.left.join(", ")})) + lidShift(hp, vec2(${EYES.right.join(", ")})), 0.0);
          objectNormal = jawTurn(objectNormal, uJaw * jw);
          #ifdef USE_TANGENT
          objectTangent = jawTurn(objectTangent, uJaw * jw);
          #endif`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed = HEAD_O + (JAW_HINGE + jawTurn(lidded - JAW_HINGE, uJaw * jw)) / HEAD_K;
          vJaw = jw;
          vRest = hp;
          vLens = sqrt(max(0.0, 1.0 - pow(abs(hp.x) / 0.125, 2.0)));
          vMouth = (1.0 - smoothstep(0.1, 0.125, abs(hp.x))) * smoothstep(0.45, 0.55, hp.z) * smoothstep(-0.2, -0.1, hp.y);`,
        );
    shader.fragmentShader =
      FRAGMENT_HEAD +
      shader.fragmentShader
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          float ax = abs(vRest.x);
          // open: the band stretched between the lips, 0 at the upper lip and 1 at the lower
          float open = uJaw / ${JAW.angle.toFixed(3)};
          float across = clamp(vJaw / max(vLens, 0.05), 0.0, 1.0);
          float gap = smoothstep(0.02, 0.2, across) * (1.0 - smoothstep(0.8, 0.98, across)) * vMouth * smoothstep(0.0, 0.2, open) * smoothstep(0.05, 0.45, vLens);
          float teeth = smoothstep(0.08, 0.16, across) * (1.0 - smoothstep(0.26, 0.36, across)) * (1.0 - smoothstep(0.05, 0.1, ax)) * smoothstep(0.35, 0.75, open);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.04, 0.012, 0.014), vec3(0.3, 0.27, 0.24), teeth * 0.75), gap);`,
        )
        .replace(
          "#include <opaque_fragment>",
          `outgoingLight *= 1.0 - gap * (1.0 - teeth * 0.6) * 0.8;
          #include <opaque_fragment>`,
        );
  };
  material.customProgramCacheKey = () => "avatar-head-7";
  material.needsUpdate = true;
}
