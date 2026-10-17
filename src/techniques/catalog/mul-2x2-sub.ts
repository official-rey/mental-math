import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-2x2-sub';

function make(a: number, b: number, level: Level): Problem {
  const up = Math.ceil(b / 10) * 10, d = up - b;
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * up - a * d), data: { a, b, up, d } };
}

/** How a × T is found for a round T: a one-digit product, then zeros on the end. */
function tensNote(a: number, t: number): string {
  if (t === 10) return 'add a 0';
  if (t === 100) return 'add two 0s';
  if (t % 100 === 0) return `${a}×${t / 100} = ${fmt((a * t) / 100)}, add two 0s`;
  return `${a}×${t / 10} = ${fmt((a * t) / 10)}, add a 0`;
}

const levels = {
  1: { label: 'small 2-digit × 19, 29, 39 or 49', bounds: { a: [12, 39], b: [19, 49], d: [1, 1] } },
  2: { label: '2-digit × 2-digit ending 9', bounds: { a: [12, 99], b: [19, 99], d: [1, 1] } },
  3: { label: '2-digit × 2-digit ending 8–9', bounds: { a: [12, 99], b: [18, 99], d: [1, 2] } },
  4: { label: '51–99 × 2-digit ending 7–9', bounds: { a: [51, 99], b: [17, 99], d: [1, 3] } },
  5: { label: '61–99 × 56–99 ending 6–9', bounds: { a: [61, 99], b: [56, 99], d: [1, 4] } },
  6: { label: '2-digit × 3-digit just under a hundred', bounds: { a: [51, 99], b: [196, 899], up: [200, 900], d: [1, 4] } },
} as const satisfies Levels;

function pick(rng: Rng, level: Level): number {
  if (level === 1) return rng.int(1, 4) * 10 + 9;
  if (level === 5) return rng.int(5, 9) * 10 + rng.int(6, 9);
  if (level === 6) return rng.int(2, 9) * 100 - rng.int(1, 4);
  const ending = level === 2 ? 9 : level === 3 ? rng.int(8, 9) : rng.int(7, 9);
  return rng.int(1, 9) * 10 + ending;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: '2-digit × 2-digit, subtraction method',
    category: 'mul',
    tier: 'Core',
    order: 110,
    idea: 'Round the number ending in 7, 8 or 9 up to the next ten, multiply, then subtract the extra copies.',
  },
  card: {
    prose: [
      'Round the number ending in 7, 8 or 9 up to the next ten: 39 becomes 40.',
      'Multiply by the round number: 47 × 40 = 1,880.',
      'Take away one copy of 47 for each step you rounded up: 1,880 − 47 = 1,833.',
    ],
    example: make(47, 39, 2),
    graphic: () =>
      chain({
        start: '47 × 39',
        moves: [
          { op: '47 × 40', value: '1,880' },
          { op: '− 47', value: '1,833' },
        ],
        label: '47 times 39: round 39 up to 40, 47 times 40 is 1,880, take away one 47 to get 1,833',
      }),
    caption: 'Multiply by 40 instead, then take one 47 back off.',
  },
  levels,
  generate(rng, level) {
    const { a } = levels[level].bounds;
    for (;;) {
      const x = nonRound(rng, a[0], a[1]), y = pick(rng, level);
      if (level > 1 && level < 5) return make(x, y, level);
      if (x !== 25 && x !== y) return make(x, y, level);
    }
  },
  steps(p) {
    const { a, b, up, d } = p.data;
    const big = a * up, small = a * d;
    const steps: Step[] = [
      { op: '', expr: `${a} × ${b}` },
      { op: '', expr: `${b} + ${d} = ${up}`, note: 'round up' },
      { op: '', expr: `${a} × ${up} = ${fmt(big)}`, note: tensNote(a, up) },
    ];
    if (d === 1) {
      steps.push({ op: '', expr: `${fmt(big)} − ${a} = ${fmt(big - small)}`, note: `take away one ${a}` });
    } else {
      steps.push({ op: '', expr: `${a} × ${d} = ${small}`, note: `${d} copies of ${a}` });
      steps.push({ op: '', expr: `${fmt(big)} − ${small} = ${fmt(big - small)}`, note: 'take them away' });
    }
    steps.push({ expr: fmt(big - small), note: 'answer' });
    return steps;
  },
});
