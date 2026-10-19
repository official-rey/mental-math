import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt } from '../util';

const ID = 'binomial';

/** C(n, k) by the running product: × n ÷ 1, × (n − 1) ÷ 2, … Every partial result is whole. */
function run(n: number, m: number): number[] {
  const out: number[] = [];
  let cur = 1;
  for (let j = 1; j <= m; j++) out.push((cur = (cur * (n - j + 1)) / j));
  return out;
}

function make(n: number, k: number, level: Level): Problem {
  const m = Math.min(k, n - k);
  const vals = run(n, m);
  return { technique: ID, level, text: `C(${n}, ${k})`, answer: String(vals[vals.length - 1]), data: { n, k, m }, hint: `choose ${k} from ${n}` };
}

const levels = {
  1: { label: 'choose 2 from up to 8', bounds: { n: [4, 8], m: [2, 2] } },
  2: { label: 'choose 2 or 3 from up to 12', bounds: { n: [5, 12], m: [2, 3] } },
  3: { label: 'up to 16, either way round', bounds: { n: [8, 16], m: [2, 4] } },
  4: { label: '10 to 20, choose 3 to 5', bounds: { n: [10, 20], m: [3, 5] } },
  5: { label: '15 to 25, choose 4 to 6', bounds: { n: [15, 25], m: [4, 6] } },
  6: { label: '20 to 30, choose 5 to 7', bounds: { n: [20, 30], m: [5, 7] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Choosing: C(n, k)',
    category: 'higher',
    tier: 'Core',
    order: 10,
    idea: 'Multiply and divide in turn, × n ÷ 1, × (n − 1) ÷ 2, …, and every step is a whole number.',
  },
  card: {
    prose: [
      'Choosing 7 of 10 is the same as leaving out 3, so use the smaller of k and n − k.',
      'Start with n. Multiply by the next number down and divide by 2, then the next one down and divide by 3, and so on.',
      'Every result on the way is a whole number, so divide first whenever it goes in exactly.',
    ],
    example: make(10, 3, 2),
    graphic: () =>
      chain({
        start: 'C(10, 3)',
        moves: [
          { op: 'start: 10', value: '10' },
          { op: '× 9 ÷ 2', value: '45' },
          { op: '÷ 3 × 8', value: '120' },
        ],
        label: 'C(10, 3): start with 10; times 9 divided by 2 is 45; divided by 3 times 8 is 120',
      }),
    caption: 'One number down and one more divisor each step.',
  },
  levels,
  generate(rng, level) {
    const { n: [n0, n1], m: [m0, m1] } = levels[level].bounds;
    for (;;) {
      const n = rng.int(n0, n1), m = rng.int(m0, m1);
      if (2 * m > n) continue;
      // From level III, sometimes ask for the larger k, to practise flipping it.
      const k = level >= 3 && rng.chance(0.35) ? n - m : m;
      return make(n, k, level);
    }
  },
  steps(p) {
    const { n, k, m } = p.data;
    const s: Step[] = [{ op: '', expr: p.text }];
    if (k !== m) s.push({ op: '', expr: `C(${n}, ${k}) = C(${n}, ${m})`, note: `choosing ${k} = leaving out ${m}` });
    let cur = 1;
    for (let j = 1; j <= m; j++) {
      const f = n - j + 1;
      const next = (cur * f) / j;
      if (j === 1) s.push({ op: '', expr: String(n), note: `start with ${n}` });
      else if (cur % j === 0) s.push({ op: '', expr: `${fmt(cur)} ÷ ${j} × ${f} = ${fmt(next)}`, note: `× ${f} ÷ ${j}, dividing first` });
      else if (f % j === 0) s.push({ op: '', expr: `${f} ÷ ${j} × ${fmt(cur)} = ${fmt(next)}`, note: `× ${f} ÷ ${j}, dividing first` });
      else s.push({ op: '', expr: `${fmt(cur)} × ${f} ÷ ${j} = ${fmt(next)}`, note: `× ${f} ÷ ${j}` });
      cur = next;
    }
    s.push({ expr: fmt(cur) });
    return s;
  },
  reference(p) {
    // Pascal's triangle, independent of the running product.
    let row = [1];
    for (let i = 0; i < p.data.n; i++) row = [1, ...row.slice(1).map((v, j) => v + row[j]), 1];
    return row[p.data.k];
  },
});
