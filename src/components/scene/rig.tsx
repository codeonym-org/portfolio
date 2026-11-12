"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { type PerspectiveCamera, Vector3 } from "three";
import { damp } from "@/record/layout";
import { live, useWorldStore } from "@/store/world-store";
import { aberration, fitView, resetCamera, TILT, view, ZOOM } from "./view";

const LOOK = new Vector3(0, 0.25, 0);
/** the bar at the top of the screen, px */
const TOP_BAR = 76;
/** the Monolith's height on screen as a share of the viewport height, at camera distance 1 (measured: 0.467 at 15) */
const BODY_SPAN = 0.467 * 15;
/** how far the System may pull the camera back to keep its words clear */
const MAX_PULL = 1.55;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The camera never travels — the record comes to the visitor. The rig
 * (1) slides the framing clear of whatever window is open, (2) frames
 * the Monolith above the System's words: it pulls back and lifts the
 * scene by what the console takes, (3) gives the visitor a camera of
 * their own: drag to spin and tilt, wheel or pinch to zoom, double
 * click to reset, and (4) carries the small things: parallax, shake,
 * the lens split on big moments.
 */
export function Rig() {
  const { camera, gl, size } = useThree();
  const offset = useRef({ x: 0, y: 0 });
  const intro = useRef(0);
  const frame = useRef({ zoom: 1, tilt: 0, pull: 1 });

  useEffect(() => {
    fitView(size.width / size.height);
  }, [size]);

  useEffect(() => {
    const el = gl.domElement;
    let last = 0;
    let lastY = 0;
    let moved = 0;
    /** fingers on the canvas, for the pinch */
    const fingers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const spread = () => {
      const [a, b] = [...fingers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) pinch = spread();
      last = e.clientX;
      lastY = e.clientY;
      moved = 0;
      view.dragging = false;
      el.setPointerCapture(e.pointerId);
      const move = (m: PointerEvent) => {
        if (fingers.has(m.pointerId)) fingers.set(m.pointerId, { x: m.clientX, y: m.clientY });
        if (fingers.size >= 2) {
          // two fingers: the distance between them is the zoom
          const now = spread();
          if (pinch > 0 && now > 0) view.zoom = clamp((view.zoom * pinch) / now, ZOOM.min, ZOOM.max);
          pinch = now;
          view.dragging = true;
          return;
        }
        const dx = m.clientX - last;
        const dy = m.clientY - lastY;
        last = m.clientX;
        lastY = m.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) view.dragging = true;
        if (view.dragging) {
          view.spin += dx * 0.0045;
          view.spinVelocity = dx * 0.25;
          view.tilt = clamp(view.tilt + dy * 0.004, TILT.min, TILT.max);
        }
      };
      const up = (u: PointerEvent) => {
        fingers.delete(u.pointerId);
        pinch = 0;
        if (el.hasPointerCapture(u.pointerId)) el.releasePointerCapture(u.pointerId);
        if (fingers.size) {
          // one finger left: it carries on from where it is
          const [rest] = [...fingers.values()];
          last = rest.x;
          lastY = rest.y;
          return;
        }
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        // let the click that ends a drag see `dragging` before it clears
        window.setTimeout(() => (view.dragging = false), 0);
      };
      if (fingers.size > 1) return;
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.zoom = clamp(view.zoom * Math.exp(clamp(e.deltaY, -120, 120) * 0.0012), ZOOM.min, ZOOM.max);
    };
    const hover = (e: PointerEvent) => view.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    el.addEventListener("pointerdown", down);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("dblclick", resetCamera);
    window.addEventListener("pointermove", hover);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("dblclick", resetCamera);
      window.removeEventListener("pointermove", hover);
    };
  }, [gl]);

  useEffect(() => () => (camera as PerspectiveCamera).clearViewOffset(), [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = useWorldStore.getState();
    const cam = camera as PerspectiveCamera;

    if (!view.dragging) {
      view.spin += view.spinVelocity * dt;
      view.spinVelocity *= Math.exp(-dt * 2.4);
    }

    // the opening shot: start close and low, settle back as the body seals
    if (s.ready) intro.current = Math.min(1, intro.current + dt / 3.2);
    const ease = 1 - Math.pow(1 - intro.current, 3);
    const focused = !!(s.sector || s.caseFile || s.brief);
    // the System's words take the bottom of the screen: the Monolith is framed in what is left above them
    const free = Math.max(160, size.height - TOP_BAR - view.clear);
    const reading = !focused && view.clear > 0;
    const pullWant = reading ? clamp((BODY_SPAN * size.height) / (0.8 * free) / view.distance, 1, MAX_PULL) : 1;
    const f = frame.current;
    f.pull = damp(f.pull, pullWant, 2.2, dt);
    f.zoom = damp(f.zoom, view.zoom, 6, dt);
    f.tilt = damp(f.tilt, view.tilt, 6, dt);
    const distance = view.distance * (0.62 + 0.38 * ease) * (focused ? 0.97 : 1) * f.pull * f.zoom;

    live.shake *= Math.exp(-dt * 4);
    const jitter = live.shake * 0.12;
    cam.position.set(
      damp(cam.position.x, view.pointer.x * 0.55, 2, dt) + (Math.random() - 0.5) * jitter,
      damp(cam.position.y, 0.5 - view.pointer.y * 0.3 - (1 - ease) * 1.6 + Math.sin(f.tilt) * distance, 3, dt) + (Math.random() - 0.5) * jitter,
      damp(cam.position.z, Math.cos(f.tilt) * distance, 3, dt),
    );
    cam.lookAt(LOOK);

    // slide the framing clear of the open window: right on desktop, up on touch
    const wide = size.width >= 820;
    const panel = focused ? (wide ? Math.min(600, size.width * 0.44) : 0) : 0;
    const wantX = panel / 2;
    // the halo shrinks to the room the window leaves, labels included
    if (wide) {
      const pxPerUnit = size.height / (2 * (view.distance - 2.2) * Math.tan((cam.fov * Math.PI) / 360));
      view.haloScale = Math.min(1, Math.max(0.5, ((size.width - panel) / 2 - (focused ? 175 : 60)) / (2.75 * pxPerUnit)));
    }
    view.haloSquash = damp(view.haloSquash, wide && focused ? 0.84 : 1, 4, dt);
    const base = focused && !wide ? size.height * 0.27 : size.height * (wide ? (focused ? 0.1 : 0.07) : 0.14);
    // lift the scene so the Monolith's middle is the middle of the free area
    const wantY = reading ? Math.max(base, size.height / 2 - (TOP_BAR + free / 2)) : base;
    offset.current.x = damp(offset.current.x, wantX, 4, dt);
    offset.current.y = damp(offset.current.y, wantY, 4, dt);
    cam.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);

    live.aberration *= Math.exp(-dt * 3);
    const split = 0.0003 + live.aberration * 0.004;
    aberration.set(split, split);
  });

  return null;
}
