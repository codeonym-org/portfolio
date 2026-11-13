"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
  Color,
  DoubleSide,
  Group,
  LoopOnce,
  LoopRepeat,
  Object3D,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import { clone as cloneRig } from "three/examples/jsm/utils/SkeletonUtils.js";
import { game } from "@/erebus/game";
import { rngFrom } from "@/erebus/rules";
import { MAX_SOLDIERS, type Foe } from "@/erebus/sim";
import { CAVE } from "./cavern";

/**
 * Everything on Erebus that is a model: the hunter, the statues that
 * wake against you and the ones that rise behind you (one knight rig,
 * three skins), the rock golems, the obelisks, the colossus and what
 * stands in the dark behind the rock columns. Sources and licenses: scripts/assets/README.md.
 * All of it is meshopt-compressed; the decoder ships with three.
 */

const MODELS = {
  colossus: "/models/erebus/colossus.glb",
  knight: "/models/erebus/knight.glb",
  golem: "/models/erebus/golem.glb",
  obelisk: "/models/erebus/obelisk.glb",
} as const;
const useModel = (url: string) => useGLTF(url, false, true);
for (const url of Object.values(MODELS)) useGLTF.preload(url, false, true);

const box = new Box3();
const size = new Vector3();
const centre = new Vector3();
/** a copy of a static model, `height` tall, standing on the ground at the origin */
function standing(source: Object3D, height: number, restyle: (m: MeshStandardMaterial) => void) {
  const model = source.clone(true);
  model.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const mat = (mesh.material as MeshStandardMaterial).clone();
    restyle(mat);
    mesh.material = mat;
    mesh.frustumCulled = false;
  });
  model.updateMatrixWorld(true);
  box.setFromObject(model).getSize(size);
  box.getCenter(centre);
  const s = height / size.y;
  model.scale.multiplyScalar(s);
  model.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
  const holder = new Group();
  holder.add(model);
  return holder;
}

/* ── puppets: one skinned copy of a rig, with its own mixer and materials ── */

interface Puppet {
  root: Group;
  mixer: AnimationMixer;
  actions: Record<string, AnimationAction>;
  current: string;
  /** an action that must finish before the body goes back to walking */
  busy: AnimationAction | null;
  mats: { mat: MeshStandardMaterial; glow: Color; power: number }[];
  foe: number;
  x: number;
  z: number;
  windup: number;
  skin: string;
}

type Skin = (mat: MeshStandardMaterial) => void;

function puppet(source: Object3D, clips: AnimationClip[], scale: number, skin: Skin): Puppet {
  const body = cloneRig(source);
  const mats: Puppet["mats"] = [];
  body.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const mat = (mesh.material as MeshStandardMaterial).clone();
    skin(mat);
    mesh.material = mat;
    // a skinned mesh's bounds are those of its rest pose: never cull by them
    mesh.frustumCulled = false;
    mats.push({ mat, glow: mat.emissive.clone(), power: mat.emissiveIntensity });
  });
  body.scale.multiplyScalar(scale);
  const root = new Group();
  root.add(body);
  root.visible = false;
  const mixer = new AnimationMixer(body);
  const actions: Record<string, AnimationAction> = {};
  for (const clip of clips) actions[clip.name] = mixer.clipAction(clip);
  return { root, mixer, actions, current: "", busy: null, mats, foe: -1, x: 0, z: 0, windup: 0, skin: "" };
}

function play(p: Puppet, name: string, speed = 1) {
  const next = p.actions[name];
  if (!next) return;
  if (p.current === name) {
    next.timeScale = speed;
    return;
  }
  const prev = p.actions[p.current];
  next.reset().setLoop(LoopRepeat, Infinity);
  next.timeScale = speed;
  next.fadeIn(0.14).play();
  if (prev) prev.fadeOut(0.14);
  p.current = name;
}

function once(p: Puppet, name: string, speed = 1, from = 0) {
  const next = p.actions[name];
  if (!next) return;
  const prev = p.actions[p.current];
  next.reset().setLoop(LoopOnce, 1);
  next.clampWhenFinished = true;
  next.timeScale = speed;
  next.time = from;
  next.fadeIn(0.08).play();
  if (prev && prev !== next) prev.fadeOut(0.08);
  p.current = name;
  p.busy = next;
}

