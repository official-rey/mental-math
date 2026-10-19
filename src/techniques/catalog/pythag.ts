import { defineTechnique } from '../define';
import { path, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt } from '../util';

const ID = 'pythag';

/** Primitive triples; the first five are the ones worth knowing by heart. */
const TRIPLES = [
  [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29],
  [12, 35, 37], [9, 40, 41], [28, 45, 53], [11, 60, 61], [33, 56, 65],
  [16, 63, 65], [48, 55, 73], [13, 84, 85], [36, 77, 85], [39, 80, 89], [65, 72, 97],
] as const;
const KNOWN = 5;

/** leg = 0: find the long side from both short ones; leg = 1: find short side b from a and c. */
function make(t: number, k: number, leg: 0 | 1, level: Level): Problem {
  const [a, b, c] = TRIPLES[t].map((x) => x * k);
  return {
    technique: ID,
    level,
    text: leg ? `√(${c}² − ${a}²)` : `√(${a}² + ${b}²)`,
    answer: String(leg ? b : c),
    data: { t, k, leg },
  };
}

const levels = {
  1: { label: '3-4-5 scaled, long side', bounds: { t: [0, 0], k: [1, 6], leg: [0, 0] } },
  2: { label: 'small triples scaled, long side', bounds: { t: [0, 2], k: [1, 4], leg: [0, 0] } },
  3: { label: 'small triples scaled, short side', bounds: { t: [0, 2], k: [1, 4], leg: [1, 1] } },
  4: { label: '7-24-25 and 20-21-29, either side', bounds: { t: [3, 4], k: [1, 3], leg: [0, 1] } },
  5: { label: 'larger triples, long side', bounds: { t: [5, 15], k: [1, 1], leg: [0, 0] } },
  6: { label: 'larger triples, either side, scaled', bounds: { t: [5, 15], k: [1, 2], leg: [0, 1] } },
} as const satisfies Levels;

/** 15 and 20: a 3-4-5 triangle five times over. */
function graphic(): string {
  const s = 7, x0 = 40, y0 = 176;
  const A: [number, number] = [x0, y0], B: [number, number] = [x0 + 20 * s, y0], C: [number, number] = [x0 + 20 * s, y0 - 15 * s];
  let b = path(`M${A[0]},${A[1]} L${B[0]},${B[1]} L${C[0]},${C[1]} Z`, 's-ink f-raised');
  b += path(`M${B[0] - 10},${B[1]} L${B[0] - 10},${B[1] - 10} L${B[0]},${B[1] - 10}`, 's-ink f-none');
  // The 3-4-5 triangle inside, one fifth of the size.
  b += path(`M${x0},${y0} L${x0 + 4 * s},${y0} L${x0 + 4 * s},${y0 - 3 * s} Z`, 's-accent f-soft');
  b += text(x0 + 2 * s, y0 + 12, '4', 't t-sm t-accent');
  b += text(x0 + 4 * s + 8, y0 - 1.5 * s, '3', 't t-sm t-accent t-start');
  b += text((A[0] + B[0]) / 2 + 20, y0 + 14, '20', 't');
  b += text(B[0] + 10, (B[1] + C[1]) / 2, '15', 't t-start');
  b += text((A[0] + C[0]) / 2 - 12, (A[1] + C[1]) / 2 - 12, '?', 't t-lg t-accent t-b');
  b += text(326, 40, '15, 20 = 5 × (3, 4)', 't t-sm t-end');
  b += text(326, 62, 'long side 5 × 5', 't t-sm t-end');
  b += text(326, 92, '= 25', 't t-lg t-accent t-b t-end');
  return svg(340, 196, b, 'A right triangle with sides 15 and 20 is the 3-4-5 triangle five times over, so its long side is 5 times 5, 25');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Right-triangle sides',
    category: 'trig',
    tier: 'Core',
    order: 10,
    idea: 'Take out a common factor, spot a triple you know, and scale back; otherwise square, add and take the root.',
  },
  card: {
    prose: [
      'Know a few right triangles by heart: 3-4-5, 5-12-13, 8-15-17, 7-24-25, 20-21-29.',
      'Divide out a common factor first: 15 and 20 are 5 × 3 and 5 × 4, so the long side is 5 × 5.',
      'No triple in sight? Square the two sides, add them (subtract for a short side), then take the square root.',
    ],
    example: make(0, 5, 0, 1),
    graphic,
    caption: '15 and 20 are a 3-4-5 triangle scaled by 5.',
  },
  levels,
  generate(rng, level) {
    const { t: [t0, t1], k: [k0, k1], leg: [l0, l1] } = levels[level].bounds;
    const t = rng.int(t0, t1);
    // Keep 3-4-5 from crowding out the others at level II and III.
    const k = level <= 3 && t > 0 ? rng.int(k0, Math.min(k1, 3)) : rng.int(k0, k1);
    return make(t, k, rng.int(l0, l1) as 0 | 1, level);
  },
  steps(p) {
    const { t, k, leg } = p.data;
    const [a, b, c] = TRIPLES[t];
    const s: Step[] = [{ op: '', expr: p.text }];
    const sides = leg ? [c, a] : [a, b];
    if (k > 1) s.push({ op: '', expr: sides.map((x) => `${k * x} = ${k} × ${x}`).join(', '), note: `common factor ${k}` });
    let base: number;
    if (t < KNOWN) {
      s.push({ op: '', expr: `${a}, ${b}, ${c}`, note: 'a triangle you know' });
      base = leg ? b : c;
    } else if (leg) {
      s.push({ op: '', expr: `${fmt(c * c)} − ${fmt(a * a)} = ${fmt(b * b)}`, note: `${c}² − ${a}²` });
      s.push({ op: '', expr: `√${fmt(b * b)} = ${b}`, note: 'a perfect square' });
      base = b;
    } else {
      s.push({ op: '', expr: `${fmt(a * a)} + ${fmt(b * b)} = ${fmt(c * c)}`, note: `${a}² + ${b}²` });
      s.push({ op: '', expr: `√${fmt(c * c)} = ${c}`, note: 'a perfect square' });
      base = c;
    }
    if (k > 1) s.push({ op: '', expr: `${k} × ${base} = ${k * base}`, note: 'scale back up' });
    s.push({ expr: String(k * base) });
    return s;
  },
  reference(p) {
    const [a, b, c] = TRIPLES[p.data.t].map((x) => x * p.data.k);
    return p.data.leg ? Math.sqrt(c * c - a * a) : Math.sqrt(a * a + b * b);
  },
});
