import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'exact-sqrt';

/** Last digit of a square → the units digits its root can end in. */
const UNITS: Record<number, number[]> = { 1: [1, 9], 4: [2, 8], 5: [5], 6: [4, 6], 9: [3, 7] };

function make(r: number, level: Level): Problem {
  const N = r * r;
  return { technique: ID, level, text: `√${fmt(N)}`, answer: String(r), data: { r, N }, hint: 'perfect square' };
}

const levels = {
  1: { label: 'roots 11–30', bounds: { r: [11, 30], N: [121, 900] } },
  2: { label: 'roots 31–60', bounds: { r: [31, 60], N: [961, 3600] } },
  3: { label: 'roots 61–99', bounds: { r: [61, 99], N: [3721, 9801] } },
  4: { label: 'roots 101–199', bounds: { r: [101, 199], N: [10201, 39601] } },
  5: { label: 'roots 201–499', bounds: { r: [201, 499], N: [40401, 249001] } },
  6: { label: 'roots 501–999', bounds: { r: [501, 999], N: [251001, 998001] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Square roots of perfect squares',
    category: 'pow',
    tier: 'Core',
    order: 80,
    idea: 'The front gives the first digits, the last digit gives two choices, and one square ending in 5 decides.',
  },
  card: {
    prose: [
      'Cover the last two digits. The largest square that fits under what is left gives the first digits.',
      'The last digit leaves two choices for the units: 1 or 9, 2 or 8, 3 or 7, 4 or 6. A 5 means 5.',
      'Square the number ending in 5 between the two. Above it? Take the larger one.',
    ],
    example: make(73, 3),
    graphic: () =>
      pieces({
        input: '√5,329',
        ops: [
          { text: '53: 7² = 49', out: '7' },
          { text: 'ends in 9', out: '3 or 7' },
        ],
        answer: [
          { text: '7', from: 0 },
          { text: '3', from: 1 },
        ],
        result: '73, as 5,329 < 75²',
        label: 'Square root of 5,329: 53 holds 7 squared, so it starts with 7; it ends in 9, so 3 or 7; 5,329 is below 75 squared, so 73',
      }),
    caption: 'Front for the tens, last digit for the units, 75² to choose.',
  },
  levels,
  generate(rng, level) {
    const [lo, hi] = levels[level].bounds.r;
    return make(nonRound(rng, lo, hi), level);
  },
  steps(p) {
    const { r, N } = p.data;
    const front = Math.floor(N / 100);
    const t = Math.floor(r / 10);
    const units = UNITS[N % 10];
    const s: Step[] = [
      { op: '', expr: `√${fmt(N)}` },
      { op: '', expr: fmt(front), note: 'cover the last two digits' },
      { op: '', expr: `${t}² = ${fmt(t * t)}`, note: `largest square up to ${fmt(front)}` },
    ];
    if (t >= 10) s.push({ op: '', expr: `${t + 1}² = ${fmt((t + 1) ** 2)}`, note: `too big, so it starts ${t}` });
    if (units.length === 1) {
      s.push({ expr: String(r), note: `ends in ${N % 10}, so the root ends in ${units[0]}` });
      return s;
    }
    const [a, b] = units.map((u) => 10 * t + u);
    const mid = 10 * t + 5;
    s.push({ op: '', expr: `${a} or ${b}`, note: `ends in ${N % 10}: ${units[0]} or ${units[1]}` });
    s.push({ op: '', expr: `${mid}² = ${fmt(mid * mid)}`, note: `${t} × ${t + 1}, then 25` });
    s.push(
      N > mid * mid
        ? { op: '', expr: `${fmt(N)} > ${fmt(mid * mid)}`, note: 'above it: the larger one' }
        : { op: '', expr: `${fmt(N)} < ${fmt(mid * mid)}`, note: 'below it: the smaller one' },
    );
    s.push({ expr: String(r) });
    return s;
  },
  reference: (p) => Math.sqrt(p.data.N),
});
