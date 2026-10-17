import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-2x2-add';

function make(a: number, b: number, level: Level): Problem {
  const tens = b - (b % 10), ones = b % 10;
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * tens + a * ones), data: { a, b } };
}

/** How a × T is found for a round T: a one-digit product, then zeros on the end. */
function tensNote(a: number, t: number): string {
  if (t === 10) return 'add a 0';
  if (t === 100) return 'add two 0s';
  return `${a}×${t / 10} = ${fmt((a * t) / 10)}, add a 0`;
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
    idea: 'Multiply by the tens of the second number, then by its ones, and add the two.',
  },
  card: {
    prose: [
      'Multiply by the tens: 47 × 5 = 235, add a 0 to get 2,350.',
      'Multiply by the ones: 47 × 3 = 141.',
      'Add the two results: 2,350 + 141 = 2,491.',
    ],
    example: make(47, 53, 2),
    graphic: () =>
      chain({
        start: '47 × 53',
        moves: [
          { op: '47 × 50', value: '2,350' },
          { op: '+ 47 × 3', value: '2,491' },
        ],
        label: '47 times 53: 47 times 50 is 2,350, then add 47 times 3, 141, to reach 2,491',
      }),
    caption: 'Multiply by 50 first, then add on 47 × 3.',
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
      { op: '', expr: `${a} × ${tens} = ${fmt(big)}`, note: tensNote(a, tens) },
      { op: '', expr: `${a} × ${ones} = ${fmt(small)}`, note: 'times the ones' },
      { op: '', expr: `${fmt(big)} + ${fmt(small)} = ${fmt(big + small)}`, note: 'add them' },
      { expr: fmt(big + small), note: 'answer' },
    ];
  },
});
