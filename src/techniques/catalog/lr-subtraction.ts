import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'lr-subtraction';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${fmt(a)} − ${fmt(b)}`, answer: String(a - b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit − 2-digit, no borrow', bounds: { a: [21, 99], b: [11, 88] } },
  2: { label: '2-digit − 2-digit', bounds: { a: [21, 99], b: [12, 98] } },
  3: { label: '3-digit − 2-digit', bounds: { a: [101, 999], b: [12, 99] } },
  4: { label: '3-digit − 3-digit', bounds: { a: [201, 999], b: [101, 998] } },
  5: { label: '4-digit − 3-digit, 2+ borrows', bounds: { a: [1001, 9999], b: [101, 999] } },
  6: { label: '4-digit − 4-digit, 2+ borrows', bounds: { a: [2001, 9999], b: [1001, 9998] } },
} as const satisfies Levels;

/** Fewest borrows each level asks for; level 1 asks for none at all. */
const MIN_BORROWS: Record<Level, number> = { 1: 0, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2 };

const PLACE = ['ones', 'tens', 'hundreds', 'thousands'];

/** Nonzero place parts of n, largest first: 375 → [300, 70, 5]. */
function parts(n: number): number[] {
  const ds = digits(n);
  return ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((x) => x > 0);
}

/** Number of borrows column subtraction of a − b (a > b) would need. */
function borrows(a: number, b: number): number {
  let n = 0;
  for (let c = 0; b > 0 || c > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    c = (a % 10) - c < b % 10 ? 1 : 0;
    n += c;
  }
  return n;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Left-to-right subtraction',
    category: 'addsub',
    tier: 'Foundation',
    order: 15,
    idea: 'Take away the second number one place at a time, biggest place first, from one running total.',
  },
  card: {
    prose: [
      'Split the number you take away into its hundreds, tens and ones.',
      'Take away the hundreds first, then the tens, then the ones.',
      'Hold only the new total after each step. The last total is the answer.',
    ],
    example: make(724, 358, 4),
    graphic: () =>
      chain({
        start: '724',
        moves: [
          { op: '− 300', value: '424' },
          { op: '− 50', value: '374' },
          { op: '− 8', value: '366' },
        ],
        label: 'Start at 724: take 300 to get 424, take 50 to get 374, take 8 to get 366',
      }),
    caption: 'Start at 724 and take away 300, then 50, then 8.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    for (;;) {
      const x = nonRound(rng, a[0], a[1]);
      const hi = Math.min(b[1], x - 1);
      if (hi < b[0] + 1) continue;
      const y = nonRound(rng, b[0], hi);
      const n = borrows(x, y);
      if (level === 1 ? n === 0 : n >= MIN_BORROWS[level]) return make(x, y, level);
    }
  },
  steps(p) {
    const { a, b } = p.data;
    const steps: Step[] = [{ op: '', expr: `${fmt(a)} − ${fmt(b)}` }];
    let total = a;
    for (const part of parts(b)) {
      const next = total - part;
      steps.push({ op: '', expr: `${fmt(total)} − ${fmt(part)} = ${fmt(next)}`, note: `take the ${PLACE[String(part).length - 1]}` });
      total = next;
    }
    steps.push({ expr: fmt(total), note: 'the last total' });
    return steps;
  },
});
