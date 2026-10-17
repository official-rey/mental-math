import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'lr-addition';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${fmt(a)} + ${fmt(b)}`, answer: String(a + b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit + 2-digit', bounds: { a: [12, 99], b: [12, 99] } },
  2: { label: '3-digit + 2-digit', bounds: { a: [101, 999], b: [12, 99] } },
  3: { label: '3-digit + 3-digit', bounds: { a: [101, 999], b: [101, 999] } },
} as const satisfies Levels;

const PLACE = ['ones', 'tens', 'hundreds', 'thousands'];

/** Nonzero place parts of n, largest first: 358 → [300, 50, 8]. */
function parts(n: number): number[] {
  const ds = digits(n);
  return ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((x) => x > 0);
}

/** True when some column of a + b produces a carry. */
function hasCarry(a: number, b: number): boolean {
  for (; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    if ((a % 10) + (b % 10) >= 10) return true;
  }
  return false;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Left-to-right addition',
    category: 'addsub',
    tier: 'Foundation',
    order: 10,
    idea: 'Add the second number one place at a time, biggest place first, keeping one running total.',
  },
  card: {
    prose: [
      'Split the second number into its hundreds, tens and ones.',
      'Add the hundreds to the first number, then add the tens, then the ones.',
      'Hold only the new total after each add. The last total is the answer.',
    ],
    example: make(476, 358, 3),
    graphic: () =>
      chain({
        start: '476',
        moves: [
          { op: '+ 300', value: '776' },
          { op: '+ 50', value: '826' },
          { op: '+ 8', value: '834' },
        ],
        label: 'Start at 476: add 300 to get 776, add 50 to get 826, add 8 to get 834',
      }),
    caption: 'Start at 476 and add 300, then 50, then 8, one place at a time.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    for (;;) {
      const x = nonRound(rng, a[0], a[1]);
      const y = nonRound(rng, b[0], b[1]);
      if (hasCarry(x, y)) return make(x, y, level);
    }
  },
  steps(p) {
    const { a, b } = p.data;
    const steps: Step[] = [{ op: '', expr: `${fmt(a)} + ${fmt(b)}` }];
    let total = a;
    for (const part of parts(b)) {
      const next = total + part;
      steps.push({ op: '', expr: `${fmt(total)} + ${fmt(part)} = ${fmt(next)}`, note: `add the ${PLACE[String(part).length - 1]}` });
      total = next;
    }
    steps.push({ expr: fmt(total), note: 'the last total' });
    return steps;
  },
});
