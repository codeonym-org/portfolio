/**
 * ── EREBUS: THE CONTROLS ──────────────────────────────────────
 * One mutable object the keyboard, the mouse and the touch buttons
 * write to and the game reads once per frame. Keys are read by their
 * position on the keyboard (`code`), so W A S D is the same four keys
 * on an AZERTY keyboard.
 */
export const controls = {
  keys: new Set<string>(),
  /** the touch stick, -1…1 */
  stick: { x: 0, y: 0 },
  /** set for one frame */
  attack: false,
  dash: false,
  burst: false,
  /** held: strikes repeat */
  holding: false,
  /** where the camera stands around the hunter */
  yaw: 0,
  pitch: 0.3,
  distance: 7.5,
};

const MOVE: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
export const isMoveKey = (code: string) => code in MOVE;

/** where the visitor wants to go, in world space, relative to the camera */
export function moveVector(): [number, number] {
  let right = controls.stick.x;
  let forward = controls.stick.y;
  for (const code of controls.keys) {
    const m = MOVE[code];
    if (m) {
      right += m[0];
      forward += m[1];
    }
  }
  const len = Math.hypot(right, forward);
  if (len > 1) {
    right /= len;
    forward /= len;
  }
  const sin = Math.sin(controls.yaw);
  const cos = Math.cos(controls.yaw);
  // the camera looks from (sin, cos) toward the hunter: forward is (-sin, -cos), right is (cos, -sin)
  return [-sin * forward + cos * right, -cos * forward - sin * right];
}

export function turnCamera(dx: number, dy: number) {
  controls.yaw -= dx * 0.006;
  controls.pitch = Math.min(1.1, Math.max(0.06, controls.pitch + dy * 0.004));
}

export function zoomCamera(delta: number) {
  controls.distance = Math.min(13, Math.max(4, controls.distance + delta * 0.01));
}

export function releaseAll() {
  controls.keys.clear();
  controls.stick.x = 0;
  controls.stick.y = 0;
  controls.holding = false;
}
