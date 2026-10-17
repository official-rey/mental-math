/** Parametric curves shared by the background, the score card and the GIF. */

export type Pt = [number, number];
/** A figure as unit-scale points (roughly within [-1, 1]²). */
export type Figure = () => Pt[];

const TAU = Math.PI * 2;

function sample(n: number, tMax: number, f: (t: number) => Pt): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push(f((i / n) * tMax));
  return pts;
}

export const rose = (p: number, q: number): Figure => () => {
  const k = p / q;
  return sample(1400, TAU * q, (t) => {
    const r = Math.cos(k * t);
    return [r * Math.cos(t), r * Math.sin(t)];
  });
};

export const lissajous = (a: number, b: number, delta: number): Figure => () =>
  sample(1200, TAU, (t) => [Math.sin(a * t + delta), Math.sin(b * t)]);

export const spiro = (R: number, r: number, d: number): Figure => () => {
  const g = gcd(R, r);
  const turns = r / g;
  const s = 1 / (R - r + d);
  return sample(2400, TAU * turns, (t) => [
    ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)) * s,
    ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)) * s,
  ]);
};

/** Golden spiral: grows by a factor of phi every quarter turn. */
export const golden: Figure = () => {
  const phi = (1 + Math.sqrt(5)) / 2;
  // Logarithmic spiral with growth factor phi per quarter turn, centered at the origin.
  const b = Math.log(phi) / (Math.PI / 2);
  const turns = 3.25;
  const scale = 1 / Math.exp(b * TAU * turns);
  return sample(1400, TAU * turns, (t) => {
    const r = Math.exp(b * t) * scale;
    return [r * Math.cos(t + 0.6), r * Math.sin(t + 0.6)];
  });
};

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export const FIGURES: Figure[] = [
  rose(5, 3),
  lissajous(3, 4, Math.PI / 2),
  spiro(7, 3, 2.2),
  golden,
  rose(7, 4),
  lissajous(5, 4, Math.PI / 3),
  spiro(9, 4, 3),
  rose(4, 1),
];

/** Stroke the first `progress` fraction of a figure centered at (cx, cy) with half-size `size`. */
export function strokeFigure(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  o: { cx: number; cy: number; size: number; rot?: number; progress?: number },
) {
  const n = Math.max(2, Math.floor(pts.length * (o.progress ?? 1)));
  const cos = Math.cos(o.rot ?? 0), sin = Math.sin(o.rot ?? 0);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const X = o.cx + (x * cos - y * sin) * o.size;
    const Y = o.cy + (x * sin + y * cos) * o.size;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.stroke();
}
