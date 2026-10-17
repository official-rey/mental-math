import { defineTechnique } from '../define';
import { numberLine, text } from '../svg';
import type { Level, Levels, Problem, Rng } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'add-up';

/** The round stopping point: the next multiple of the largest power of ten that stays ≤ a. */
function stopPoint(a: number, b: number): number {
  for (let k = String(a).length - 1; k >= 1; k--) {
    const unit = 10 ** k;
    const s = Math.ceil((b + 1) / unit) * unit;
    if (s <= a) return s;
  }
  return a;
}

function make(a: number, b: number, level: Level): Problem {
  const stop = stopPoint(a, b);
  // The technique: the difference is the sum of the two hops.
  const answer = (stop - b) + (a - stop);
  return { technique: ID, level, text: `${fmt(a)} − ${fmt(b)}`, answer: String(answer), data: { a, b } };
}

const levels = {
  1: { label: '2-digit, with a borrow', bounds: { a: [21, 99], b: [12, 98] } },
  2: { label: '3-digit, with borrows', bounds: { a: [201, 999], b: [101, 998] } },
  3: { label: '4-digit across a thousand', bounds: { a: [2001, 9999], b: [1001, 9998] } },
} as const satisfies Levels;

/** True when column subtraction of a − b would need a borrow somewhere. */
function hasBorrow(a: number, b: number): boolean {
  for (; b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    if (a % 10 < b % 10) return true;
  }
  return false;
}

/** a − b with b on the far side of a round number of size `unit`, borrowing in column subtraction. */
function pair(rng: Rng, lo: number, hi: number, gap: number, unit: number, bMin: number): [number, number] {
  for (;;) {
    const a = nonRound(rng, lo, hi);
    const b = a - rng.int(12, gap);
    if (b < bMin || b % 10 === 0) continue;
    if (Math.floor(a / unit) > Math.floor(b / unit) && hasBorrow(a, b)) return [a, b];
  }
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Subtracting by adding up',
    category: 'addsub',
    tier: 'Core',
    order: 40,
    idea: 'Find a difference as the distance up from the smaller number, through a round stop.',
  },
  card: {
    prose: [
      'Start at the number being subtracted and count up to a round number, then on to the target.',
      'The difference is the sum of the hops, and no column ever needs a borrow.',
      'It pays off when the two numbers sit on either side of a round number.',
    ],
    example: make(625, 386, 2),
    graphic: () =>
      numberLine({
        // Schematic spacing so the short first hop stays readable.
        from: 0,
        to: 100,
        height: 150,
        marks: [
          { at: 0, label: '386' },
          { at: 22, label: '400' },
          { at: 100, label: '625' },
        ],
        hops: [
          { from: 0, to: 22, label: '+14' },
          { from: 22, to: 100, label: '+225' },
        ],
        label: 'Number line: from 386 up 14 to 400, then up 225 to 625; the difference is 239',
      }).replace('</svg>', text(170, 136, '14 + 225 = 239', 't t-accent t-b') + '</svg>'),
    caption: 'From 386, hop 14 to 400 and 225 to 625: the gap is 14 + 225 = 239.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      for (;;) {
        const a = nonRound(rng, 21, 99);
        const b = nonRound(rng, 12, a - 1);
        if (a % 10 < b % 10) return make(a, b, level);
      }
    }
    const [a, b] = level === 2 ? pair(rng, 201, 999, 600, 100, 101) : pair(rng, 2001, 9999, 2500, 1000, 1001);
    return make(a, b, level);
  },
  steps(p) {
    const { a, b } = p.data;
    const stop = stopPoint(a, b);
    const h1 = stop - b, h2 = a - stop;
    return [
      { op: '', expr: `${fmt(a)} − ${fmt(b)}` },
      { op: '→', expr: `${fmt(b)} + ${fmt(h1)} = ${fmt(stop)}`, note: `up to ${fmt(stop)}` },
      { op: '→', expr: `${fmt(stop)} + ${fmt(h2)} = ${fmt(a)}`, note: `up to ${fmt(a)}` },
      { expr: `${fmt(h1)} + ${fmt(h2)}`, note: 'add the hops' },
      { expr: fmt(h1 + h2) },
    ];
  },
});
