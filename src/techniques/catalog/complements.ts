import { defineTechnique } from '../define';
import { pieces } from '../svg';
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
    idea: 'Write each digit’s partner to 9, left to right; for the last digit, write its partner to 10.',
  },
  card: {
    prose: [
      'Go through the number left to right. For each digit, write what it needs to make 9.',
      'For the last digit, write what it needs to make 10 instead.',
      'Read the written digits together as the answer; drop any zeros at the front.',
    ],
    example: make(1000, 372, 2),
    graphic: () =>
      pieces({
        input: '1,000 − 372',
        ops: [
          { text: '9 − 3', out: '6' },
          { text: '9 − 7', out: '2' },
          { text: '10 − 2', out: '8' },
        ],
        answer: [
          { text: '6', from: 0 },
          { text: '2', from: 1 },
          { text: '8', from: 2 },
        ],
        label: '1,000 minus 372: 3 needs 6 to make 9, 7 needs 2 to make 9, 2 needs 8 to make 10, so 628',
      }),
    caption: 'Each digit’s partner to 9, the last one’s partner to 10, written in its place.',
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
    const padded: number[] = Array(width - ds.length).fill(0).concat(ds);
    const steps: Step[] = [{ op: '', expr: `${fmt(base)} − ${fmt(n)}` }];
    const outs: number[] = [];
    padded.forEach((d, i) => {
      const last = i === padded.length - 1;
      const target = last ? 10 : 9;
      outs.push(target - d);
      steps.push({ op: '', expr: `${target} − ${d} = ${target - d}`, note: `${PLACE[padded.length - 1 - i]}: up to ${target}` });
    });
    const lead = outs.findIndex((d) => d !== 0);
    const tail = lead === 0 ? '' : lead === 1 ? ', drop front 0' : ', drop front 0s';
    steps.push({ expr: fmt(base - n), note: `write ${outs.join('')}${tail}` });
    return steps;
  },
});
