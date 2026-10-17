import { PALETTE } from '../theme';
import { drawTimesTable, timesTableName } from './figures';

const N = 200;
const SPEED = 0.05; // change in k per second
const COLORS = { ink: PALETTE.ink, accent: PALETTE.accent, rule: PALETTE.rule };

/**
 * Framed plate with the modular times table: chords from i to k·i (mod 200) on a circle,
 * with k drifting slowly so the cardioid turns into a nephroid and onward.
 */
export function heroPlate(): { el: HTMLElement; destroy(): void } {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('figcaption');
  const el = document.createElement('figure');
  el.className = 'plate';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Modular times table: points on a circle joined to their multiples');
  el.append(canvas, caption);

  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let k = reduced ? 2 : 1.6 + Math.random() * 1.2;
  let size = 0, dpr = 1, raf = 0, last = 0, lastCaption = '';

  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawTimesTable(ctx, { cx: size / 2, cy: size / 2, r: size * 0.44, n: N, k, colors: COLORS, weight: size > 260 ? 1 : 0.85 });
    const name = timesTableName(k);
    const text = `i ↦ ${k.toFixed(2)}·i  (mod ${N})${name ? `  ·  ${name}` : ''}`;
    if (text !== lastCaption) caption.textContent = lastCaption = text;
  }

  function fit() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = Math.max(120, Math.round(canvas.clientWidth));
    canvas.width = canvas.height = size * dpr;
    paint();
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(100, now - last);
    if (dt < 33) return;
    last = now;
    k += (SPEED * dt) / 1000;
    // Linger near whole numbers, where the named curves appear.
    const frac = k - Math.floor(k);
    if (frac < 0.02 || frac > 0.98) k += (SPEED * dt) / 1000 / -1.6;
    if (k > 12) k = 1.6;
    paint();
  }

  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  if (!reduced) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return {
    el,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}