const WHITE = new Color("#ffffff");
/** the one-shot is over: the body is free to walk again */
function settle(p: Puppet) {
  p.busy = null;
}

function flash(p: Puppet, on: boolean, fade = 1) {
  for (const m of p.mats) {
    m.mat.emissive.copy(on ? WHITE : m.glow);
    m.mat.emissiveIntensity = on ? 1.6 : m.power;
    if (m.mat.transparent) m.mat.opacity = fade * 0.9;
  }
}

/** a statue that woke: bare stone, and a blade that has started to burn */
const fallen: Skin = (m) => {
  const body = m.name === "Paladin_MAT";
  if (body) m.map = null;
  m.color.set(body ? "#6a6764" : "#3a2019");
  m.emissive.set(body ? "#120504" : "#9a2a14");
  m.emissiveIntensity = body ? 0.5 : 0.7;
  m.metalness = 0;
  m.roughness = 1;
};
/** a statue that has not: the same stone, nothing lit */
const stone: Skin = (m) => {
  m.map = null;
  m.color.set("#6e6c69");
  m.emissive.set("#000000");
  m.metalness = 0;
  m.roughness = 1;
};
const hunterSkin: Skin = (m) => {
  const body = m.name === "Paladin_MAT";
  // black iron, and the one blade in the cavern that is clean steel
  m.color.set(body ? "#30333c" : "#b4bccb");
  m.emissive.set(body ? "#070b16" : "#5f74a8");
  m.emissiveIntensity = body ? 0.8 : 0.55;
  m.metalness = body ? 0.7 : 0.95;
  m.roughness = body ? 0.5 : 0.28;
};
const risen: Skin = (m) => {
  m.color.set("#2a3448");
  m.emissive.set(m.name === "Paladin_MAT" ? "#1c2f66" : "#8fb8e6");
  m.emissiveIntensity = m.name === "Paladin_MAT" ? 0.45 : 1.1;
  m.transparent = true;
  m.opacity = 0.9;
  m.roughness = 0.9;
};
const rock: Skin = (m) => {
  if (m.name === "Emission") {
    m.emissive.set("#e0661c");
    m.emissiveIntensity = 2;
    m.toneMapped = false;
  } else {
    // its own texture is a toy blue: bare rock instead
    m.map = null;
    m.color.set("#5f5c58");
    m.emissive.set("#000000");
    m.roughness = 0.9;
  }
};

/* ── the hunter: the one body in the hall that is not stone ── */

