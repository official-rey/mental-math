import { defineTechnique } from '../define';
import { numberLine } from '../svg';
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
    idea: 'Add the largest place first, then each smaller place, keeping one running total.',
  },
  card: {
    prose: [
      'Split the second number by place value and add the parts from the largest down.',
      'You hold one running total at a time, and it already starts with the leading digits of the answer.',
      'A carry just updates that total; nothing is written down and fixed later.',
    ],
    example: make(476, 358, 3),
    graphic: () =>
      numberLine({
        // Schematic spacing: hops shrink in order but are not to scale, so the small one stays visible.
        from: 0,
        to: 100,
        marks: [
          { at: 0, label: '476' },
          { at: 58, label: '776' },
          { at: 86, label: '826' },
          { at: 100, label: '834', accent: true },
        ],
        hops: [
          { from: 0, to: 58, label: '+300' },
          { from: 58, to: 86, label: '+50' },
          { from: 86, to: 100, label: '+8' },
        ],
        label: 'Number line: 476 plus 300 is 776, plus 50 is 826, plus 8 is 834',
      }),
    caption: 'Start at 476 and hop 300, then 50, then 8, landing on 834.',
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
    let total = a, left = b;
    for (const part of parts(b)) {
      total += part;
      left -= part;
      steps.push({ expr: left ? `${fmt(total)} + ${fmt(left)}` : fmt(total), note: `add ${fmt(part)}` });
    }
    return steps;
  },
});
