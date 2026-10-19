/** Short synthesized tones (Web Audio). No audio files. */
type Note = { f: number; at: number; dur: number; type?: OscillatorType; gain?: number; slide?: number };

class Sound {
  muted = false;
  private ctx: AudioContext | null = null;

  private audio(): AudioContext | null {
    if (this.muted) return null;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private play(notes: Note[]) {
    const ctx = this.audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.005;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.setValueAtTime(n.f, t0 + n.at);
      if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.f * n.slide, t0 + n.at + n.dur);
      const peak = n.gain ?? 0.12;
      g.gain.setValueAtTime(0.0001, t0 + n.at);
      g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
  }

  /** The ding climbs a semitone with each answer in a streak, up to an octave. */
  correct(streak = 0) {
    const k = 2 ** (Math.min(Math.max(streak - 1, 0), 12) / 12);
    this.play([
      { f: 784 * k, at: 0, dur: 0.08 },
      { f: 1175 * k, at: 0.055, dur: 0.12, gain: 0.09 },
    ]);
  }

  /** Soft "try again". */
  wrong() {
    this.play([{ f: 220, at: 0, dur: 0.16, type: 'triangle', gain: 0.1, slide: 0.85 }]);
  }

  /** A streak milestone: a quick rising arpeggio. */
  milestone() {
    this.play([
      { f: 659, at: 0, dur: 0.09 },
      { f: 880, at: 0.07, dur: 0.09 },
      { f: 1319, at: 0.14, dur: 0.2, gain: 0.1 },
    ]);
  }

  /** Beating your best or your average. */
  best() {
    this.play([
      { f: 784, at: 0, dur: 0.12, type: 'triangle' },
      { f: 1047, at: 0.1, dur: 0.12, type: 'triangle' },
      { f: 1568, at: 0.2, dur: 0.3, type: 'triangle', gain: 0.1 },
    ]);
  }

  finish() {
    this.play([
      { f: 523, at: 0, dur: 0.14 },
      { f: 659, at: 0.1, dur: 0.14 },
      { f: 784, at: 0.2, dur: 0.16 },
      { f: 1047, at: 0.3, dur: 0.32, gain: 0.1 },
    ]);
  }
}

export const sound = new Sound();
