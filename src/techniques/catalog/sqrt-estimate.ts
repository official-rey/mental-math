import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'sqrt-estimate';

interface Plan {
  a: number;
  d: number;
  /** |d| ÷ 2a in hundredths. */
  qh: number;
  /** a ± q in hundredths. */
  sh: number;
  /** Answer in tenths. */
  at: number;
}

function plan(N: number): Plan {
  const a = Math.round(Math.sqrt(N));
  const d = N - a * a;
  const qh = Math.round((Math.abs(d) * 100) / (2 * a));
  const sh = a * 100 + Math.sign(d) * qh;
  return { a, d, qh, sh, at: Math.round(sh / 10) };
}

function make(N: number, level: Level): Problem {
  const { a, at } = plan(N);
  return {
    technique: ID,
    level,
    text: `√${fmt(N)}`,
    answer: scaled(at, 1),
    data: { N, a },
    tolerance: 0.1,
    hint: '1 decimal place',
  };
}

const levels = {
  1: { label: '√ of 10–99, just above a square', bounds: { N: [10, 99], a: [3, 9] } },
  2: { label: '√ of 10–99', bounds: { N: [10, 99], a: [3, 10] } },
  3: { label: '√ of 100–999', bounds: { N: [101, 999], a: [10, 32] } },
  4: { label: '√ of 1,000–9,999', bounds: { N: [1000, 9999], a: [32, 100] } },
  5: { label: '√ of 5-digit, root a multiple of 10', bounds: { N: [10000, 99999], a: [100, 310] } },
  6: { label: '√ of 5–6 digits, root ending in 5 or 0', bounds: { N: [10000, 999999], a: [105, 995] } },
} as const satisfies Levels;

const RANGE: Record<1 | 2 | 3 | 4, [number, number]> = { 1: [10, 99], 2: [10, 99], 3: [101, 999], 4: [1000, 9999] };

/** A number within a of a², not the square itself, so a stays the nearest root. */
function near(rng: Rng, a: number): number {
  for (;;) {
    const d = rng.int(-a, a);
    if (d !== 0) return a * a + d;
  }
}

/** Large round roots are squared by their leading digits: 120² from 12 × 12, 235² from 23 × 24. */
function squareNote(a: number): string {
  if (a < 100) return 'nearest square';
  const k = Math.floor(a / 10);
  return a % 10 === 0 ? `nearest square: ${k} × ${k}, then 00` : `nearest square: ${k} × ${k + 1}, then 25`;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Estimating square roots',
    category: 'pow',
    tier: 'Core',
    order: 90,
    idea: 'Start from the nearest square root, then add the leftover divided by twice that root.',
  },
  card: {
    prose: [
      'Find the perfect square closest to the number and take its root.',
      'Subtract to get the leftover, then divide it by twice the root.',
      'Add that to the root; if the number was below the square, subtract instead.',
    ],
    example: make(53, 2),
    graphic: () =>
      chain({
        start: '53',
        moves: [
          { op: '− 49 (7 × 7)', value: '4' },
          { op: '÷ 14 (twice 7)', value: '0.29' },
          { op: '+ 7', value: '7.29' },
        ],
        label: 'Square root of 53: take off 49, which is 7 squared, leaving 4; divide by 14, twice 7, to get 0.29; add 7 to get 7.29',
      }),
    caption: 'Take off the nearest square, divide the leftover by twice its root, add the root back.',
  },
  levels,
  generate(rng, level) {
    for (;;) {
      let N: number;
      if (level === 5) N = near(rng, 10 * rng.int(10, 31));
      else if (level === 6) {
        const a = rng.chance(0.6) ? 10 * rng.int(10, 99) + 5 : 10 * rng.int(32, 99);
        N = near(rng, a);
      } else {
        const [lo, hi] = RANGE[level];
        N = rng.int(lo, hi);
      }
      const { a, d, at } = plan(N);
      if (a * a === N) continue;
      const [lo, hi] = levels[level].bounds.N;
      if (N < lo || N > hi) continue;
      // Level 1: only a little above a square, so the leftover is added and stays small.
      if (level === 1 && (d < 0 || d > a)) continue;
      // The linear estimate plus rounding must stay within 0.1 of the true root.
      if (Math.abs(at / 10 - Math.sqrt(N)) > 0.1 - 1e-9) continue;
      return make(N, level);
    }
  },
  steps(p) {
    const N = p.data.N;
    const { a, d, qh, sh, at } = plan(N);
    const sq = a * a;
    const q = scaled(qh, 2);
    const s: Step[] = [
      { op: '', expr: `√${fmt(N)}` },
      { op: '', expr: `${a} × ${a} = ${fmt(sq)}`, note: squareNote(a) },
      d > 0
        ? { op: '', expr: `${fmt(N)} − ${fmt(sq)} = ${d}`, note: 'leftover' }
        : { op: '', expr: `${fmt(sq)} − ${fmt(N)} = ${-d}`, note: `${-d} short of the square` },
      { op: '', expr: `${a} × 2 = ${2 * a}`, note: 'twice the root' },
      { op: '', expr: `${Math.abs(d)} ÷ ${2 * a}`, note: 'leftover ÷ twice the root' },
      { op: '≈', expr: q, note: 'round to 2 decimals' },
      d > 0
        ? { op: '', expr: `${a} + ${q} = ${scaled(sh, 2)}`, note: 'add to the root' }
        : { op: '', expr: `${a} − ${q} = ${scaled(sh, 2)}`, note: 'short, so subtract' },
    ];
    s.push(sh === at * 10 ? { expr: scaled(at, 1), note: 'already 1 decimal' } : { op: '≈', expr: scaled(at, 1), note: 'to 1 decimal place' });
    return s;
  },
  reference: (p) => Math.sqrt(p.data.N),
});
