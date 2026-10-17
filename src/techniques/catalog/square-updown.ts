import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-updown';

/** Shift to the nearest multiple of 10 (a final 5 goes up); the other factor moves the other way. */
function plan(n: number) {
  const r = n % 10;
  const up = r >= 5 ? 1 : 0;
  const d = up ? 10 - r : r;
  const round = up ? n + d : n - d;
  const other = up ? n - d : n + d;
  return { up, d, round, other };
}

function make(n: number, level: Level): Problem {
  const { up, d, round, other } = plan(n);
  return { technique: ID, level, text: `${n}²`, answer: String(round * other + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: '2-digit ending in 1, 2, 8, 9', bounds: { n: [11, 99], d: [1, 2] } },
  2: { label: 'any 2-digit', bounds: { n: [11, 99], d: [1, 5] } },
  3: { label: '101² to 199²', bounds: { n: [101, 199], d: [1, 5] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squaring by going up and down',
    category: 'mul',
    tier: 'Core',
    order: 70,
    idea: 'Go to the nearest ten and the same distance the other way, multiply those, then add the distance squared.',
  },
  card: {
    prose: [
      'Move the number to the nearest ten, and move a copy the same distance the other way.',
      'Multiply the two new numbers; one ends in 0, so it is a quick product.',
      'Square the distance you moved and add it on.',
    ],
    example: make(38, 1),
    graphic: () =>
      chain({
        start: '38²',
        moves: [
          { op: 'up 2, down 2', value: '40 × 36' },
          { op: '4 × 36, add a 0', value: '1,440' },
          { op: '+ 2² (4)', value: '1,444' },
        ],
        label: 'Squaring 38: up 2 to 40 and down 2 to 36, 40 times 36 is 1,440, add 2 squared to get 1,444',
      }),
    caption: 'Up 2 and down 2, multiply, then add 2 squared.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(10 * rng.int(1, 9) + rng.pick([1, 2, 8, 9] as const), level);
    if (level === 2) {
      return make(rng.chance(0.7) ? 10 * rng.int(1, 9) + rng.int(3, 7) : nonRound(rng, 11, 99), level);
    }
    return make(nonRound(rng, 101, 199), level);
  },
  steps(p) {
    const { n } = p.data;
    const { up, d, round, other } = plan(n);
    const k = round / 10, prod = round * other, sq = d * d;
    const steps: Step[] = [
      { op: '', expr: `${n}²` },
      up
        ? { op: '', expr: `${n} + ${d} = ${round}`, note: 'up to the nearest ten' }
        : { op: '', expr: `${n} − ${d} = ${round}`, note: 'down to the nearest ten' },
      up
        ? { op: '', expr: `${n} − ${d} = ${other}`, note: `down the same ${d}` }
        : { op: '', expr: `${n} + ${d} = ${other}`, note: `up the same ${d}` },
    ];
    if (k <= 9) {
      steps.push({ op: '', expr: `${round} × ${other} = ${fmt(prod)}`, note: `${k} × ${other}, add a 0` });
    } else if (k % 10 === 0) {
      const q = k / 10;
      steps.push({
        op: '',
        expr: `${fmt(round)} × ${other} = ${fmt(prod)}`,
        note: q === 1 ? 'add two 0s' : `${q} × ${other}, add 00`,
      });
    } else {
      const t = round - 100;
      steps.push({ op: '', expr: `${other} × 100 = ${fmt(other * 100)}`, note: `${other} times 100` });
      steps.push({ op: '', expr: `${other} × ${t} = ${fmt(other * t)}`, note: `${other} times ${t}` });
      steps.push({ op: '', expr: `${fmt(other * 100)} + ${fmt(other * t)} = ${fmt(prod)}`, note: `that makes ${round} × ${other}` });
    }
    steps.push({ op: '', expr: `${d}² = ${sq}`, note: 'square the distance' });
    steps.push({ op: '', expr: `${fmt(prod)} + ${sq}`, note: 'add it on' });
    steps.push({ expr: fmt(prod + sq) });
    return steps;
  },
});
