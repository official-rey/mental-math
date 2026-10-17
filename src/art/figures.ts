/**
 * Math art shared by the hero plate, the page margins, the score card and the GIF.
 * Every function draws onto a 2D context with explicit colors so canvas exports match the app.
 */

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export interface Ink {
  ink: string;
  accent: string;
  rule: string;
}

/**
 * Modular times table: n points on a circle, a chord from point i to point k·i (mod n).
 * Integer k gives the cardioid (2), nephroid (3) and their cousins; fractional k morphs between them.
 * The envelope appears where chords crowd together.
 */
export function drawTimesTable(
  ctx: CanvasRenderingContext2D,
  o: { cx: number; cy: number; r: number; n: number; k: number; colors: Ink; weight?: number; alpha?: number },
) {
  const { cx, cy, r, n, k } = o;
  const w = o.weight ?? 1;
  const a = o.alpha ?? 1;
  const P = (i: number): [number, number] => {
    const t = (i / n) * TAU - Math.PI / 2;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  };
  ctx.save();
  ctx.lineCap = 'round';
  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = o.colors.rule;
  ctx.lineWidth = 1.2 * w;
  ctx.globalAlpha = a;
  ctx.stroke();

  // Chords are colored by where they start, sweeping from accent to ink around the circle.
  const BUCKETS = 8;
  const paths = Array.from({ length: BUCKETS }, () => new Path2D());
  for (let i = 0; i < n; i++) {
    const [x1, y1] = P(i);
    const [x2, y2] = P((k * i) % n);
    const path = paths[Math.floor((i / n) * BUCKETS)];
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
  }
  ctx.lineWidth = 0.75 * w;
  paths.forEach((path, b) => {
    const t = Math.abs(b / (BUCKETS - 1) - 0.5) * 2; // accent at both ends, ink in the middle
    ctx.strokeStyle = mix(o.colors.ink, o.colors.accent, t);
    ctx.globalAlpha = (0.22 + 0.2 * t) * a;
    ctx.stroke(path);
  });

  // Points
  ctx.globalAlpha = 0.55 * a;
  ctx.fillStyle = o.colors.ink;
  const step = n > 150 ? Math.ceil(n / 120) : 1;
  for (let i = 0; i < n; i += step) {
    const [x, y] = P(i);
    ctx.beginPath();
    ctx.arc(x, y, 1.1 * w, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Blend two #rrggbb colors; t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** Seeds placed at the golden angle: Fibonacci spirals appear (every 13th and 21st seed in accent). */
export function drawPhyllotaxis(
  ctx: CanvasRenderingContext2D,
  o: { cx: number; cy: number; r: number; count: number; progress?: number; colors: Ink; alpha?: number },
) {
  const shown = Math.floor(o.count * (o.progress ?? 1));
  const c = o.r / Math.sqrt(o.count);
  ctx.save();
  for (let i = 1; i < shown; i++) {
    const rad = c * Math.sqrt(i);
    const t = i * GOLDEN_ANGLE;
    const x = o.cx + rad * Math.cos(t), y = o.cy + rad * Math.sin(t);
    const hot = i % 21 === 0 || i % 13 === 0;
    ctx.beginPath();
    ctx.arc(x, y, (hot ? 1.9 : 1.4) * (0.55 + (0.45 * rad) / o.r), 0, TAU);
    ctx.fillStyle = hot ? o.colors.accent : o.colors.rule;
    ctx.globalAlpha = (hot ? 0.7 : 1) * (o.alpha ?? 1);
    ctx.fill();
  }
  ctx.restore();
}

export interface Harmonograph {
  f: [number, number, number, number];
  p: [number, number, number, number];
  d: number;
}

export const HARMONOGRAPHS: Harmonograph[] = [
  { f: [2, 3, 3.01, 2], p: [0, Math.PI / 2, Math.PI / 4, 0], d: 0.012 },
  { f: [3, 2.002, 2, 3], p: [Math.PI / 6, 0, Math.PI / 2, Math.PI], d: 0.01 },
  { f: [4, 3, 3.003, 4], p: [0, Math.PI / 3, Math.PI / 2, Math.PI / 5], d: 0.009 },
];

/** Two damped pendulums per axis; the decay spirals the trace inward. */
export function drawHarmonograph(
  ctx: CanvasRenderingContext2D,
  o: { cx: number; cy: number; size: number; h: Harmonograph; progress?: number; color: string; alpha?: number; width?: number },
) {
  const { f, p, d } = o.h;
  const T = 120;
  const steps = Math.floor(3200 * (o.progress ?? 1));
  ctx.save();
  ctx.beginPath();
  for (let s = 0; s <= steps; s++) {
    const t = (s / 3200) * T;
    const e = Math.exp(-d * t);
    const x = 0.5 * e * (Math.sin(f[0] * t + p[0]) + Math.sin(f[1] * t + p[1]));
    const y = 0.5 * e * (Math.sin(f[2] * t + p[2]) + Math.sin(f[3] * t + p[3]));
    const X = o.cx + x * o.size, Y = o.cy + y * o.size;
    if (s === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.strokeStyle = o.color;
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.lineWidth = o.width ?? 0.8;
  ctx.stroke();
  ctx.restore();
}

/** Named shapes of the times table, for captions. */
export function timesTableName(k: number): string {
  const r = Math.round(k);
  if (Math.abs(k - r) > 0.04) return '';
  return ({ 2: 'cardioid', 3: 'nephroid', 4: '3 cusps', 5: '4 cusps' } as Record<number, string>)[r] ?? `${r - 1} cusps`;
}
