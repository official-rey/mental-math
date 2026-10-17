import { defineTechnique } from '../define';
import { areaModel } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'mul-3x1';

/** Nonzero place parts of a, largest first: 487 → [400, 80, 7]. */
function parts(a: number): number[] {
  const ds = digits(a);
  return ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((v) => v !== 0);
}

function make(a: number, b: number, level: Level): Problem {
  const sum = parts(a).reduce((acc, v) => acc + v * b, 0);
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(sum), data: { a, b } };
}

const levels = {
  1: { label: '3-digit × 2–5', bounds: { a: [101, 999], b: [2, 5] } },
  2: { label: '3-digit × 3–9', bounds: { a: [101, 999], b: [3, 9] } },
  3: { label: '3-digit (≥ 500) × 6–9', bounds: { a: [500, 999], b: [6, 9] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '3-digit × 1-digit, left to right',
    category: 'mul',
    tier: 'Foundation',
    order: 20,
    idea: 'Hundreds, tens, ones: three partial products folded into one running total.',
  },
  card: {
    prose: [
      'Multiply the hundreds first and hold that number.',
      'Add the tens product onto it, then the ones product.',
      'Only one running total is ever kept in mind.',
    ],
    example: make(487, 6, 2),
    graphic: () =>
      areaModel({
        cols: [400, 80, 7],
        rows: [6],
        cell: (_r, c) => fmt([2400, 480, 42][c]),
        accent: [[0, 0]],
        height: 150,
        label: 'Area model: 487 by 6 split into 400 by 6, 80 by 6 and 7 by 6',
      }),
    caption: 'The 487 × 6 rectangle is three columns: 2,400, 480 and 42, added from the left.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    if (level === 3) {
      const a3 = rng.int(5, 9) * 100 + rng.int(4, 9) * 10 + rng.int(4, 9);
      return make(a3, rng.int(b[0], b[1]), level);
    }
    return make(nonRound(rng, a[0], a[1]), rng.int(b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const ps = parts(a);
    const prods = ps.map((v) => v * b);
    const steps: Step[] = [
      { op: '', expr: `${a} × ${b}` },
      { expr: prods.map(fmt).join(' + '), note: ps.map((v) => `${v}×${b}`).join(', ') },
    ];
    let run = prods[0];
    for (let i = 1; i < prods.length - 1; i++) {
      const prev = run;
      run += prods[i];
      steps.push({
        expr: [run, ...prods.slice(i + 1)].map(fmt).join(' + '),
        note: `${fmt(prev)} + ${fmt(prods[i])}`,
      });
    }
    steps.push({ expr: fmt(prods.reduce((s, v) => s + v, 0)) });
    return steps;
  },
});
