/**
 * Background: faint graph paper drifting slowly on one fixed canvas. The grid fades out
 * behind the content column so text always sits on clean paper. Static under reduced motion.
 */
import { PALETTE } from '../theme';

const CELL = 26;
const MAJOR = 5;
const SPEED = 5; // px per second, diagonally
const COLUMN = 720;

export interface ArtController {
  pause(): void;
  resume(): void;
  setEnabled(on: boolean): void;
}

export function startArt(canvas: HTMLCanvasElement): ArtController {
  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, dpr = 1;
  let paused = false, enabled = true;
  let raf = 0, last = 0, offset = 0;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  }

  function grid(step: number, color: string, alpha: number, width: number) {
    const o = offset % step;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let x = -step + o; x < w; x += step) ctx.fillRect(Math.round(x), 0, width, h);
    for (let y = -step + o; y < h; y += step) ctx.fillRect(0, Math.round(y), w, width);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    if (!enabled) return;
    grid(CELL, PALETTE.rule, 0.45, 1);
    grid(CELL * MAJOR, PALETTE.rule, 0.9, 1);
    // Fade the grid out behind the reading column.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    const half = Math.min(w, COLUMN) / 2;
    const g = ctx.createLinearGradient(w / 2 - half - 160, 0, w / 2 + half + 160, 0);
    const edge = 160 / (2 * half + 320);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(edge, 'rgba(0,0,0,0.88)');
    g.addColorStop(1 - edge, 'rgba(0,0,0,0.88)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < 50) return; // the drift is slow; 20 fps is plenty
    last = now;
    offset += (SPEED * Math.min(dt, 200)) / 1000;
    draw();
  }

  function run() {
    cancelAnimationFrame(raf);
    if (paused || document.hidden || reduced.matches || !enabled) {
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
    setEnabled(on) {
      enabled = on;
      run();
    },
  };
}
