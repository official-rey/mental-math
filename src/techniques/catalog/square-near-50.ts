import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-near-50';

/** n = base ± d with base 50, 500 or 5,000. */
function parts(n: number) {
  const base = n < 100 ? 50 : n < 1000 ? 500 : 5000;
  const up = n > base ? 1 : 0;
  const d = Math.abs(n - base);
  const unit = base * 2;
  const head = base / 2 + (up ? d : -d);
  return { base, up, d, unit, head };
}

function make(n: number, level: Level): Problem {
  const { up, d, unit, head } = parts(n);
  return { technique: ID, level, text: `${fmt(n)}²`, answer: String(unit * head + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: '46² to 54²', bounds: { n: [46, 54], d: [1, 4] } },
  2: { label: '41² to 59²', bounds: { n: [41, 59], d: [1, 9] } },
  3: { label: '35² to 65²', bounds: { n: [35, 65], d: [1, 15] } },
  4: { label: '480² to 520²', bounds: { n: [480, 520], d: [1, 20] } },
  5: { label: '460² to 540²', bounds: { n: [461, 539], d: [21, 39] } },
  6: { label: '4,900² to 5,100²', bounds: { n: [4901, 5099], d: [21, 99] } },
} as const satisfies Levels;

/** Steps for d²; a 2-digit d goes up and down to a multiple of 10, then adds the small square back. */
function distSquare(d: number, note: string): Step[] {
  const r = d % 10;
  if (d < 20 || r === 0) return [{ op: '', expr: `${d}² = ${fmt(d * d)}`, note }];
  const up = r >= 5;
  const e = up ? 10 - r : r;
  const round = up ? d + e : d - e;
  const other = up ? d - e : d + e;
  const prod = round * other;
  return [
    { op: '', expr: `${round} × ${other} = ${fmt(prod)}`, note: `${d}²: ${up ? 'up' : 'down'} ${e}, ${up ? 'down' : 'up'} ${e}` },
    { op: '', expr: `${fmt(prod)} + ${e * e} = ${fmt(d * d)}`, note: `plus ${e}², ${note}` },
  ];
}

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
    example: make(53, 2),
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
    if (level === 1) [d, base] = [rng.int(1, 4), 50];
    else if (level === 2) [d, base] = [rng.int(1, 9), 50];
    else if (level === 3) [d, base] = [nonRound(rng, 4, 15), 50];
    else if (level === 4) [d, base] = [nonRound(rng, 1, 19), 500];
    else if (level === 5) [d, base] = [rng.chance(0.5) ? nonRound(rng, 32, 39) : nonRound(rng, 21, 31), 500];
    else [d, base] = [nonRound(rng, 21, 99), 5000];
    return make(up ? base + d : base - d, level);
  },
  steps(p) {
    const { n } = p.data;
    const { base, up, d, unit, head } = parts(n);
    const width = String(unit).length - 1;
    const sq = d * d;
    const steps: Step[] = [
      { op: '', expr: `${fmt(n)}²` },
      { op: '', expr: up ? `${fmt(n)} − ${fmt(base)} = ${d}` : `${fmt(base)} − ${fmt(n)} = ${d}`, note: `distance from ${fmt(base)}` },
      { op: '', expr: `${fmt(base / 2)} ${up ? '+' : '−'} ${d} = ${fmt(head)}`, note: up ? 'first digits: add it' : 'first digits: below, so subtract' },
    ];
    if (sq < 10 ** width) {
      const padded = String(sq).padStart(width, '0');
      if (d < 20 || d % 10 === 0) {
        steps.push({ op: '', expr: `${d}² = ${padded}`, note: `last ${width} digits` });
      } else {
        steps.push(...distSquare(d, `the last ${width} digits are ${padded}`));
      }
      steps.push({ expr: fmt(unit * head + sq), note: `${fmt(head)} then ${padded}` });
    } else {
      const keep = String(sq % 10 ** width).padStart(width, '0');
      const carry = Math.floor(sq / 10 ** width);
      if (d < 20 || d % 10 === 0) {
        steps.push({ op: '', expr: `${d}² = ${fmt(sq)}`, note: `write ${keep}, carry ${carry}` });
      } else {
        steps.push(...distSquare(d, `write ${keep}, carry ${carry}`));
      }
      steps.push({ op: '', expr: `${fmt(head)} + ${carry} = ${fmt(head + carry)}`, note: 'add the carry' });
      steps.push({ expr: fmt(unit * head + sq), note: `${fmt(head + carry)} then ${keep}` });
    }
    return steps;
  },
});
