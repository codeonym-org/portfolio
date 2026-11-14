import type { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from "three";

/**
 * ── HIS FACE, ALIVE ───────────────────────────────────────────
 * The head is one scanned mesh with no face rig, so the jaw and the
 * eyelids are drawn by its shader. Coordinates are the head mesh's
 * own (Y up, face toward +Z), measured on the model.
 *
 * Jaw: everything below the line where the lips meet turns about a
 * hinge near the ears; the lips part as a lens, the inside is dark,
 * the upper teeth show in shadow.
 * Blink: an eyelid of skin comes down over each eye, with a lash line.
 */

export const JAW = { stomion: 0.026, hinge: [0, 0.15, 0] as const, angle: 0.055 };
/** the centre of each eye on the face, and the eye's half width and half height */
export const EYES = { left: [-0.135, 0.335, 0.486], right: [0.152, 0.334, 0.482], rx: 0.068, ry: 0.032 } as const;

export const headUniforms = { uJaw: { value: 0 }, uBlink: { value: 0 } };

const S = JAW.stomion.toFixed(3);
const v3 = (v: readonly number[]) => `vec3(${v.map((n) => n.toFixed(3)).join(", ")})`;

const VERTEX_HEAD = /* glsl */ `
uniform float uJaw;
varying float vJaw;
varying float vMouth;
varying float vLens;
varying vec3 vRest;
const vec3 JAW_HINGE = ${v3(JAW.hinge)};
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
  return below * lip * front * side;
}
vec3 jawTurn(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uJaw;
uniform float uBlink;
varying float vJaw;
varying float vMouth;
varying float vLens;
varying vec3 vRest;
// how much of this point an eyelid covers, and how close it is to the lash line
vec2 lid(vec3 c) {
  vec2 d = (vRest.xy - c.xy) / vec2(${EYES.rx.toFixed(3)}, ${EYES.ry.toFixed(3)});
  float inEye = 1.0 - smoothstep(0.8, 1.0, length(d));
  float onFace = smoothstep(c.z - 0.08, c.z - 0.05, vRest.z) * (1.0 - smoothstep(c.z + 0.05, c.z + 0.07, vRest.z));
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
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
          float jw = jawWeight(position);
          objectNormal = jawTurn(objectNormal, uJaw * jw);
          #ifdef USE_TANGENT
          objectTangent = jawTurn(objectTangent, uJaw * jw);
          #endif`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed = JAW_HINGE + jawTurn(position - JAW_HINGE, uJaw * jw);
          vJaw = jw;
          vRest = position;
          vLens = sqrt(max(0.0, 1.0 - pow(abs(position.x) / 0.125, 2.0)));
          vMouth = (1.0 - smoothstep(0.1, 0.125, abs(position.x))) * smoothstep(0.45, 0.55, position.z);`,
        );
    shader.fragmentShader =
      FRAGMENT_HEAD +
      shader.fragmentShader
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          float ax = abs(vRest.x);
          // closed, the texture paints a hard red line where the lips meet: a soft shadow instead, and calmer lips
          float lipZone = (1.0 - smoothstep(0.09, 0.125, ax)) * smoothstep(0.5, 0.56, vRest.z);
          float lips = lipZone * (1.0 - smoothstep(0.018, 0.034, abs(vRest.y - ${S})));
          float seam = lipZone * (1.0 - smoothstep(0.004, 0.012, abs(vRest.y - ${S} - 0.012)));
          float grey = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(grey), diffuseColor.rgb, 0.7) * vec3(1.0, 0.94, 0.92), lips * 0.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey) * vec3(0.62, 0.42, 0.38), seam * 0.85);
          // open: the band stretched between the lips, 0 at the upper lip and 1 at the lower
          float open = uJaw / ${JAW.angle.toFixed(3)};
          float across = clamp(vJaw / max(vLens, 0.05), 0.0, 1.0);
          float gap = smoothstep(0.02, 0.2, across) * (1.0 - smoothstep(0.8, 0.98, across)) * vMouth * smoothstep(0.0, 0.2, open) * smoothstep(0.05, 0.45, vLens);
          float teeth = smoothstep(0.08, 0.16, across) * (1.0 - smoothstep(0.26, 0.36, across)) * (1.0 - smoothstep(0.05, 0.1, ax)) * smoothstep(0.35, 0.75, open);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.04, 0.012, 0.014), vec3(0.3, 0.27, 0.24), teeth * 0.75), gap);
          // under the chin the neck is in the jaw's shadow
          diffuseColor.rgb *= mix(1.0, 0.62, (1.0 - smoothstep(-0.32, -0.12, vRest.y)) * (1.0 - smoothstep(0.38, 0.5, vRest.z)));
          // the eyelids
          vec2 lidL = lid(${v3(EYES.left)});
          vec2 lidR = lid(${v3(EYES.right)});
          float lidCover = max(lidL.x, lidR.x);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.15, 0.1), lidCover);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.015, 0.012), max(lidL.y, lidR.y) * 0.85);`,
        )
        .replace(
          "#include <opaque_fragment>",
          `outgoingLight *= 1.0 - gap * (1.0 - teeth * 0.6) * 0.8;
          #include <opaque_fragment>`,
        );
  };
  material.customProgramCacheKey = () => "avatar-head";
  material.needsUpdate = true;
}
