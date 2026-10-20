import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng } from '../types';
import { fmt } from '../util';

const ID = 'same-tens';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * b), data: { a, b, t: a - (a % 10) } };
}

const levels = {
  1: { label: 'teens, small ones digits', bounds: { a: [12, 18], b: [12, 18], t: [10, 10] } },
  2: { label: 'teens × teens', bounds: { a: [12, 19], b: [12, 19], t: [10, 10] } },
  3: { label: '20s and 30s', bounds: { a: [21, 39], b: [21, 39], t: [20, 30] } },
  4: { label: 'same tens, 40s to 80s', bounds: { a: [41, 89], b: [41, 89], t: [40, 80] } },
  5: { label: 'same tens past 100', bounds: { a: [101, 199], b: [101, 199], t: [100, 190] } },
  6: { label: 'same tens, 3-digit', bounds: { a: [201, 999], b: [201, 999], t: [200, 990] } },
} as const satisfies Levels;

/** Numbers that another trick handles better: × 11, × 25, × 50, or both near 100. */
const avoid = (a: number, b: number) => [a, b].some((x) => x === 11 || x === 25 || x === 50) || (a >= 90 && a <= 110 && b >= 90 && b <= 110);

/** Two different numbers sharing their tens, with ones digits from 1 to 9. */
function pair(rng: Rng, level: Level): [number, number] {
  for (;;) {
    const [lo, hi] = levels[level].bounds.t;
    const t = 10 * rng.int(lo / 10, hi / 10);
    const maxOnes = level === 1 ? 6 : 9;
    const u = rng.int(1, maxOnes), v = rng.int(1, maxOnes);
    const a = t + u, b = t + v;
    if (u === v || avoid(a, b) || (level === 1 && u + v > 10)) continue;
    return [a, b];
  }
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Same tens: 13 × 17',
    category: 'mul',
    tier: 'Foundation',
    order: 70,
    featured: true,
    idea: 'Add one number to the other’s ones digit, times the tens, plus the two ones digits multiplied.',
  },
  card: {
    prose: [
      'Both numbers share their tens: 13 and 17 are both 10-something.',
      'Add the second number’s ones digit to the first: 13 + 7 = 20. Multiply by the tens: 20 × 10 = 200.',
      'Multiply the two ones digits, 3 × 7 = 21, and add: 221.',
    ],
    example: make(13, 17, 2),
    graphic: () =>
      chain({
        start: '13 × 17',
        moves: [
          { op: '13 + 7', value: '20' },
          { op: '× 10', value: '200' },
          { op: '+ 3 × 7', value: '221' },
        ],
        label: '13 times 17: 13 plus 7 is 20, times 10 is 200, plus 3 times 7, 21, makes 221',
      }),
    caption: 'One number plus the other’s ones, times the tens, plus ones × ones.',
  },
  levels,
  generate(rng, level) {
    const [a, b] = pair(rng, level);
    return make(a, b, level);
  },
  steps(p) {
    const { a, b, t } = p.data;
    const u = a - t, v = b - t;
    const sum = a + v, big = sum * t, small = u * v;
    const timesNote = t === 10 ? 'add a 0' : t % 100 === 0 ? `${sum} × ${t / 100}, add 00` : `${sum} × ${t / 10}, add a 0`;
    return [
      { op: '', expr: p.text },
      { op: '', expr: `${a} + ${v} = ${sum}`, note: `${a} plus the ones of ${b}` },
      { op: '', expr: `${sum} × ${t} = ${fmt(big)}`, note: `× the tens: ${timesNote}` },
      { op: '', expr: `${u} × ${v} = ${small}`, note: 'ones × ones' },
      { op: '', expr: `${fmt(big)} + ${small} = ${fmt(big + small)}`, note: 'add them' },
      { expr: fmt(a * b) },
    ];
  },
});
