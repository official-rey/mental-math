import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt } from '../util';

const ID = 'square-5';

function make(n: number, level: Level): Problem {
  const a = (n - 5) / 10;
  return { technique: ID, level, text: `${fmt(n)}²`, answer: String(100 * a * (a + 1) + 25), data: { n, a } };
}

const levels = {
  1: { label: '15² to 55²', bounds: { n: [15, 55], a: [1, 5] } },
  2: { label: '15² to 95²', bounds: { n: [15, 95], a: [1, 9] } },
  3: { label: '105² to 195²', bounds: { n: [105, 195], a: [10, 19] } },
  4: { label: '3-digit ending in 5', bounds: { n: [205, 995], a: [20, 99] } },
  5: { label: '1,005² to 1,995²', bounds: { n: [1005, 1995], a: [100, 199] } },
  6: { label: '2,005² to 2,995²', bounds: { n: [2005, 2995], a: [200, 299] } },
} as const satisfies Levels;

const PLACE = ['ones', 'tens', 'hundreds', 'thousands'];

/** Place-value parts of n, largest first, zeros skipped: 238 → [[200, 'hundreds'], [30, 'tens'], [8, 'ones']]. */
function placeParts(n: number): [number, string][] {
  const ds = String(n).split('').map(Number);
  return ds
    .map((d, i): [number, string] => [d * 10 ** (ds.length - 1 - i), PLACE[ds.length - 1 - i]])
    .filter(([v]) => v > 0);
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squaring numbers ending in 5',
    category: 'pow',
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
    example: make(65, 2),
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
    const steps: Step[] = [{ op: '', expr: `${fmt(n)}²` }];
    if (a <= 9) {
      steps.push({ op: '', expr: `${a} × ${b} = ${prod}`, note: `${a} times the next number` });
    } else {
      steps.push({ op: '', expr: `${a} + 1 = ${b}`, note: 'the next number up' });
      const parts = placeParts(b);
      if (parts.length === 1) {
        const [v] = parts[0];
        const zeros = String(v).length - 1;
        const lead = v / 10 ** zeros;
        const tail = zeros === 1 ? 'add a 0' : zeros === 2 ? 'add 00' : 'add 000';
        steps.push({ op: '', expr: `${a} × ${b} = ${fmt(prod)}`, note: lead === 1 ? tail : `${a} × ${lead}, ${tail}` });
      } else {
        for (const [v, place] of parts) {
          steps.push({ op: '', expr: `${a} × ${v} = ${fmt(a * v)}`, note: `times the ${place} of ${b}` });
        }
        const sum = parts.map(([v]) => fmt(a * v)).join(' + ');
        steps.push({ op: '', expr: `${sum} = ${fmt(prod)}`, note: parts.length === 2 ? 'add the two parts' : 'add the parts' });
      }
    }
    steps.push({ expr: fmt(100 * prod + 25), note: `${fmt(prod)} then 25` });
    return steps;
  },
});
