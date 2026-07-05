/**
 * Sound design for the room, built the way phantom.land builds theirs:
 * five produced samples (load / whoosh / swipe / riser / click, served from
 * /public/sounds) played through a WebAudio graph with a synthesized
 * convolver reverb. The shared reverb tail is what melts the one-shots
 * into one continuous, polished space instead of separate sound effects.
 *
 * The context is created lazily on the first user gesture (autoplay policy)
 * and the whole mix runs through one master gain so mute is a single ramp.
 */

const STORAGE_KEY = "resume-sound";

const SAMPLE_URLS = {
  load: "/sounds/load.mp3",
  whoosh: "/sounds/whoosh.mp3",
  swipe: "/sounds/swipe.mp3",
  riser: "/sounds/riser.mp3",
  click: "/sounds/click.mp3",
} as const;

type SampleName = keyof typeof SAMPLE_URLS;
type Sub = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private buffers: Partial<Record<SampleName, AudioBuffer>> = {};
  private lastWhoosh = 0;
  private lastClick = 0;
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
    this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -20;
    limiter.ratio.value = 8;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);

    // One shared reverb, fed per-voice through send gains.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(ctx, 2.6, 2.4);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.55;
    this.reverb.connect(reverbReturn);
    reverbReturn.connect(this.master);

    void this.loadSamples(ctx);

    if (!this.muted) {
      // The room fades in like the lights coming up — never a hard start.
      this.master.gain.setTargetAtTime(1, ctx.currentTime + 0.4, 1.2);
    }
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

  // ---- Sample infrastructure -------------------------------------------

  private async loadSamples(ctx: AudioContext): Promise<void> {
    await Promise.all(
      (Object.keys(SAMPLE_URLS) as SampleName[]).map(async (name) => {
        try {
          const res = await fetch(SAMPLE_URLS[name]);
          const data = await res.arrayBuffer();
          this.buffers[name] = await ctx.decodeAudioData(data);
        } catch {
          // Sound is a nicety — a missing sample just stays silent.
        }
      })
    );
    this.startBed();
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

  private play(
    name: SampleName,
    opts: {
      gain?: number;
      rate?: number;
      send?: number;
      loop?: boolean;
      loopStart?: number;
      lowpass?: number;
    } = {}
  ): void {
    const buf = this.buffers[name];
    if (!this.ctx || !this.master || !buf) return;
    const { gain = 0.5, rate = 1, send = 0.6, loop = false, loopStart = 0, lowpass } = opts;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    if (loop) {
      src.loop = true;
      src.loopStart = loopStart;
      src.loopEnd = buf.duration;
    }
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    let tail: AudioNode = g;
    if (lowpass) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = lowpass;
      lp.Q.value = 0.5;
      g.connect(lp);
      tail = lp;
    }
    tail.connect(this.master);
    if (send > 0 && this.reverb) {
      const s = this.ctx.createGain();
      s.gain.value = send;
      tail.connect(s);
      s.connect(this.reverb);
    }
    src.start();
  }

  // ---- Beds -------------------------------------------------------------

  /**
   * The load rumble becomes the room's idle bed: the first pass plays its
   * intro transient (the "power on"), then it loops only the rumble body.
   * The lowpass strips the sample's faint ~1.3kHz tonal line, which reads
   * as a constant bell when looped — only the deep rumble survives.
   */
  private startBed(): void {
    this.play("load", {
      gain: 0.7,
      send: 0.9,
      loop: true,
      loopStart: 1.0,
      lowpass: 260,
    });
  }

  /**
   * Drive from the render loop with 0..1 pointer/camera energy. Fast
   * movement retriggers the whoosh sample — pitch and level ride the
   * energy, and the shared reverb smears retriggers into one motion.
   */
  setWarp(energy: number): void {
    if (!this.ctx || this.muted) return;
    const v = Math.min(1, Math.max(0, energy));
    const now = performance.now();
    if (v > 0.3 && now - this.lastWhoosh > 1400) {
      this.lastWhoosh = now;
      this.play("whoosh", {
        gain: 0.25 + v * 0.45,
        rate: 0.85 + v * 0.3 + Math.random() * 0.08,
        send: 0.7,
      });
    }
  }

  // ---- One-shots ----------------------------------------------------------

  /** A hard drag-and-release throw — the long echoing swipe tail. */
  swipe(intensity: number): void {
    const v = Math.min(1, Math.max(0, intensity));
    if (this.muted) return;
    this.play("swipe", { gain: 0.2 + v * 0.35, rate: 0.95 + v * 0.15, send: 0.6 });
  }

  /** Card hover — the click sample, tiny and up-pitched, rate-limited. */
  hover(): void {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastClick < 90) return;
    this.lastClick = now;
    this.play("click", {
      gain: 0.12,
      rate: 1.15 + Math.random() * 0.1,
      send: 0.35,
    });
  }

  /** Nav tick — the click at its natural pitch. */
  tick(): void {
    if (this.muted) return;
    this.play("click", { gain: 0.22, rate: 1, send: 0.4 });
  }

  /** Card opens — the riser, a swell into the detail view. */
  open(): void {
    if (this.muted) return;
    this.play("riser", { gain: 0.4, rate: 1, send: 0.65 });
  }

  /** Back to the gallery — a low, slow whoosh out. */
  close(): void {
    if (this.muted) return;
    this.play("whoosh", { gain: 0.3, rate: 0.75, send: 0.7 });
  }
}

export const audio = new AudioEngine();
