"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { type PerspectiveCamera, Vector3 } from "three";
import { damp } from "@/record/layout";
import { live, useWorldStore } from "@/store/world-store";
import { aberration, fitView, view } from "./view";

const LOOK = new Vector3(0, 0.25, 0);

/**
 * The camera never travels — the record comes to the visitor. The rig
 * only (1) slides the framing clear of whatever window is open,
 * (2) lets a drag spin the sky, with momentum, and (3) carries the
 * small things: parallax, shake, the lens split on big moments.
 */
export function Rig() {
  const { camera, gl, size } = useThree();
  const offset = useRef({ x: 0, y: 0 });
  const intro = useRef(0);

  useEffect(() => {
    fitView(size.width / size.height);
  }, [size]);

  useEffect(() => {
    const el = gl.domElement;
    let last = 0;
    let moved = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      last = e.clientX;
      moved = 0;
      view.dragging = false;
      el.setPointerCapture(e.pointerId);
      const move = (m: PointerEvent) => {
        const dx = m.clientX - last;
        last = m.clientX;
        moved += Math.abs(dx);
        if (moved > 6) view.dragging = true;
        if (view.dragging) {
          view.spin += dx * 0.0045;
          view.spinVelocity = dx * 0.25;
        }
      };
      const up = (u: PointerEvent) => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        if (el.hasPointerCapture(u.pointerId)) el.releasePointerCapture(u.pointerId);
        // let the click that ends a drag see `dragging` before it clears
        window.setTimeout(() => (view.dragging = false), 0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
    const hover = (e: PointerEvent) => view.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", hover);
    return () => {
      el.removeEventListener("pointerdown", down);
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
    const distance = view.distance * (0.62 + 0.38 * ease) * (focused ? 0.97 : 1);

    live.shake *= Math.exp(-dt * 4);
    const jitter = live.shake * 0.12;
    cam.position.set(
      damp(cam.position.x, view.pointer.x * 0.55, 2, dt) + (Math.random() - 0.5) * jitter,
      damp(cam.position.y, 0.5 - view.pointer.y * 0.3 - (1 - ease) * 1.6, 2, dt) + (Math.random() - 0.5) * jitter,
      damp(cam.position.z, distance, 3, dt),
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
    const wantY = focused && !wide ? size.height * 0.27 : size.height * (wide ? (focused ? 0.1 : 0.07) : 0.14);
    offset.current.x = damp(offset.current.x, wantX, 4, dt);
    offset.current.y = damp(offset.current.y, wantY, 4, dt);
    cam.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);

    live.aberration *= Math.exp(-dt * 3);
    const split = 0.0003 + live.aberration * 0.004;
    aberration.set(split, split);
  });

  return null;
}
