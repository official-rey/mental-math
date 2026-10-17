import { defineTechnique } from '../define';
import { numberLine } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'lr-subtraction';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${fmt(a)} − ${fmt(b)}`, answer: String(a - b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit − 2-digit', bounds: { a: [21, 99], b: [12, 98] } },
  2: { label: '3-digit − 2-digit', bounds: { a: [101, 999], b: [12, 99] } },
  3: { label: '3-digit − 3-digit', bounds: { a: [201, 999], b: [101, 998] } },
} as const satisfies Levels;

/** Nonzero place parts of n, largest first: 375 → [300, 70, 5]. */
function parts(n: number): number[] {
  const ds = digits(n);
  return ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((x) => x > 0);
}

/** True when column subtraction of a − b would need a borrow somewhere. */
function hasBorrow(a: number, b: number): boolean {
  for (; b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    if (a % 10 < b % 10) return true;
  }
  return false;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Left-to-right subtraction',
    category: 'addsub',
    tier: 'Foundation',
    order: 15,
    idea: 'Subtract the largest place first, then each smaller place, from one running total.',
  },
  card: {
    prose: [
      'Break the number being subtracted into place parts and take them away from the largest down.',
      'Every partial result is an ordinary number, so a borrow becomes crossing a ten on the way down.',
    ],
    example: make(92, 36, 1),
    graphic: () =>
      numberLine({
        from: 50,
        to: 96,
        marks: [
          { at: 56, label: '56', accent: true },
          { at: 62, label: '62' },
          { at: 92, label: '92' },
        ],
        hops: [
          { from: 92, to: 62, label: '−30' },
          { from: 62, to: 56, label: '−6' },
        ],
        label: 'Number line: from 92 back 30 to 62, then back 6 to 56',
      }),
    caption: 'From 92, hop back 30 to 62, then 6 more to 56.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    for (;;) {
      const x = nonRound(rng, a[0], a[1]);
      const hi = Math.min(b[1], x - 1);
      if (hi < b[0] + 1) continue;
      const y = nonRound(rng, b[0], hi);
      if (hasBorrow(x, y)) return make(x, y, level);
    }
  },
  steps(p) {
    const { a, b } = p.data;
    const steps: Step[] = [{ op: '', expr: `${fmt(a)} − ${fmt(b)}` }];
    let total = a, left = b;
    for (const part of parts(b)) {
      total -= part;
      left -= part;
      steps.push({ expr: left ? `${fmt(total)} − ${fmt(left)}` : fmt(total), note: `take ${fmt(part)}` });
    }
    return steps;
  },
});
