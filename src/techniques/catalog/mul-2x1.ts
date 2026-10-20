import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-2x1';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit × 2–4, no carry', bounds: { a: [12, 49], b: [2, 4] } },
  2: { label: '2-digit × 2–5', bounds: { a: [12, 49], b: [2, 5] } },
  3: { label: '2-digit × 1-digit', bounds: { a: [12, 99], b: [3, 9] } },
  4: { label: 'large 2-digit × 6–9', bounds: { a: [51, 99], b: [6, 9] } },
  5: { label: 'large 2-digit × 7–9, sum crosses a hundred', bounds: { a: [51, 99], b: [7, 9] } },
  6: { label: '2-digit × 7–9, ones digit 6–9', bounds: { a: [16, 99], b: [7, 9] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '2-digit × 1-digit, left to right',
    category: 'mul',
    tier: 'Foundation',
    order: 10,
    featured: true,
    idea: 'Multiply the tens first, then the ones, and add the small product on.',
  },
  card: {
    prose: [
      'Multiply the tens part by the single digit: 40 × 6 = 240.',
      'Multiply the ones digit by it: 7 × 6 = 42.',
      'Add the small product onto the big one: 240 + 42 = 282.',
    ],
    example: make(47, 6, 3),
    graphic: () =>
      chain({
        start: '47 × 6',
        moves: [
          { op: '40 × 6', value: '240' },
          { op: '+ 7 × 6', value: '282' },
        ],
        label: '47 times 6: first 40 times 6 is 240, then add 7 times 6, 42, to reach 282',
      }),
    caption: 'Do the tens first, then add the ones product to it.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    if (level === 1) {
      for (;;) {
        const x = nonRound(rng, a[0], a[1]), y = rng.int(b[0], b[1]);
        if ((x % 10) * y <= 9) return make(x, y, level);
      }
    }
    if (level === 5) {
      for (;;) {
        const x = nonRound(rng, a[0], a[1]), y = rng.int(b[0], b[1]);
        if ((((x - (x % 10)) * y) % 100) + (x % 10) * y >= 100) return make(x, y, level);
      }
    }
    if (level === 6) return make(rng.int(1, 9) * 10 + rng.int(6, 9), rng.int(b[0], b[1]), level);
    return make(nonRound(rng, a[0], a[1]), rng.int(b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const tens = a - (a % 10), ones = a % 10;
    const big = tens * b, small = ones * b;
    return [
      { op: '', expr: `${a} × ${b}` },
      { op: '', expr: `${tens} × ${b} = ${fmt(big)}`, note: 'tens first' },
      { op: '', expr: `${ones} × ${b} = ${small}`, note: 'then the ones' },
      { op: '', expr: `${fmt(big)} + ${small} = ${fmt(big + small)}`, note: 'add them' },
      { expr: fmt(a * b), note: 'answer' },
    ];
  },
});
