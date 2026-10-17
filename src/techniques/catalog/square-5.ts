import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt } from '../util';

const ID = 'square-5';

function make(n: number, level: Level): Problem {
  const a = (n - 5) / 10;
  return { technique: ID, level, text: `${n}²`, answer: String(100 * a * (a + 1) + 25), data: { n, a } };
}

const levels = {
  1: { label: '15² to 95²', bounds: { n: [15, 95], a: [1, 9] } },
  2: { label: '105² to 195²', bounds: { n: [105, 195], a: [10, 19] } },
  3: { label: '3-digit ending in 5', bounds: { n: [205, 995], a: [20, 99] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squaring numbers ending in 5',
    category: 'mul',
    tier: 'Foundation',
    order: 50,
    idea: 'Drop the 5, multiply what is left by the next number up, then write 25 after it.',
  },
  card: {
    prose: [
      'Drop the final 5 and multiply what is left by the next number up: for 65, do 6 × 7.',
      'Write 25 after that product.',
      'For 3-digit numbers, do the product in two parts: times the tens, then times the ones.',
    ],
    example: make(65, 1),
    graphic: () =>
      pieces({
        input: '65²',
        ops: [
          { text: '6 × 7', out: '42' },
          { text: '5 × 5', out: '25' },
        ],
        answer: [
          { text: '42', from: 0 },
          { text: '25', from: 1 },
        ],
        result: '4,225',
        label: 'Squaring 65: 6 times 7 gives 42, 5 times 5 gives 25, so 4,225',
      }),
    caption: 'Multiply the front by the next number up, then write 25 after it.',
  },
  levels,
  generate(rng, level) {
    const { a } = levels[level].bounds;
    return make(10 * rng.int(a[0], a[1]) + 5, level);
  },
  steps(p) {
    const { n, a } = p.data;
    const b = a + 1, prod = a * b;
    const steps: Step[] = [{ op: '', expr: `${n}²` }];
    if (a <= 9) {
      steps.push({ op: '', expr: `${a} × ${b} = ${prod}`, note: `${a} times the next number` });
    } else {
      const t = b - (b % 10), u = b % 10;
      steps.push({ op: '', expr: `${a} + 1 = ${b}`, note: 'the next number up' });
      if (u === 0) {
        steps.push({ op: '', expr: `${a} × ${b} = ${fmt(prod)}`, note: `${a} × ${b / 10}, add a 0` });
      } else {
        steps.push({ op: '', expr: `${a} × ${t} = ${fmt(a * t)}`, note: `times the tens of ${b}` });
        steps.push({ op: '', expr: `${a} × ${u} = ${fmt(a * u)}`, note: `times the ones of ${b}` });
        steps.push({ op: '', expr: `${fmt(a * t)} + ${fmt(a * u)} = ${fmt(prod)}`, note: 'add the two parts' });
      }
    }
    steps.push({ expr: fmt(100 * prod + 25), note: `${fmt(prod)} then 25` });
    return steps;
  },
});
