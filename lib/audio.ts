/**
 * Synthesized sound design for the room — no audio assets, everything is
 * generated with the Web Audio API and tuned around A so the palette feels
 * composed: a near-subliminal ambient pad, a wind bed that follows the
 * camera's momentum, and tiny percussive confirmations for hover/click.
 *
 * The context is created lazily on the first user gesture (autoplay policy)
 * and the whole mix runs through one master gain so mute is a single ramp.
 */

const STORAGE_KEY = "resume-sound";

type Sub = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private lastBlip = 0;
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

    this.buildAmbient(ctx, this.master);
    this.buildWind(ctx, this.master);

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

  // ---- Beds -----------------------------------------------------------

  /** Low A pad: three detuned partials under a slowly breathing lowpass. */
  private buildAmbient(ctx: AudioContext, out: GainNode): void {
    const pad = ctx.createGain();
    pad.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    filter.Q.value = 0.4;
    pad.connect(filter);
    filter.connect(out);
    this.ambient = pad;

    const partials: Array<[OscillatorType, number, number]> = [
      ["sine", 55, 0.5], // A1
      ["sine", 110.4, 0.3], // A2, a hair sharp for slow beating
      ["triangle", 164.8, 0.12], // E3
    ];
    for (const [type, freq, level] of partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(pad);
      osc.start();
    }

    // One slow LFO breathes the filter so the pad never reads as a test tone.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 70;
    lfo.connect(lfoAmt);
    lfoAmt.connect(filter.frequency);
    lfo.start();
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Filtered noise bed, silent until the camera moves. */
  private buildWind(ctx: AudioContext, out: GainNode): void {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 260;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start();
    this.windGain = gain;
    this.windFilter = filter;
  }

  /** Drive from the render loop with 0..1 camera energy. */
  setWind(energy: number): void {
    if (!this.ctx || !this.windGain || !this.windFilter) return;
    const t = this.ctx.currentTime;
    const v = Math.min(1, Math.max(0, energy));
    this.windGain.gain.setTargetAtTime(v * 0.055, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(240 + v * 640, t, 0.15);
  }

  // ---- One-shots --------------------------------------------------------

  private blip(
    freq: number,
    opts: { gain?: number; decay?: number; glideTo?: number; type?: OscillatorType } = {}
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const { gain = 0.05, decay = 0.15, glideTo, type = "sine" } = opts;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }

  /** Card hover — a tiny high tick, rate-limited, humanised with detune. */
  hover(): void {
    const now = performance.now();
    if (now - this.lastBlip < 90) return;
    this.lastBlip = now;
    this.blip(880 * Math.pow(2, (Math.random() * 40 - 20) / 1200), {
      gain: 0.028,
      decay: 0.09,
    });
  }

  /** Nav tick — quieter, lower. */
  tick(): void {
    this.blip(660, { gain: 0.03, decay: 0.08 });
  }

  /** Card opens — rising fifth, like a door swinging in. */
  open(): void {
    this.blip(330, { gain: 0.06, decay: 0.5, glideTo: 660 });
  }

  /** Back to the gallery — the same door, closing. */
  close(): void {
    this.blip(560, { gain: 0.05, decay: 0.4, glideTo: 300 });
  }
}

export const audio = new AudioEngine();
