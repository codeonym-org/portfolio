/**
 * Plays the System's reply sentence by sentence: every sentence is
 * sent to TTS the moment the chunker emits it (so synthesis overlaps
 * the model still writing), and played strictly in order through one
 * <audio> element. `stop()` is the barge-in: the visitor pressed the
 * key again, so everything queued is dropped mid-word.
 */

type Line = { text: string; audio: Promise<string | null>; abort: AbortController };

/** 10 ms of silent 8 kHz mono WAV */
const SILENCE = "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

export class SpeechPlayer {
  private el: HTMLAudioElement | null = null;
  private lines: Line[] = [];
  private playing = false;
  private generation = 0;
  private audio: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Uint8Array<ArrayBuffer> | null = null;
  private drained: (() => void)[] = [];
  private unlocked = false;

  constructor(
    private readonly opts: {
      endpoint: string;
      onSpeaking: (speaking: boolean) => void;
      onLine?: (text: string) => void;
      onError?: (err: unknown) => void;
      /** the browser refused to play: nothing more is said until the next press */
      onBlocked?: () => void;
    },
  ) {}

  get speaking() {
    return this.playing;
  }

  /** queue one sentence; synthesis starts now, playback in turn */
  say(text: string) {
    const abort = new AbortController();
    const audio = fetch(this.opts.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: abort.signal,
    })
      .then(async (res) => (res.ok ? URL.createObjectURL(await res.blob()) : Promise.reject(new Error(`TTS ${res.status}`))))
      .catch((err) => {
        if (!abort.signal.aborted) this.opts.onError?.(err);
        return null;
      });
    this.lines.push({ text, audio, abort });
    void this.pump();
  }

  /** barge-in: drop everything, now */
  stop() {
    this.generation++;
    for (const l of this.lines) {
      l.abort.abort();
      void l.audio.then((url) => url && URL.revokeObjectURL(url));
    }
    this.lines = [];
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute("src");
    }
    this.setPlaying(false);
  }

  /** resolves when everything queued has been said (or dropped) */
  idle(): Promise<void> {
    if (!this.playing && !this.lines.length) return Promise.resolve();
    return new Promise((resolve) => this.drained.push(resolve));
  }

  /** call inside the press gesture: later replies (task reports) may then autoplay */
  unlock() {
    const el = this.element();
    if (this.audio?.state === "suspended") void this.audio.resume();
    if (this.unlocked) return;
    this.unlocked = true;
    // a muted play of a real (silent) clip grants the element autoplay; an empty
    // element's play() would stay pending and later pause the first real line
    el.muted = true;
    el.src = SILENCE;
    void el
      .play()
      .catch(() => {})
      .finally(() => {
        if (el.src !== SILENCE) return;
        el.pause();
        el.removeAttribute("src");
        el.muted = false;
      });
  }

  level() {
    if (!this.playing || !this.analyser || !this.samples) return 0;
    this.analyser.getByteTimeDomainData(this.samples);
    let sum = 0;
    for (const v of this.samples) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.samples.length) * 3.2);
  }

  dispose() {
    this.stop();
    void this.audio?.close().catch(() => {});
    this.audio = null;
  }

  private element() {
    if (this.el) return this.el;
    const el = new Audio();
    el.preload = "auto";
    this.el = el;
    try {
      this.audio = new AudioContext();
      const analyser = this.audio.createAnalyser();
      analyser.fftSize = 512;
      this.audio.createMediaElementSource(el).connect(analyser);
      analyser.connect(this.audio.destination);
      this.analyser = analyser;
      this.samples = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    } catch {
      this.analyser = null; // no metering — the element still plays on its own
    }
    return el;
  }

  private async pump() {
    if (this.playing) return;
    const gen = this.generation;
    const el = this.element();
    this.setPlaying(true);
    while (this.lines.length && gen === this.generation) {
      const line = this.lines[0];
      const url = await line.audio;
      if (gen !== this.generation) break;
      this.lines.shift();
      if (!url) continue;
      this.opts.onLine?.(line.text);
      try {
        el.muted = false;
        el.src = url;
        await el.play();
        await new Promise<void>((resolve) => {
          const done = () => {
            el.removeEventListener("ended", done);
            el.removeEventListener("pause", done);
            el.removeEventListener("error", done);
            resolve();
          };
          el.addEventListener("ended", done);
          el.addEventListener("pause", done);
          el.addEventListener("error", done);
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          this.stop();
          this.opts.onBlocked?.();
          return;
        }
        this.opts.onError?.(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (gen === this.generation) this.setPlaying(false);
  }

  private setPlaying(on: boolean) {
    if (this.playing === on) return;
    this.playing = on;
    this.opts.onSpeaking(on);
    if (!on) this.drained.splice(0).forEach((d) => d());
  }
}
