import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-near-50';

/** n = base ± d with base 50 or 500. */
function parts(n: number) {
  const base = n < 100 ? 50 : 500;
  const up = n > base ? 1 : 0;
  const d = Math.abs(n - base);
  const unit = base * 2;
  const head = base / 2 + (up ? d : -d);
  return { base, up, d, unit, head };
}

function make(n: number, level: Level): Problem {
  const { up, d, unit, head } = parts(n);
  return { technique: ID, level, text: `${n}²`, answer: String(unit * head + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: '41² to 59²', bounds: { n: [41, 59], d: [1, 9] } },
  2: { label: '35² to 65²', bounds: { n: [35, 65], d: [1, 15] } },
  3: { label: '480² to 520²', bounds: { n: [480, 520], d: [1, 20] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squares near 50',
    category: 'mul',
    tier: 'Core',
    order: 60,
    idea: 'First digits: 25 plus the distance from 50. Last two digits: the distance squared.',
  },
  card: {
    prose: [
      'Find how far the number is from 50.',
      'Add that distance to 25 (subtract it if you are below 50). These are the first digits.',
      'Square the distance and write it as the last two digits. Near 500, start from 250 and use three digits.',
    ],
    example: make(53, 1),
    graphic: () =>
      pieces({
        input: '53²',
        ops: [
          { text: '53 − 50', out: '3' },
          { text: '25 + 3', out: '28' },
          { text: '3²', out: '09' },
        ],
        answer: [
          { text: '28', from: 1 },
          { text: '09', from: 2 },
        ],
        result: '2,809',
        label: 'Squaring 53: distance 3 from 50, 25 plus 3 gives 28, 3 squared gives 09, so 2,809',
      }),
    caption: 'Get the distance, then build each half of the answer from it.',
  },
  levels,
  generate(rng, level) {
    const up = rng.chance(0.5);
    let d: number, base: number;
    if (level === 1) [d, base] = [rng.int(1, 9), 50];
    else if (level === 2) [d, base] = [nonRound(rng, 4, 15), 50];
    else [d, base] = [nonRound(rng, 1, 19), 500];
    return make(up ? base + d : base - d, level);
  },
  steps(p) {
    const { n } = p.data;
    const { base, up, d, unit, head } = parts(n);
    const width = unit === 100 ? 2 : 3;
    const sq = d * d;
    const steps: Step[] = [
      { op: '', expr: `${n}²` },
      { op: '', expr: up ? `${n} − ${base} = ${d}` : `${base} − ${n} = ${d}`, note: `distance from ${base}` },
      { op: '', expr: `${base / 2} ${up ? '+' : '−'} ${d} = ${head}`, note: up ? 'first digits: add it' : 'first digits: below, so subtract' },
    ];
    if (sq < 10 ** width) {
      steps.push({ op: '', expr: `${d}² = ${String(sq).padStart(width, '0')}`, note: `last ${width} digits` });
      steps.push({ expr: fmt(unit * head + sq), note: `${head} then ${String(sq).padStart(width, '0')}` });
    } else {
      const keep = String(sq % 10 ** width).padStart(width, '0');
      const carry = Math.floor(sq / 10 ** width);
      steps.push({ op: '', expr: `${d}² = ${sq}`, note: `write ${keep}, carry ${carry}` });
      steps.push({ op: '', expr: `${head} + ${carry} = ${head + carry}`, note: 'add the carry' });
      steps.push({ expr: fmt(unit * head + sq), note: `${head + carry} then ${keep}` });
    }
    return steps;
  },
});