export function Hunter() {
  const knight = useModel(MODELS.knight);
  const body = useMemo(() => {
    const p = puppet(knight.scene, knight.animations, 1.1, hunterSkin);
    p.root.visible = true;
    return p;
  }, [knight]);
  const root = useRef<Group>(null);
  const lean = useRef<Group>(null);
  const arc = useRef<Mesh>(null);
  const arcMat = useRef<MeshBasicMaterial>(null);
  const was = useRef({ attack: 0, dead: false, arise: -9 });

  useFrame((_, delta) => {
    const sim = game.sim;
    const g = root.current;
    if (!g || !lean.current || !arc.current || !arcMat.current) return;
    g.visible = !!sim;
    if (!sim) return;
    const h = sim.hunter;
    const dt = Math.min(delta, 0.05);
    const dashing = h.dashT > 0;
    const w = was.current;
    g.position.set(h.x, 0, h.z);
    g.rotation.y = h.yaw;
    lean.current.rotation.x += ((dashing ? 0.55 : 0) - lean.current.rotation.x) * Math.min(1, dt * 14);
    lean.current.scale.setScalar(h.hurtT > 0.15 ? 0.95 : 1);

    const heavy = h.combo === 2;
    if (h.dead && !w.dead) once(body, "Kneel", 2.6);
    else if (!h.dead && w.dead) once(body, "Rise", 2.4);
    else if (!h.dead && h.attackT > w.attack + 0.01) once(body, heavy ? "Spin" : "Slash", heavy ? 2.6 : 2.3, heavy ? 0.4 : 0.3);
    else if (!h.dead && game.fx.arise !== w.arise && sim.time - game.fx.arise < 0.3) once(body, "PowerUp", 1.7);
    w.attack = h.attackT;
    w.dead = h.dead;
    w.arise = game.fx.arise;
    if (body.busy && !h.dead && (!body.busy.isRunning() || body.busy.time >= body.busy.getClip().duration - 0.08)) settle(body);
    // moving cuts a blow short: the feet matter more than the follow-through
    if (body.busy && !h.dead && h.attackT <= 0 && h.pace > 0.5 && body.current !== "Rise" && body.busy.time > 0.75) settle(body);
    if (!body.busy && !h.dead) play(body, h.pace > 0.12 ? "Run" : "Idle", dashing ? 1.9 : h.pace > 0.12 ? 0.8 + h.pace * 0.45 : 1);
    body.mixer.update(dt);

    const k = h.attackT > 0 ? 1 - h.attackT / 0.26 : -1;
    const side = h.combo === 1 ? -1 : 1;
    arcMat.current.opacity = k >= 0 ? (1 - k) * 0.85 : 0;
    arc.current.visible = k >= 0;
    if (k >= 0) {
      const s = (heavy ? 1.25 : 1) * (0.75 + k * 0.35);
      arc.current.scale.set(s * side, s, s);
      arc.current.rotation.z = (k - 0.5) * 1.6;
    }
  });

  return (
    <group ref={root} visible={false}>
      <group ref={lean}>
        <primitive object={body.root} />
      </group>
      <group position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={arc} visible={false}>
          <ringGeometry args={[1.5, 3.1, 28, 1, -Math.PI / 2 - 1.05, 2.1]} />
          <meshBasicMaterial ref={arcMat} color="#c9d6f0" transparent opacity={0} blending={AdditiveBlending} side={DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ── the shadow soldiers: risen knights ── */

export function Soldiers() {
  const knight = useModel(MODELS.knight);
  const squad = useMemo(() => Array.from({ length: MAX_SOLDIERS }, () => puppet(knight.scene, knight.animations, 1.08, risen)), [knight]);

  useFrame((_, delta) => {
    const sim = game.sim;
    if (!sim) return;
    const dt = Math.min(delta, 0.05);
    squad.forEach((p, i) => {
      const s = sim.soldiers[i];
      if (!s) {
        p.root.visible = false;
        p.current = "";
        return;
      }
      if (!p.root.visible) {
        // it gets up from the ground it fell on
        p.root.visible = true;
        p.mixer.stopAllAction();
        p.current = "";
        once(p, "Rise", 1.5);
      }
      p.root.position.set(s.x, 0, s.z);
      p.root.rotation.y = s.yaw;
      if (s.attackT > 0 && p.windup <= 0) once(p, "Slash", 2.4);
      p.windup = s.attackT;
      if (p.busy && (!p.busy.isRunning() || p.busy.time >= p.busy.getClip().duration - 0.06)) p.busy = null;
      if (!p.busy) play(p, s.pace > 0.15 ? "Run" : "Idle", s.pace > 0.15 ? 0.8 + s.pace * 0.5 : 1);
      p.mixer.update(dt);
    });
  });

  return (
    <>
      {squad.map((p, i) => (
        <primitive key={i} object={p.root} />
      ))}
    </>
  );
}

/* ── what hunts you: fallen knights, golems, seers ── */

const SHADES = 18;
const HEAVIES = 8;
const SEERS = 16;
const MAX = 40;
/** when the blow lands inside its clip, in seconds */
const HIT = { Slash: 0.5, Attack: 0.85 };
const CORE = { brute: "#ff7a1f", warden: "#b46bff" };
const dummy = new Object3D();
const tint = new Color();
const hide = () => {
  dummy.position.set(0, -50, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(0.0001);
  dummy.updateMatrix();
};

export function Foes() {
  const knight = useModel(MODELS.knight);
  const golem = useModel(MODELS.golem);
  const pool = useMemo(
    () => ({
      shade: Array.from({ length: SHADES }, () => puppet(knight.scene, knight.animations, 1, fallen)),
      heavy: Array.from({ length: HEAVIES }, () => puppet(golem.scene, golem.animations, 0.11, rock)),
    }),
    [knight, golem],
  );
  const all = useMemo(() => [...pool.shade, ...pool.heavy], [pool]);
  const taken = useRef(new Map<number, Puppet>());
  const seers = useRef<InstancedMesh>(null);
  const eyes = useRef<InstancedMesh>(null);
  const bars = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);

  useFrame((state, delta) => {
    const sim = game.sim;
    const sm = seers.current;
    const em = eyes.current;
    const bm = bars.current;
    const cm = crowns.current;
    if (!sim || !sm || !em || !bm || !cm) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const alive = new Set<number>();
    let seer = 0;

    const drive = (f: Foe, p: Puppet) => {
      const heavy = f.kind !== "shade";
      const fade = f.dying >= 0 ? Math.max(0, 1 - f.dying / 0.6) : 1;
      if (heavy && p.skin !== f.kind) {
        p.skin = f.kind;
        const core = p.mats.find((m) => m.mat.name === "Emission");
        if (core) core.glow.set(CORE[f.kind as "brute" | "warden"]);
      }
      const moved = Math.hypot(f.x - p.x, f.z - p.z) / dt;
      p.x = f.x;
      p.z = f.z;
      p.root.position.set(f.x, -(1 - fade) * 0.6, f.z);
      p.root.rotation.set(f.dying >= 0 && !heavy ? -(1 - fade) * 1.3 : 0, f.yaw, 0);
      p.root.scale.setScalar(f.scale * (heavy ? 0.6 + fade * 0.4 : 1));
      const blow = heavy ? "Attack" : "Slash";
      if (f.windup > 0 && p.windup <= 0) once(p, blow, HIT[blow] / f.windupTime);
      if (f.windup <= 0 && p.windup > 0 && p.busy) p.busy.timeScale = 1.7;
      p.windup = f.windup;
      if (p.busy && (!p.busy.isRunning() || p.busy.time >= p.busy.getClip().duration - 0.06)) p.busy = null;
      if (!p.busy) {
        if (moved > 0.4) play(p, heavy ? "Walk" : "Run", heavy ? Math.min(2.2, 0.6 + moved * 0.35) : Math.min(1.6, 0.5 + moved * 0.2));
        else play(p, "Idle");
      }
      flash(p, f.flash > 0, fade);
      p.mixer.update(dt);
    };

    for (let i = 0; i < MAX; i++) {
      const f = sim.foes[i];
      hide();
      bm.setMatrixAt(i, dummy.matrix);
      cm.setMatrixAt(i, dummy.matrix);
      if (!f) continue;
      alive.add(f.id);
      let top = 2.2 * f.scale;
      if (f.kind === "spitter") {
        // a seer: a black shard with one eye, hanging in the air
        if (seer < SEERS) {
          const fade = f.dying >= 0 ? Math.max(0, 1 - f.dying / 0.6) : 1;
          const warn = f.windup > 0 ? 1 - f.windup / f.windupTime : 0;
          const y = 1.5 * f.scale + Math.sin(t * 2.2 + f.id) * 0.18;
          dummy.position.set(f.x, y, f.z);
          dummy.rotation.set(0, f.yaw + Math.sin(t * 1.3 + f.id) * 0.3, 0);
          dummy.scale.set(0.42 * f.scale * fade, 1.05 * f.scale * fade, 0.42 * f.scale * fade);
          dummy.updateMatrix();
          sm.setMatrixAt(seer, dummy.matrix);
          sm.setColorAt(seer, tint.set(f.flash > 0 ? "#ffffff" : "#4a4742"));
          dummy.position.set(f.x + Math.sin(f.yaw) * 0.3 * f.scale, y + 0.1, f.z + Math.cos(f.yaw) * 0.3 * f.scale);
          dummy.scale.setScalar((0.085 + warn * 0.13) * f.scale * fade);
          dummy.updateMatrix();
          em.setMatrixAt(seer, dummy.matrix);
          em.setColorAt(seer, tint.set("#a9c96a").lerp(WHITE, warn));
          seer++;
        }
        top = 2.7 * f.scale;
      } else {
        let p = taken.current.get(f.id);
        if (!p) {
          p = (f.kind === "shade" ? pool.shade : pool.heavy).find((c) => c.foe < 0);
          if (p) {
            p.foe = f.id;
            p.x = f.x;
            p.z = f.z;
            p.windup = 0;
            p.busy = null;
            p.current = "";
            p.mixer.stopAllAction();
            p.root.visible = true;
            taken.current.set(f.id, p);
          }
        }
        if (p) drive(f, p);
        if (f.kind !== "shade") top = 1.9 * f.scale;
      }

      if (f.dying < 0 && f.hp < f.maxHp) {
        dummy.position.set(f.x, top + 0.3, f.z);
        dummy.quaternion.copy(state.camera.quaternion);
        dummy.scale.set(Math.max(0.02, (f.hp / f.maxHp) * (0.9 + f.scale * 0.5)), 1, 1);
        dummy.updateMatrix();
        bm.setMatrixAt(i, dummy.matrix);
      }
      if (f.kind === "warden" && f.dying < 0) {
        dummy.position.set(f.x, top + 0.9, f.z);
        dummy.rotation.set(0, t * 1.5, 0);
        dummy.scale.setScalar(0.4);
        dummy.updateMatrix();
        cm.setMatrixAt(i, dummy.matrix);
      }
    }

    for (let i = seer; i < SEERS; i++) {
      hide();
      sm.setMatrixAt(i, dummy.matrix);
      em.setMatrixAt(i, dummy.matrix);
    }
    for (const [id, p] of taken.current) {
      if (alive.has(id)) continue;
      p.root.visible = false;
      p.foe = -1;
      taken.current.delete(id);
    }
    for (const m of [sm, em, bm, cm]) m.instanceMatrix.needsUpdate = true;
    if (sm.instanceColor) sm.instanceColor.needsUpdate = true;
    if (em.instanceColor) em.instanceColor.needsUpdate = true;
  });

  return (
    <>
      {all.map((p, i) => (
        <primitive key={i} object={p.root} />
      ))}
      <instancedMesh ref={seers} args={[undefined, undefined, SEERS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.55} metalness={0.35} flatShading />
      </instancedMesh>
      <instancedMesh ref={eyes} args={[undefined, undefined, SEERS]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bars} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <planeGeometry args={[1, 0.07]} />
        <meshBasicMaterial color="#c8463a" toneMapped={false} depthTest={false} transparent />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#b9a6dc" toneMapped={false} wireframe />
      </instancedMesh>
    </>
  );
}

/* ── the obelisks: carved stone whose glyphs light up with what happens to them ── */

const STATE_COLOR = { sealed: "#5e1b15", raid: "#c8402c", fallen: "#5fa8cf", risen: "#8f86c8" };
const OBELISK_HEIGHT = 9;

/** an obelisk, and the one thing that changes on it: the light in its carvings */
function carvedStone(source: Object3D) {
  const mats: MeshStandardMaterial[] = [];
  const model = standing(source, OBELISK_HEIGHT, (m) => {
    m.color.set("#6a6660");
    // the carvings are the texture: lit from inside, they are the glyphs
    m.emissiveMap = m.map;
    m.emissive.set(STATE_COLOR.sealed);
    m.roughness = 0.6;
    mats.push(m);
  });
  const light = (hex: string, power: number) => {
    for (const m of mats) {
      m.emissive.set(hex);
      m.emissiveIntensity = power;
    }
  };
  return { model, light };
}

function Obelisk({ index, source }: { index: number; source: Object3D }) {
  const gem = useRef<Mesh>(null);
  const gemMat = useRef<MeshBasicMaterial>(null);
  const ringMat = useRef<MeshBasicMaterial>(null);
  const stone = useMemo(() => carvedStone(source), [source]);
  const o = game.sim?.obelisks[index];

  useFrame((state) => {
    const ob = game.sim?.obelisks[index];
    if (!ob || !gem.current || !gemMat.current || !ringMat.current) return;
    const t = state.clock.elapsedTime;
    const busy = ob.state === "raid" || ob.state === "fallen";
    gem.current.rotation.y = t * (busy ? 2.4 : 0.6);
    gem.current.position.y = OBELISK_HEIGHT + 1 + Math.sin(t * 1.3 + index) * 0.25;
    const glow = busy ? 0.75 + Math.sin(t * 6) * 0.25 : ob.revealed ? 1 : 0.7;
    gemMat.current.color.set(STATE_COLOR[ob.state]).multiplyScalar(glow * (ob.state === "sealed" && !ob.revealed ? 0.9 : 1.15));
    ringMat.current.color.copy(gemMat.current.color);
    stone.light(STATE_COLOR[ob.state], (ob.state === "sealed" && !ob.revealed ? 0.14 : 0.5) * glow);
  });

  if (!o) return null;
  return (
    <group position={[o.x, 0, o.z]} rotation={[0, Math.atan2(o.x, o.z), 0]}>
      <primitive object={stone.model} />
      <mesh ref={gem} position={[0, OBELISK_HEIGHT + 1, 0]}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshBasicMaterial ref={gemMat} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.7, 2.8, 64]} />
        <meshBasicMaterial ref={ringMat} toneMapped={false} transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Obelisks() {
  const { scene } = useModel(MODELS.obelisk);
  const count = game.sim?.obelisks.length ?? 0;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Obelisk key={i} index={i} source={scene} />
      ))}
    </>
  );
}

