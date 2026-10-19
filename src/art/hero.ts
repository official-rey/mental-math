import { PALETTE } from '../theme';
import { drawHarmonograph, drawPascal, drawPhyllotaxis, drawTimesTable, drawUlam, HARMONOGRAPHS, timesTableName } from './figures';
import { ICONS } from '../ui/icons';

const COLORS = { ink: PALETTE.ink, accent: PALETTE.accent, rule: PALETTE.rule };
const PIECE_MS = 24000;
const FADE_MS = 700;

/** One animated drawing. `draw` paints the state at `t` seconds and returns its caption. */
interface Piece {
  draw(ctx: CanvasRenderingContext2D, size: number, t: number): string;
  /** Seconds after which the drawing no longer changes, so it need not be repainted. */
  still?: number;
}

const ease = (x: number) => 1 - (1 - Math.min(1, x)) ** 3;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

const PIECES: (() => Piece)[] = [
  // Modular times table: the cardioid family.
  () => {
    const k0 = rand(1.8, 4.5);
    return {
      draw(ctx, s, t) {
        const k = k0 + t * 0.045;
        drawTimesTable(ctx, { cx: s / 2, cy: s / 2, r: s * 0.44, n: 200, k, colors: COLORS, weight: s > 260 ? 1 : 0.85 });
        const name = timesTableName(k);
        return `i ↦ ${k.toFixed(2)}·i  (mod 200)${name ? `  ·  ${name}` : ''}`;
      },
    };
  },
  // Golden-angle seed head.
  () => {
    const spin = Math.random() < 0.5 ? 1 : -1;
    return {
      draw(ctx, s, t) {
        ctx.save();
        ctx.translate(s / 2, s / 2);
        ctx.rotate((spin * t) / 40);
        drawPhyllotaxis(ctx, { cx: 0, cy: 0, r: s * 0.44, count: 700, progress: 0.05 + 0.95 * ease(t / 14), colors: COLORS });
        ctx.restore();
        return 'seeds at 137.5° steps, radius √n';
      },
    };
  },
  // Harmonograph.
  () => {
    const h = HARMONOGRAPHS[Math.floor(Math.random() * HARMONOGRAPHS.length)];
    return {
      still: 18,
      draw(ctx, s, t) {
        drawHarmonograph(ctx, { cx: s / 2, cy: s / 2, size: s * 0.44, h, progress: ease(t / 18), color: PALETTE.ink, alpha: 0.55, width: 0.7 });
        return `damped pendulums, ${h.f[0]} : ${h.f[1]}`;
      },
    };
  },
  // Ulam prime spiral.
  () => ({
    still: 16,
    draw(ctx, s, t) {
      drawUlam(ctx, { cx: s / 2, cy: s / 2, size: s * 0.92, side: 101, progress: ease(t / 16), colors: COLORS });
      return 'primes on a spiral, 1 to 10,201';
    },
  }),
  // Pascal's triangle mod p.
  () => {
    const p = [2, 3, 5][Math.floor(Math.random() * 3)];
    return {
      still: 12,
      draw(ctx, s, t) {
        drawPascal(ctx, { cx: s / 2, top: s * 0.08, size: s * 0.92, rows: 64, p, progress: ease(t / 12), colors: COLORS });
        return `Pascal's triangle mod ${p}`;
      },
    };
  },
];

/**
 * Framed plate that shows one drawing at a time, picked at random, and moves on to another
 * every ~24 s (or on tap). It only animates while on screen, and stops repainting a drawing
 * once it is finished. Static under reduced motion.
 */
export function heroPlate(): { el: HTMLElement; destroy(): void } {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('span');
  const shuffle = document.createElement('button');
  shuffle.type = 'button';
  shuffle.className = 'plate-shuffle';
  shuffle.setAttribute('aria-label', 'Show another drawing');
  shuffle.innerHTML = ICONS.shuffle;
  const figcaption = document.createElement('figcaption');
  figcaption.append(caption, shuffle);
  const el = document.createElement('figure');
  el.className = 'plate';
  el.append(canvas, figcaption);

  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let order = shuffled();
  let index = 0;
  let piece = order[0]();
  let started = performance.now();
  let size = 0, dpr = 1, raf = 0, lastPaint = 0, lastCaption = '';
  /** The finished drawing is on the canvas; only the fade can still change. */
  let settled = false;
  let visible = false, hiddenAt = started;

  function shuffled() {
    const a = PIECES.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function next() {
    index++;
    if (index >= order.length) {
      const last = order[order.length - 1];
      order = shuffled();
      if (order[0] === last) order.push(order.shift()!);
      index = 0;
    }
    piece = order[index]();
    started = performance.now();
    settled = false;
    paint(started);
  }

  function paint(now: number) {
    const ms = reduced ? 60000 : now - started;
    const t = ms / 1000;
    // Cross-fade between pieces on the element, since each drawing sets its own alphas.
    canvas.style.opacity = String(reduced ? 1 : Math.min(1, ms / FADE_MS, Math.max(0, (PIECE_MS - ms) / FADE_MS)));
    if (settled || !size) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const text = piece.draw(ctx, size, t);
    if (text !== lastCaption) caption.textContent = lastCaption = text;
    settled = reduced || (piece.still !== undefined && t >= piece.still);
  }

  function fit() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = Math.max(120, Math.round(canvas.clientWidth));
    canvas.width = canvas.height = size * dpr;
    settled = false;
    paint(performance.now());
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (now - started >= PIECE_MS) return next();
    // Slow drawings gain nothing from more than ~60 paints a second, even on faster screens.
    if (now - lastPaint < 15) return;
    lastPaint = now;
    paint(now);
  }

  /** Run only while the plate is on screen; the clock stops while it is away. */
  const io = new IntersectionObserver(([entry]) => {
    const now = performance.now();
    if (entry.isIntersecting === visible) return;
    visible = entry.isIntersecting;
    if (visible) {
      started += now - hiddenAt;
      if (!reduced) raf = requestAnimationFrame(frame);
    } else {
      hiddenAt = now;
      cancelAnimationFrame(raf);
    }
  });

  shuffle.addEventListener('click', () => next());
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  io.observe(el);

  return {
    el,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}
