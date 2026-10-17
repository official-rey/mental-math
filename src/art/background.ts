/**
 * Margin art on one fixed canvas. It draws only in the empty side margins of wide screens
 * (never behind content): a golden-angle seed head on the left, a harmonograph on the right.
 * Narrow screens get no background art; the Train page has its own art plate instead.
 */
import { PALETTE } from '../theme';
import { drawHarmonograph, drawPhyllotaxis, HARMONOGRAPHS } from './figures';

/** Content column width (matches --measure plus the 16 px gutters). */
const COLUMN = 720 + 32;
const MIN_MARGIN = 230;

const TRACE_MS = 30000;
const HOLD_MS = 8000;
const FADE_MS = 3000;
const CYCLE = TRACE_MS + HOLD_MS + FADE_MS;

const COLORS = { ink: PALETTE.ink, accent: PALETTE.accent, rule: PALETTE.rule };

export interface ArtController {
  pause(): void;
  resume(): void;
  setEnabled(on: boolean): void;
}

export function startArt(canvas: HTMLCanvasElement): ArtController {
  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, dpr = 1;
  let paused = false;
  let enabled = true;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let cycle = 0;

  const margin = () => (w - COLUMN) / 2;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    run();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const m = margin();
    if (!enabled || m < MIN_MARGIN) return;

    const still = reduced.matches;
    const t = still ? TRACE_MS : elapsed;
    const progress = Math.min(1, t / TRACE_MS);
    const fade = t > TRACE_MS + HOLD_MS ? Math.max(0, 1 - (t - TRACE_MS - HOLD_MS) / FADE_MS) : 1;
    const size = Math.min(m * 0.36, h * 0.3);

    // Left margin: seeds appear outward, then the head turns slowly.
    ctx.save();
    ctx.translate(m / 2, h * 0.42);
    ctx.rotate(still ? 0 : performance.now() / 90000);
    drawPhyllotaxis(ctx, { cx: 0, cy: 0, r: size, count: 520, progress: 0.15 + 0.85 * easeOut(progress), colors: COLORS, alpha: fade });
    ctx.restore();

    // Right margin: a harmonograph traced from the outside in.
    drawHarmonograph(ctx, {
      cx: w - m / 2,
      cy: h * 0.58,
      size,
      h: HARMONOGRAPHS[cycle % HARMONOGRAPHS.length],
      progress: easeOut(progress),
      color: PALETTE.dim,
      alpha: 0.45 * fade,
      width: 0.7,
    });
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < 33) return;
    last = now;
    elapsed += Math.min(dt, 100);
    if (elapsed >= CYCLE) {
      elapsed = 0;
      cycle++;
    }
    draw();
  }

  function run() {
    cancelAnimationFrame(raf);
    const idle = paused || document.hidden || reduced.matches || !enabled || margin() < MIN_MARGIN;
    if (idle) {
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

  return {
    pause() {
      paused = true;
      run();
    },
    resume() {
      paused = false;
      run();
    },
    setEnabled(on) {
      enabled = on;
      run();
    },
  };
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
