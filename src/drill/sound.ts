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

  correct() {
    this.play([
      { f: 784, at: 0, dur: 0.08 },
      { f: 1175, at: 0.055, dur: 0.12, gain: 0.09 },
    ]);
  }

  wrong() {
    this.play([{ f: 196, at: 0, dur: 0.2, type: 'triangle', gain: 0.16, slide: 0.8 }]);
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
