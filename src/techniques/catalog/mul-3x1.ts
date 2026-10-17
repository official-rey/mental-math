import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'mul-3x1';

/** Nonzero place parts of a, largest first: 487 → [400, 80, 7]. */
function parts(a: number): number[] {
  const ds = digits(a);
  return ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((v) => v !== 0);
}

function make(a: number, b: number, level: Level): Problem {
  const sum = parts(a).reduce((acc, v) => acc + v * b, 0);
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(sum), data: { a, b } };
}

const levels = {
  1: { label: '3-digit × 2–5', bounds: { a: [101, 999], b: [2, 5] } },
  2: { label: '3-digit × 3–9', bounds: { a: [101, 999], b: [3, 9] } },
  3: { label: '3-digit (≥ 500) × 6–9', bounds: { a: [500, 999], b: [6, 9] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '3-digit × 1-digit, left to right',
    category: 'mul',
    tier: 'Foundation',
    order: 20,
    idea: 'Multiply the hundreds, then add on the tens product, then the ones product.',
  },
  card: {
    prose: [
      'Multiply the hundreds by the digit and hold the result: 400 × 6 = 2,400.',
      'Add the tens product onto it: 80 × 6 = 480, so 2,880.',
      'Add the ones product last: 7 × 6 = 42, so 2,922.',
    ],
    example: make(487, 6, 2),
    graphic: () =>
      chain({
        start: '487 × 6',
        moves: [
          { op: '400 × 6', value: '2,400' },
          { op: '+ 80 × 6', value: '2,880' },
          { op: '+ 7 × 6', value: '2,922' },
        ],
        label: '487 times 6: 400 times 6 is 2,400, add 80 times 6 to get 2,880, add 7 times 6 to get 2,922',
      }),
    caption: 'One running total: hundreds first, then add the tens, then the ones.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    if (level === 3) {
      const a3 = rng.int(5, 9) * 100 + rng.int(4, 9) * 10 + rng.int(4, 9);
      return make(a3, rng.int(b[0], b[1]), level);
    }
    return make(nonRound(rng, a[0], a[1]), rng.int(b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const ps = parts(a);
    const names = ['hundreds', 'tens', 'ones'];
    const name = (v: number) => names[3 - String(v).length] ?? 'ones';
    const steps: Step[] = [{ op: '', expr: `${a} × ${b}` }];
    let run = 0;
    ps.forEach((v, i) => {
      const prod = v * b;
      steps.push({ op: '', expr: `${v} × ${b} = ${fmt(prod)}`, note: i === 0 ? `${name(v)} first` : `${name(v)} product` });
      if (i > 0) steps.push({ op: '', expr: `${fmt(run)} + ${fmt(prod)} = ${fmt(run + prod)}`, note: 'add to the total' });
      run += prod;
    });
    steps.push({ expr: fmt(run), note: 'answer' });
    return steps;
  },
});
