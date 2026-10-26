/**
 * Sound is intentionally minimal: one soft up-pitched tick when the pointer
 * finds a card, played through a small synthesized reverb so it lands in a
 * space rather than clicking dryly. Everything else — ambient beds, motion
 * whooshes, UI ticks — was removed on purpose; the room stays silent.
 *
 * The context is created lazily on the first user gesture (autoplay policy)
 * and the mix runs through one master gain so mute is a single ramp.
 */

const STORAGE_KEY = "resume-sound";

const CLICK_URL = "/sounds/click.mp3";

type Sub = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private clickBuffer: AudioBuffer | null = null;
  private lastHover = 0;
  private subs = new Set<Sub>();

  muted = false;
  started = false;

  /** Call from any user gesture; safe to call repeatedly. */
  init(): void {
    if (this.started || typeof window === "undefined") return;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.started = true;
    this.muted = localStorage.getItem(STORAGE_KEY) === "off";

    const ctx = new AC();
    void ctx.resume();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -20;
    limiter.ratio.value = 8;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);

    // A short soft tail so the hover tick doesn't land bone-dry.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(ctx, 1.8, 2.6);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.5;
    this.reverb.connect(reverbReturn);
    reverbReturn.connect(this.master);

    void fetch(CLICK_URL)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => {
        this.clickBuffer = buf;
      })
      .catch(() => {
        // Sound is a nicety — a missing sample just stays silent.
      });

    this.emit();
  }

  subscribe(fn: Sub): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  private emit() {
    this.subs.forEach((fn) => fn());
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(STORAGE_KEY, muted ? "off" : "on");
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 1,
        this.ctx.currentTime,
        0.25
      );
    }
    this.emit();
  }

  /** Exponentially decaying stereo noise — a synthesized room impulse. */
  private impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /** Card hover — the only sound in the room. Up-pitched, rate-limited. */
  hover(): void {
    if (this.muted || !this.ctx || !this.master || !this.clickBuffer) return;
    const now = performance.now();
    if (now - this.lastHover < 90) return;
    this.lastHover = now;

    const src = this.ctx.createBufferSource();
    src.buffer = this.clickBuffer;
    src.playbackRate.value = 1.35 + Math.random() * 0.1;
    const g = this.ctx.createGain();
    g.gain.value = 0.08;
    src.connect(g);
    g.connect(this.master);
    if (this.reverb) {
      const send = this.ctx.createGain();
      send.gain.value = 0.5;
      g.connect(send);
      send.connect(this.reverb);
    }
    src.start();
  }
}

export const audio = new AudioEngine();
