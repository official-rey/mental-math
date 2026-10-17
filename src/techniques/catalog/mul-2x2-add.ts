import { defineTechnique } from '../define';
import { areaModel } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-2x2-add';

function make(a: number, b: number, level: Level): Problem {
  const tens = b - (b % 10), ones = b % 10;
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * tens + a * ones), data: { a, b } };
}

/** How a × T is found for a round T: one digit product, then a shift. */
function tensNote(a: number, t: number): string {
  if (t === 10 || t === 100) return `${a} × ${t}`;
  return `${a}×${t / 10} = ${fmt((a * t) / 10)}, ×10`;
}

const levels = {
  1: { label: '2-digit × 2-digit ending 1–3', bounds: { a: [12, 99], b: [11, 93] } },
  2: { label: '2-digit × 2-digit', bounds: { a: [12, 99], b: [12, 99] } },
  3: { label: '2-digit × 2-digit, both 51–99', bounds: { a: [51, 99], b: [51, 99] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '2-digit × 2-digit, addition method',
    category: 'mul',
    tier: 'Core',
    order: 100,
    idea: 'Split one factor into tens and ones: two 2-digit × 1-digit products, then one sum.',
  },
  card: {
    prose: [
      'Break the second factor into its tens and its ones.',
      'Multiply by the tens (a digit product, then a zero), then by the ones.',
      'Add the two partial products.',
    ],
    example: make(47, 53, 2),
    graphic: () =>
      areaModel({
        cols: [50, 3],
        rows: [47],
        cell: (_r, c) => fmt([2350, 141][c]),
        accent: [[0, 0]],
        height: 150,
        label: 'Area model: 47 by 53 split into 47 by 50 and 47 by 3',
      }),
    caption: 'The 47 × 53 rectangle is a 47 × 50 block, 2,350, plus a 47 × 3 strip, 141.',
  },
  levels,
  generate(rng, level) {
    const { a } = levels[level].bounds;
    if (level === 1) return make(nonRound(rng, a[0], a[1]), rng.int(1, 9) * 10 + rng.int(1, 3), level);
    const { b } = levels[level].bounds;
    return make(nonRound(rng, a[0], a[1]), nonRound(rng, b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const tens = b - (b % 10), ones = b % 10;
    const big = a * tens, small = a * ones;
    return [
      { op: '', expr: `${a} × ${b}` },
      { expr: `${a} × ${tens} + ${a} × ${ones}`, note: `${b} = ${tens} + ${ones}` },
      { expr: `${fmt(big)} + ${a} × ${ones}`, note: tensNote(a, tens) },
      { expr: `${fmt(big)} + ${fmt(small)}`, note: `${a} × ${ones}` },
      { expr: fmt(big + small) },
    ];
  },
});
