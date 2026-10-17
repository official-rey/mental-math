import { defineTechnique } from '../define';
import { areaModel } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-2x1';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit × 2–5', bounds: { a: [12, 49], b: [2, 5] } },
  2: { label: '2-digit × 1-digit', bounds: { a: [12, 99], b: [3, 9] } },
  3: { label: 'large 2-digit × 6–9', bounds: { a: [51, 99], b: [6, 9] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '2-digit × 1-digit, left to right',
    category: 'mul',
    tier: 'Foundation',
    order: 10,
    idea: 'Multiply the tens, then add the ones product: big part first.',
  },
  card: {
    prose: [
      'Split the 2-digit number into tens and ones.',
      'Say the tens product out loud, then add the small product onto it.',
      'You produce digits in the order you speak them, so nothing is held backwards.',
    ],
    example: make(47, 6, 1),
    graphic: () =>
      areaModel({
        cols: [40, 7],
        rows: [6],
        accent: [[0, 0]],
        height: 150,
        label: 'Area model: 47 by 6 split into 40 by 6 and 7 by 6',
      }),
    caption: 'A 47 × 6 rectangle is a 40 × 6 piece plus a 7 × 6 piece.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    return make(nonRound(rng, a[0], a[1]), rng.int(b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const tens = a - (a % 10), ones = a % 10;
    return [
      { op: '', expr: `${a} × ${b}` },
      { expr: `${fmt(tens * b)} + ${ones * b}`, note: `${tens}×${b}, ${ones}×${b}` },
      { expr: fmt(a * b) },
    ];
  },
});
