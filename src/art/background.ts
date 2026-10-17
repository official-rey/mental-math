/**
 * Slow math-art background on one fixed canvas: rose curves, Lissajous figures, spirograph
 * traces and a golden spiral, traced in rule and accent tones at low opacity.
 */
import { PALETTE } from '../theme';
import { FIGURES, type Pt } from './figures';

const TAU = Math.PI * 2;

interface Layer {
  pts: Pt[];
  cx: number; // fraction of width
  cy: number; // fraction of height
  size: number; // fraction of min(w, h)
  color: string;
  alpha: number;
  width: number;
  rot: number;
}

const TRACE_MS = 26000;
const HOLD_MS = 7000;
const FADE_MS = 3500;
const CYCLE = TRACE_MS + HOLD_MS + FADE_MS;

export interface ArtController {
  pause(): void;
  resume(): void;
}

export function startArt(canvas: HTMLCanvasElement): ArtController {
  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, dpr = 1;
  let paused = false;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let index = Math.floor(Math.random() * FIGURES.length);
  let layers = makeLayers(index);

  function makeLayers(i: number): Layer[] {
    const wide = innerWidth > 760;
    return [
      {
        pts: FIGURES[i % FIGURES.length](),
        cx: wide ? 0.78 : 0.82, cy: 0.24, size: wide ? 0.42 : 0.5,
        color: PALETTE.rule, alpha: 0.75, width: 1.25, rot: (i * 0.7) % TAU,
      },
      {
        pts: FIGURES[(i + 3) % FIGURES.length](),
        cx: wide ? 0.16 : 0.12, cy: 0.84, size: wide ? 0.3 : 0.36,
        color: PALETTE.accent, alpha: 0.16, width: 1, rot: (i * 1.3) % TAU,
      },
    ];
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  }

  function drawLayer(L: Layer, progress: number, fade: number) {
    const n = Math.max(2, Math.floor(L.pts.length * progress));
    const s = Math.min(w, h) * L.size;
    const cx = w * L.cx, cy = h * L.cy;
    const cos = Math.cos(L.rot), sin = Math.sin(L.rot);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [x, y] = L.pts[i];
      const X = cx + (x * cos - y * sin) * s;
      const Y = cy + (x * sin + y * cos) * s;
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.globalAlpha = L.alpha * fade;
    ctx.strokeStyle = L.color;
    ctx.lineWidth = L.width;
    ctx.stroke();
    // A small point riding the tip of the trace.
    if (progress < 1 && !reduced.matches) {
      const [x, y] = L.pts[n - 1];
      ctx.beginPath();
      ctx.arc(cx + (x * cos - y * sin) * s, cy + (x * sin + y * cos) * s, 2.2, 0, TAU);
      ctx.fillStyle = PALETTE.accent;
      ctx.globalAlpha = 0.35 * fade;
      ctx.fill();
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    let progress = 1, fade = 1;
    if (!reduced.matches) {
      progress = Math.min(1, elapsed / TRACE_MS);
      const fadeStart = TRACE_MS + HOLD_MS;
      if (elapsed > fadeStart) fade = Math.max(0, 1 - (elapsed - fadeStart) / FADE_MS);
      progress = easeInOut(progress);
    }
    for (const L of layers) drawLayer(L, progress, fade);
    ctx.globalAlpha = 1;
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < 33) return; // ~30 fps is plenty for a slow trace
    last = now;
    elapsed += Math.min(dt, 100);
    if (elapsed >= CYCLE) {
      elapsed = 0;
      index++;
      layers = makeLayers(index);
    }
    draw();
  }

  function run() {
    cancelAnimationFrame(raf);
    if (paused || document.hidden || reduced.matches) {
      draw();
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', run);
  reduced.addEventListener?.('change', run);
  resize();
  run();

  return {
    pause() {
      paused = true;
      run();
    },
    resume() {
      paused = false;
      run();
    },
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
