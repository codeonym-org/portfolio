import { CanvasTexture, SRGBColorSpace } from "three";

/** the room, in metres: the floor, the far wall, the side walls, the ceiling */
export const ROOM = { floor: -0.74, back: -1.5, side: 2.4, ceiling: 1.95 };
/** the desk: the height of its top, its centre, its size */
export const DESK = { top: 0, x: 0.3, z: 0.7, width: 1.8, depth: 0.78, thick: 0.035 };

/** a number in 0..1 from an integer, the same every time */
export const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** a texture drawn on a canvas (nothing on the server, where there is no canvas) */
export function canvasTexture(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
