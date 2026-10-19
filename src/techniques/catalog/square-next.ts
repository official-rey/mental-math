import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt } from '../util';

const ID = 'square-next';

/** n² from the square of its neighbour m, one away. */
function make(n: number, m: number, level: Level): Problem {
  return { technique: ID, level, text: `${n}²`, answer: String(n * n), data: { n, m } };
}

/** How the neighbour's square is found: a round number, or one ending in 5. */
function knownSquare(m: number): string {
  if (m === 100) return '100 × 100';
  if (m % 10 === 5) {
    const k = (m - 5) / 10;
    return `${k} × ${k + 1}, then 25`;
  }
  if (m % 100 === 0) return `${m / 100}² = ${(m / 100) ** 2}, then 0000`;
  const k = m / 10;
  return `${k}² = ${fmt(k * k)}, then 00`;
}

const levels = {
  1: { label: '2-digit, one above a ten', bounds: { n: [11, 91], m: [10, 90] } },
  2: { label: '2-digit, one below a ten', bounds: { n: [19, 99], m: [20, 100] } },
  3: { label: '2-digit, next to one ending in 5', bounds: { n: [14, 96], m: [15, 95] } },
  4: { label: '3-digit, next to a ten', bounds: { n: [109, 301], m: [110, 300] } },
  5: { label: '3-digit, next to a multiple of 50', bounds: { n: [149, 951], m: [150, 950] } },
  6: { label: '3-digit, next to one ending in 5', bounds: { n: [104, 996], m: [105, 995] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squaring from a neighbour',
    category: 'pow',
    tier: 'Core',
    order: 75,
    idea: 'Start from the square next door, then add both numbers (or take them away).',
  },
  card: {
    prose: [
      'Find a neighbour one away whose square you know: a round number, or one ending in 5.',
      'Add the number and its neighbour together.',
      'One above the neighbour: add that to its square. One below: take it away.',
    ],
    example: make(61, 60, 1),
    graphic: () =>
      chain({
        start: '61²',
        moves: [
          { op: 'square of 60', value: '3,600' },
          { op: '+ 60 + 61', value: '3,721' },
        ],
        label: '61 squared: 60 squared is 3,600; add 60 and 61 to get 3,721',
      }),
    caption: 'Square the round neighbour, then add both numbers.',
  },
  levels,
  generate(rng, level) {
    const side = rng.chance(0.5) ? 1 : -1;
    switch (level) {
      case 1: {
        const m = 10 * rng.int(1, 9);
        return make(m + 1, m, level);
      }
      case 2: {
        const m = 10 * rng.int(2, 10);
        return make(m - 1, m, level);
      }
      case 3: {
        const m = 10 * rng.int(1, 9) + 5;
        return make(m + side, m, level);
      }
      case 4: {
        const m = 10 * rng.int(11, 30);
        return make(m + side, m, level);
      }
      case 5: {
        const m = 50 * rng.int(3, 19);
        return make(m + side, m, level);
      }
      default: {
        const m = 10 * rng.int(10, 99) + 5;
        return make(m + side, m, level);
      }
    }
  },
  steps(p) {
    const { n, m } = p.data;
    const sq = m * m;
    const up = n > m;
    return [
      { op: '', expr: `${n}²` },
      { op: '', expr: `${m}² = ${fmt(sq)}`, note: knownSquare(m) },
      { op: '', expr: `${m} + ${n} = ${m + n}`, note: `${n} is one ${up ? 'above' : 'below'} ${m}: add both` },
      up ? { op: '', expr: `${fmt(sq)} + ${m + n}`, note: 'one above: add' } : { op: '', expr: `${fmt(sq)} − ${m + n}`, note: 'one below: take away' },
      { expr: fmt(n * n) },
    ];
  },
  reference: (p) => p.data.n ** 2,
});