/* ── the ruin the rock closed over ── */

const STATUES = 14;
/** the colossus on the dais and the statues that have not woken yet */
export function Ruins() {
  const hooded = useModel(MODELS.colossus);
  const knight = useModel(MODELS.knight);
  const colossus = useMemo(
    () =>
      standing(hooded.scene, 16, (m) => {
        m.color.set("#8b8986");
        // its own texture lights it: the cloth is black, the eyes are not
        m.emissiveMap = m.map;
        m.emissive.set("#9fe6ff");
        m.emissiveIntensity = 0.9;
        m.roughness = 1;
      }),
    [hooded],
  );
  const statues = useMemo(() => {
    const r = rngFrom(31);
    return Array.from({ length: STATUES }, (_, i) => {
      const p = puppet(knight.scene, knight.animations, 2.3, stone);
      // two slots are taken: the colossus (north) and the door (south)
      const slot = i < STATUES / 2 ? i + 1 : i + 2;
      const a = Math.PI + (slot / (STATUES + 2)) * Math.PI * 2;
      p.root.position.set(Math.sin(a) * CAVE.aisle, 1.2, Math.cos(a) * CAVE.aisle);
      p.root.rotation.y = a + Math.PI;
      p.root.visible = true;
      // frozen mid-gesture, each at its own moment: the mixer never runs again
      const pose = p.actions[i % 3 === 0 ? "Slash" : i % 3 === 1 ? "Idle" : "PowerUp"];
      pose.play();
      p.mixer.setTime(r() * pose.getClip().duration);
      return p;
    });
  }, [knight]);
  const plinths = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = plinths.current;
    if (!m) return;
    statues.forEach((p, i) => {
      dummy.position.set(p.root.position.x, 0.6, p.root.position.z);
      dummy.rotation.set(0, p.root.rotation.y, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [statues]);
  return (
    <>
      <group position={[0, 2.4, -CAVE.aisle]}>
        <primitive object={colossus} />
      </group>
      {statues.map((p, i) => (
        <primitive key={i} object={p.root} />
      ))}
      <instancedMesh ref={plinths} args={[undefined, undefined, STATUES]} frustumCulled={false}>
        <boxGeometry args={[3.4, 1.2, 3.4]} />
        <meshStandardMaterial color="#5d5b58" roughness={1} />
      </instancedMesh>
    </>
  );
}
