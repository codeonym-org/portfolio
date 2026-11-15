import type { MeshStandardMaterial, Texture, WebGLProgramParametersWithUniforms } from "three";

/**
 * ── HIS FACE, ALIVE ───────────────────────────────────────────
 * He is one scanned mesh with no face rig, so the jaw and the
 * eyelids are drawn by its shader. Everything is measured in head
 * space: the mesh position moved to HEAD.origin and scaled by
 * HEAD.scale (Y up, face toward +Z, the head about one unit wide).
 *
 * Face: the photo the scan was made from is laid over the front of
 * the head (the mesh was reshaped to it), so the eyes, the skin and
 * the beard are his own, at the photo's resolution.
 * Jaw: everything below the line where the lips meet turns about a
 * hinge near the ears; the lips part as a lens, the inside is dark,
 * the upper teeth show in shadow.
 * Blink: an eyelid of skin comes down over each eye, with a lash line.
 */

/** where the head is in the mesh, and how much bigger head space is */
export const HEAD = { origin: [-0.02, 0.508, -0.264] as const, scale: 1.876 };
/** the photo over the face: where the mesh position lands in it, as uv = at + position.xy * per */
const PHOTO = { px: 0.00089, eyes: [240, 333.5] as const, at: [-0.017, 0.6725] as const, size: [500, 740] as const };
export const JAW = { stomion: 0.0105, hinge: [0, 0.15, 0] as const, angle: 0.045 };
/** the centre of each eye (on his glasses), and the eye's half width and half height */
export const EYES = { left: [-0.14, 0.309, 0.53], right: [0.151, 0.309, 0.53], rx: 0.068, ry: 0.032 } as const;

export const headUniforms = { uJaw: { value: 0 }, uBlink: { value: 0 }, uFace: { value: null as Texture | null } };

const S = JAW.stomion.toFixed(3);
const v3 = (v: readonly number[]) => `vec3(${v.map((n) => n.toFixed(3)).join(", ")})`;

const VERTEX_HEAD = /* glsl */ `
uniform float uJaw;
varying float vJaw;
varying float vMouth;
varying float vLens;
varying vec3 vRest;
varying vec3 vRestNormal;
varying vec2 vFaceUv;
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
vec3 jawTurn(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uJaw;
uniform float uBlink;
uniform sampler2D uFace;
varying vec3 vRestNormal;
varying vec2 vFaceUv;
varying float vJaw;
varying float vMouth;
varying float vLens;
varying vec3 vRest;
// how much of this point an eyelid covers, and how close it is to the lash line
vec2 lid(vec3 c) {
  vec2 d = (vRest.xy - c.xy) / vec2(${EYES.rx.toFixed(3)}, ${EYES.ry.toFixed(3)});
  float inEye = 1.0 - smoothstep(0.8, 1.0, length(d));
  float onFace = smoothstep(c.z - 0.2, c.z - 0.16, vRest.z) * (1.0 - smoothstep(c.z + 0.1, c.z + 0.14, vRest.z));
  float edge = c.y + ${EYES.ry.toFixed(3)} - uBlink * ${(EYES.ry * 2.15).toFixed(3)};
  float covered = smoothstep(-0.003, 0.003, vRest.y - edge);
  float lash = 1.0 - smoothstep(0.0, 0.007, abs(vRest.y - edge));
  return vec2(covered, lash * step(0.02, uBlink)) * inEye * onFace;
}
`;

export function rigHead(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uJaw = headUniforms.uJaw;
    shader.uniforms.uBlink = headUniforms.uBlink;
    shader.uniforms.uFace = headUniforms.uFace;
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
          vec3 hp = (position - HEAD_O) * HEAD_K;
          float jw = jawWeight(hp);
          vRestNormal = normal;
          vFaceUv = vec2(${(PHOTO.eyes[0] / PHOTO.size[0]).toFixed(5)} + (position.x - ${PHOTO.at[0].toFixed(4)}) * ${(1 / PHOTO.px / PHOTO.size[0]).toFixed(5)}, ${(1 - PHOTO.eyes[1] / PHOTO.size[1]).toFixed(5)} + (position.y - ${PHOTO.at[1].toFixed(4)}) * ${(1 / PHOTO.px / PHOTO.size[1]).toFixed(5)});
          objectNormal = jawTurn(objectNormal, uJaw * jw);
          #ifdef USE_TANGENT
          objectTangent = jawTurn(objectTangent, uJaw * jw);
          #endif`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed = HEAD_O + (JAW_HINGE + jawTurn(hp - JAW_HINGE, uJaw * jw)) / HEAD_K;
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
          // his photo over the front of the head: full on the face, fading into the scan at the sides, the hair and the neck
          float facing = smoothstep(0.25, 0.6, normalize(vRestNormal).z);
          float onHead = smoothstep(0.2, 0.34, vRest.z) * smoothstep(-0.32, -0.24, vRest.y) * (1.0 - smoothstep(0.6, 0.72, vRest.y)) * (1.0 - smoothstep(0.36, 0.42, ax));
          vec2 fuv = clamp(vFaceUv, 0.0, 1.0);
          float inPhoto = step(abs(vFaceUv.x - 0.5), 0.49) * step(abs(vFaceUv.y - 0.5), 0.49);
          diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uFace, fuv).rgb, facing * onHead * inPhoto);
          // open: the band stretched between the lips, 0 at the upper lip and 1 at the lower
          float open = uJaw / ${JAW.angle.toFixed(3)};
          float across = clamp(vJaw / max(vLens, 0.05), 0.0, 1.0);
          float gap = smoothstep(0.02, 0.2, across) * (1.0 - smoothstep(0.8, 0.98, across)) * vMouth * smoothstep(0.0, 0.2, open) * smoothstep(0.05, 0.45, vLens);
          float teeth = smoothstep(0.08, 0.16, across) * (1.0 - smoothstep(0.26, 0.36, across)) * (1.0 - smoothstep(0.05, 0.1, ax)) * smoothstep(0.35, 0.75, open);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.04, 0.012, 0.014), vec3(0.3, 0.27, 0.24), teeth * 0.75), gap);
          // the scan read the glare on his glasses as blue eyes: they are brown
          vec2 eyeL = (vRest.xy - ${v3(EYES.left)}.xy) / vec2(0.05, 0.034);
          vec2 eyeR = (vRest.xy - ${v3(EYES.right)}.xy) / vec2(0.05, 0.034);
          float inIris = (1.0 - smoothstep(0.7, 1.0, min(length(eyeL), length(eyeR)))) * smoothstep(0.34, 0.38, vRest.z) * (1.0 - smoothstep(0.63, 0.67, vRest.z));
          float blue = smoothstep(-0.02, 0.05, diffuseColor.b - diffuseColor.r) * inIris;
          diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2)) * vec3(0.62, 0.36, 0.2), blue);
          // the eyelids
          vec2 lidL = lid(${v3(EYES.left)});
          vec2 lidR = lid(${v3(EYES.right)});
          float lidCover = max(lidL.x, lidR.x);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.2, 0.17), lidCover);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.015, 0.012), max(lidL.y, lidR.y) * 0.85);`,
        )
        .replace(
          "#include <opaque_fragment>",
          `outgoingLight *= 1.0 - gap * (1.0 - teeth * 0.6) * 0.8;
          #include <opaque_fragment>`,
        );
  };
  material.customProgramCacheKey = () => "avatar-head-2";
  material.needsUpdate = true;
}
