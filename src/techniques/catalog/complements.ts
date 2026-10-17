import { defineTechnique } from '../define';
import { numberLine } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'complements';

function make(base: number, n: number, level: Level): Problem {
  return { technique: ID, level, text: `${fmt(base)} − ${fmt(n)}`, answer: String(base - n), data: { base, n } };
}

const levels = {
  1: { label: '100 − 2-digit', bounds: { base: [100, 100], n: [11, 99] } },
  2: { label: '1,000 − 3-digit', bounds: { base: [1000, 1000], n: [101, 999] } },
  3: { label: '10,000 − 4-digit', bounds: { base: [10000, 10000], n: [1001, 9999] } },
} as const satisfies Levels;

const PLACE = ['ones', 'tens', 'hundreds', 'thousands'];

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Complements to 100 and 1,000',
    category: 'addsub',
    tier: 'Foundation',
    order: 20,
    idea: 'Every digit pairs to 9, except the last, which pairs to 10.',
  },
  card: {
    prose: [
      'The complement is the distance up to the round number.',
      'Read the digits left to right: each one pairs with its partner to make 9, and the last one makes 10.',
      'Subtracting from a power of ten never needs a borrow this way.',
    ],
    example: make(1000, 372, 2),
    graphic: () =>
      numberLine({
        from: 0,
        to: 1000,
        marks: [{ at: 0, label: '0' }, { at: 372, label: '372' }, { at: 1000, label: '1,000', accent: true }],
        hops: [
          { from: 0, to: 372, label: '372', accent: false },
          { from: 372, to: 1000, label: '628' },
        ],
        label: 'Number line from 0 to 1000: 372 plus its complement 628 reaches 1000',
      }),
    caption: '372 and 628 together fill the line to 1,000: 3+6 = 9, 7+2 = 9, 2+8 = 10.',
  },
  levels,
  generate(rng, level) {
    const { base, n } = levels[level].bounds;
    return make(base[0], nonRound(rng, n[0], n[1]), level);
  },
  steps(p) {
    const { base, n } = p.data;
    const ds = digits(n);
    const width = String(base).length - 1;
    const padded = Array(width - ds.length).fill(0).concat(ds);
    const steps: Step[] = [{ op: '', expr: `${fmt(base)} − ${fmt(n)}` }];
    padded.forEach((d, i) => {
      const last = i === padded.length - 1;
      const target = last ? 10 : 9;
      steps.push({
        op: '→',
        expr: `${target} − ${d} = ${target - d}`,
        note: `${PLACE[padded.length - 1 - i]}: pair to ${target}`,
      });
    });
    steps.push({ expr: fmt(base - n) });
    return steps;
  },
});
