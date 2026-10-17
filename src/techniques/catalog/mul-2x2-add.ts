import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound, scaled } from '../util';

const ID = 'mul-2x2-add';

function make(a: number, b: number, level: Level): Problem {
  const tens = b - (b % 10), ones = b % 10;
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * tens + a * ones), data: { a, b } };
}

/** A one-decimal number such as 7.6 (given as 76 tenths) times a 2-digit number. */
function makeDecimal(tenths: number, b: number, level: Level): Problem {
  const a = Number(scaled(tenths, 1));
  return { technique: ID, level, text: `${scaled(tenths, 1)} × ${b}`, answer: scaled(tenths * b, 1), data: { a, b, tenths } };
}

/** How a × T is found for a round T: a one-digit product, then zeros on the end. */
function tensNote(a: number, t: number): string {
  if (t === 10) return 'add a 0';
  if (t === 100) return 'add two 0s';
  return `${a}×${t / 10} = ${fmt((a * t) / 10)}, add a 0`;
}

const levels = {
  1: { label: 'small 2-digit × 12–32 ending 1–2', bounds: { a: [12, 49], b: [12, 32] } },
  2: { label: '2-digit × 2-digit ending 1–3', bounds: { a: [12, 99], b: [11, 93] } },
  3: { label: '2-digit × 2-digit', bounds: { a: [12, 99], b: [12, 99] } },
  4: { label: '2-digit × 2-digit, both 51–99', bounds: { a: [51, 99], b: [51, 99] } },
  5: { label: 'both 61–99, big ones digits', bounds: { a: [63, 99], b: [64, 97] } },
  6: { label: 'decimal x.y × 2-digit', bounds: { a: [5.1, 9.9], b: [63, 97], tenths: [51, 99] } },
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
    example: make(47, 53, 3),
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
    if (level === 1) {
      for (;;) {
        const x = nonRound(rng, a[0], a[1]), y = rng.int(1, 3) * 10 + rng.int(1, 2);
        if (x !== 25 && y !== 11) return make(x, y, level);
      }
    }
    if (level === 2) return make(nonRound(rng, a[0], a[1]), rng.int(1, 9) * 10 + rng.int(1, 3), level);
    if (level === 5) {
      for (;;) {
        const x = rng.int(6, 9) * 10 + rng.int(3, 9), y = rng.int(6, 9) * 10 + rng.int(4, 7);
        if (x !== y) return make(x, y, level);
      }
    }
    if (level === 6) return makeDecimal(nonRound(rng, 51, 99), rng.int(6, 9) * 10 + rng.int(3, 7), level);
    const { b } = levels[level].bounds;
    return make(nonRound(rng, a[0], a[1]), nonRound(rng, b[0], b[1]), level);
  },
  steps(p) {
    const { a, b, tenths } = p.data;
    if (tenths !== undefined) {
      const tens = b - (b % 10), ones = b % 10, A = scaled(tenths, 1);
      const big = scaled(tenths * tens, 1), small = scaled(tenths * ones, 1), total = scaled(tenths * b, 1);
      return [
        { op: '', expr: `${A} × ${b}` },
        { op: '', expr: `${A} × ${tens} = ${fmt(big)}`, note: `${A}×${tens / 10} = ${scaled(tenths * (tens / 10), 1)}, then × 10` },
        { op: '', expr: `${A} × ${ones} = ${fmt(small)}`, note: 'times the ones' },
        { op: '', expr: `${fmt(big)} + ${fmt(small)} = ${fmt(total)}`, note: 'add them' },
        { expr: fmt(total), note: 'answer' },
      ];
    }
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
