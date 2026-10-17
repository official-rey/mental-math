/**
 * Background: faint graph paper drifting slowly on one fixed canvas. The grid fades out
 * behind the content column so text always sits on clean paper. On wide screens the empty
 * side margins carry slowly scrolling columns of worked results from the app's own drills.
 * Static under reduced motion.
 */
import { techniques } from '../techniques/registry';
import { betterTechnique } from '../techniques/route';
import type { Level } from '../techniques/types';
import { fmt, makeRng } from '../techniques/util';
import { FONTS, PALETTE } from '../theme';

const CELL = 26;
const MAJOR = 5;
const SPEED = 5; // px per second, diagonally
const COLUMN = 720;
/** Margin columns appear only when each side has at least this much room. */
const MIN_MARGIN = 190;
const LINE_GAP = 40;
const SCROLL = 9; // px per second, upward

/** "47 × 6" and "282": problems with plain arithmetic text from the technique generators. */
function workedLines(count: number, seed: number): [string, string][] {
  const rng = makeRng(seed);
  const out: [string, string][] = [];
  for (let guard = 0; out.length < count && guard < count * 20; guard++) {
    const t = rng.pick(techniques);
    const p = t.generate(rng, rng.pick([1, 2] as Level[]));
    if (/[a-zA-Z]/.test(p.text.replace(/% of /, '').replace(/ mod /, '')) || p.tolerance !== undefined) continue;
    if (p.text.length > 16 || betterTechnique(p)) continue;
    out.push([p.text, fmt(p.answer)]);
  }
  return out;
}

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
  let raf = 0, last = 0, offset = 0, scroll = 0;
  const left = workedLines(48, 7);
  const right = workedLines(48, 13);

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
    grid(CELL, PALETTE.rule, 0.3, 1);
    grid(CELL * MAJOR, PALETTE.rule, 0.6, 1);
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
    const margin = (w - COLUMN) / 2;
    if (margin >= MIN_MARGIN) {
      column(left, margin / 2, scroll);
      column(right, w - margin / 2, scroll + LINE_GAP / 2);
    }
  }

  /** One centred column of worked results scrolling upward, fading out near the edges. */
  function column(lines: [string, string][], cx: number, shift: number) {
    const span = lines.length * LINE_GAP;
    const o = shift % span;
    ctx.font = `14px ${FONTS.mono}`;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length * 2; i++) {
      const y = i * LINE_GAP - o;
      if (y < -LINE_GAP || y > h + LINE_GAP) continue;
      const edge = Math.min(1, Math.max(0, Math.min(y, h - y) / 140));
      const [q, a] = lines[i % lines.length];
      const qText = `${q} = `;
      const qw = ctx.measureText(qText).width;
      const aw = ctx.measureText(a).width;
      const x0 = cx - (qw + aw) / 2;
      ctx.textAlign = 'left';
      ctx.globalAlpha = 0.32 * edge;
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText(qText, x0, y);
      ctx.globalAlpha = 0.6 * edge;
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText(a, x0 + qw, y);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < 50) return; // the drift is slow; 20 fps is plenty
    last = now;
    offset += (SPEED * Math.min(dt, 200)) / 1000;
    scroll += (SCROLL * Math.min(dt, 200)) / 1000;
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
  // Redraw once the mono font has loaded so the margin columns use it.
  document.fonts?.ready.then(draw);

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
