import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-3digit';

/** Shift n to the nearest multiple of 100; the other factor moves the same distance the other way. */
function plan(n: number) {
  const r = n % 100;
  const up = r > 50 ? 1 : 0;
  const d = up ? 100 - r : r;
  const round = up ? n + d : n - d;
  const other = up ? n - d : n + d;
  return { up, d, round, other };
}

function make(n: number, level: Level): Problem {
  const { up, d, round, other } = plan(n);
  return { technique: ID, level, text: `${fmt(n)}²`, answer: String(round * other + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: 'within 3 of a hundred', bounds: { n: [101, 999], d: [1, 3] } },
  2: { label: 'within 9 of a hundred', bounds: { n: [101, 999], d: [1, 9] } },
  3: { label: 'within 25 of a hundred', bounds: { n: [101, 999], d: [1, 25] } },
  4: { label: 'any 3-digit', bounds: { n: [101, 999], d: [1, 49] } },
  5: { label: '4-digit, within 25 of a thousand', bounds: { n: [1001, 9999], d: [1, 25] } },
  6: { label: '1,070² to 1,930², within 30 of a hundred', bounds: { n: [1070, 1930], d: [1, 30] } },
} as const satisfies Levels;

/** A number at distance d from a multiple of 100 (never below 101 or above 999). */
function nearHundred(rng: Rng, d: number): number {
  const k = rng.int(1, 10);
  const below = k === 10 || (k > 1 && rng.chance(0.5));
  return below ? 100 * k - d : 100 * k + d;
}

/** Steps for the distance squared; a 2-digit distance goes up and down again to a multiple of 10. */
function smallSquare(d: number): Step[] {
  const r = d % 10;
  if (d <= 9 || r === 0) return [{ op: '', expr: `${d}² = ${fmt(d * d)}`, note: 'square the distance' }];
  const up = r >= 5;
  const e = up ? 10 - r : r;
  const round = up ? d + e : d - e;
  const other = up ? d - e : d + e;
  const prod = round * other;
  return [
    { op: '', expr: `${round} × ${other} = ${fmt(prod)}`, note: `${d}²: ${up ? 'up' : 'down'} ${e}, ${up ? 'down' : 'up'} ${e}` },
    { op: '', expr: `${fmt(prod)} + ${e * e} = ${fmt(prod + e * e)}`, note: `plus ${e}², so ${d}² = ${fmt(d * d)}` },
  ];
}

export default defineTechnique({
  meta: {
    id: ID,
    name: '3-digit squares',
    category: 'mul',
    tier: 'Advanced',
    order: 160,
    idea: 'Go to the nearest hundred and the same distance the other way, multiply those, then add the distance squared.',
  },
  card: {
    prose: [
      'Move the number to the nearest hundred, and move a copy the same distance the other way.',
      'Multiply the two: one digit times the other number, then add 00.',
      'Square the distance (up and down again if it has two digits) and add it on.',
    ],
    example: make(596, 2),
    graphic: () =>
      chain({
        start: '596²',
        moves: [
          { op: 'up 4, down 4', value: '600 × 592' },
          { op: '6 × 592, add 00', value: '355,200' },
          { op: '+ 4² (16)', value: '355,216' },
        ],
        label: 'Squaring 596: up 4 to 600 and down 4 to 592, 6 times 592 with 00 is 355,200, add 4 squared to get 355,216',
      }),
    caption: 'Up 4 and down 4, multiply, then add 4 squared.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(nearHundred(rng, rng.int(1, 3)), level);
    if (level === 2) return make(nearHundred(rng, rng.int(1, 9)), level);
    if (level === 3) return make(nearHundred(rng, nonRound(rng, 6, 25)), level);
    if (level === 4) return make(nonRound(rng, 101, 999), level);
    if (level === 5) {
      const d = rng.chance(0.4) ? rng.int(1, 9) : nonRound(rng, 11, 25);
      return make(1000 * rng.int(1, 9) + (rng.chance(0.5) ? d : 1000 - d), level);
    }
    const d = rng.chance(0.3) ? rng.int(1, 9) : nonRound(rng, 11, 30);
    return make(100 * rng.int(11, 19) + (rng.chance(0.5) ? d : -d), level);
  },
  steps(p) {
    const { n } = p.data;
    const { up, d, round, other } = plan(n);
    const prod = round * other, sq = d * d;
    let zeros = 2;
    while (round % 10 ** (zeros + 1) === 0) zeros++;
    const k = round / 10 ** zeros, shift = fmt(10 ** zeros);
    const tail = `add ${['', '', 'two', 'three', 'four'][zeros]} 0s`;
    const steps: Step[] = [
      { op: '', expr: `${fmt(n)}²` },
      up
        ? { op: '', expr: `${fmt(n)} + ${d} = ${fmt(round)}`, note: 'up to the nearest hundred' }
        : { op: '', expr: `${fmt(n)} − ${d} = ${fmt(round)}`, note: 'down to the nearest hundred' },
      up
        ? { op: '', expr: `${fmt(n)} − ${d} = ${fmt(other)}`, note: `down the same ${d}` }
        : { op: '', expr: `${fmt(n)} + ${d} = ${fmt(other)}`, note: `up the same ${d}` },
    ];
    if (k === 1) {
      steps.push({ op: '', expr: `${fmt(other)} × ${fmt(round)} = ${fmt(prod)}`, note: tail });
    } else if (k <= 9) {
      const h = other - (other % 100), rest = other % 100;
      steps.push({
        op: '',
        expr: `${k} × ${fmt(other)} = ${fmt(k * other)}`,
        note: rest ? `${k} × ${fmt(h)}, then ${k} × ${rest}` : `${k} × ${h / 100}, add 00`,
      });
      steps.push({ op: '', expr: `${fmt(k * other)} × ${shift} = ${fmt(prod)}`, note: tail });
    } else {
      const u = k - 10;
      steps.push({ op: '', expr: `${fmt(other)} × 10 = ${fmt(other * 10)}`, note: `${fmt(round)} is ${k} hundreds: first × 10` });
      steps.push({ op: '', expr: `${fmt(other)} × ${u} = ${fmt(other * u)}`, note: `then × ${u}` });
      steps.push({ op: '', expr: `${fmt(other * 10)} + ${fmt(other * u)} = ${fmt(k * other)}`, note: `that makes ${k} × ${fmt(other)}` });
      steps.push({ op: '', expr: `${fmt(k * other)} × ${shift} = ${fmt(prod)}`, note: tail });
    }
    steps.push(...smallSquare(d));
    steps.push({ op: '', expr: `${fmt(prod)} + ${fmt(sq)}`, note: 'add the square on' });
    steps.push({ expr: fmt(prod + sq) });
    return steps;
  },
});
