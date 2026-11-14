import { useWorldStore } from "@/store/world-store";

/**
 * Audio — CC0 samples (Kenney), the System notification chime and a
 * suspense theme loop.
 * Buffers are fetched lazily on first use; everything fails silently,
 * audio is decoration and never load-bearing.
 */

const SOUNDS = {
  hover: "/audio/hover.mp3",
  click: "/audio/click.mp3",
  open: "/audio/open.mp3",
  close: "/audio/close.mp3",
  confirm: "/audio/confirm.mp3",
  portal: "/audio/portal.mp3",
  shockwave: "/audio/shockwave.mp3",
  system: "/audio/notify.mp3",
  coins: "/audio/coins.mp3",
  blade: "/audio/blade.mp3",
} as const;

export type SoundId = keyof typeof SOUNDS;

const VOLUME: Partial<Record<SoundId, number>> = {
  hover: 0.25,
  shockwave: 0.9,
  portal: 0.5,
  system: 0.4,
};

/** the theme is mastered loud — keep it well under the effects */
const MUSIC_LEVEL = 0.16;
const MUSIC_DUCKED = 0.04;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SoundId, Promise<AudioBuffer | null>>();
let music: { el: HTMLAudioElement; node: MediaElementAudioSourceNode; gain: GainNode } | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
      master.gain.value = useWorldStore.getState().muted ? 0 : 1;
      useWorldStore.subscribe((s, prev) => {
        if (s.muted === prev.muted || !ctx || !master) return;
        master.gain.setTargetAtTime(s.muted ? 0 : 1, ctx.currentTime, 0.08);
      });
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function load(id: SoundId): Promise<AudioBuffer | null> {
  let pending = buffers.get(id);
  if (!pending) {
    pending = fetch(SOUNDS[id])
      .then((r) => r.arrayBuffer())
      .then((data) => context()?.decodeAudioData(data) ?? null)
      .catch(() => null);
    buffers.set(id, pending);
  }
  return pending;
}

export function play(id: SoundId, opts: { volume?: number; rate?: number } = {}) {
  const ac = context();
  if (!ac || !master || useWorldStore.getState().muted) return;
  void load(id).then((buffer) => {
    if (!buffer || !master) return;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = opts.rate ?? 1;
    const gain = ac.createGain();
    gain.gain.value = opts.volume ?? VOLUME[id] ?? 0.6;
    src.connect(gain).connect(master);
    src.start();
  });
}

/** the System chime — throttled so stacked prompts don't pile up the 3s sting */
let lastChime = 0;
export function chime(volume?: number) {
  const now = performance.now();
  if (now - lastChime < 2500) return;
  lastChime = now;
  play("system", { volume });
}

/** warm the cache for sounds that must fire without latency */
export function preloadSounds() {
  if (!context()) return;
  (Object.keys(SOUNDS) as SoundId[]).forEach((id) => void load(id));
}

/** start (or resume) the ambient loop with a slow fade-in; call from a gesture */
export function startMusic() {
  const ac = context();
  if (!ac || !master) return;
  if (!music) {
    const el = new Audio("/audio/theme.mp3");
    el.loop = true;
    el.crossOrigin = "anonymous";
    const node = ac.createMediaElementSource(el);
    const gain = ac.createGain();
    gain.gain.value = 0;
    node.connect(gain).connect(master);
    music = { el, node, gain };
  }
  void music.el.play().catch(() => {});
  music.gain.gain.cancelScheduledValues(ac.currentTime);
  music.gain.gain.setTargetAtTime(MUSIC_LEVEL, ac.currentTime, 1.6);
}

/** hold the music down while the System listens or speaks */
export function holdMusicDuck(on: boolean) {
  if (!ctx || !music) return;
  const g = music.gain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setTargetAtTime(on ? MUSIC_DUCKED : MUSIC_LEVEL, ctx.currentTime, on ? 0.12 : 0.9);
}
