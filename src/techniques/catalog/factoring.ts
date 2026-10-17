import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'factoring';

/** Ways to write n as f1 × f2 with one-digit factors 2–9, f1 ≤ f2. */
function splits2(n: number): number[][] {
  const out: number[][] = [];
  for (let f = 2; f <= 9; f++) for (let g = f; g <= 9; g++) if (f * g === n) out.push([f, g]);
  return out;
}

/** Ways to write n as f1 × f2 × f3 with one-digit factors 2–9, ascending. */
function splits3(n: number): number[][] {
  const out: number[][] = [];
  for (let f = 2; f <= 9; f++)
    for (let g = f; g <= 9; g++) for (let h = g; h <= 9; h++) if (f * g * h === n) out.push([f, g, h]);
  return out;
}

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
/** Small composites 12–36 that split into two digits (multiples of 10 left out). */
const SMALL = range(12, 36).filter((n) => n % 10 !== 0 && splits2(n).length > 0);
/** Larger 2-digit numbers that split into two digits. */
const LARGE = range(37, 99).filter((n) => n % 10 !== 0 && splits2(n).length > 0);
/** Numbers that need three one-digit factors. */
const TRIPLE = range(75, 196).filter((n) => n % 10 !== 0 && splits2(n).length === 0 && splits3(n).length > 0);

function make(a: number, fs: number[], level: Level): Problem {
  const b = fs.reduce((x, y) => x * y, 1);
  const answer = fs.reduce((acc, f) => acc * f, a);
  return {
    technique: ID,
    level,
    text: `${a} × ${b}`,
    answer: String(answer),
    data: { a, b, f1: fs[0], f2: fs[1], f3: fs[2] ?? 1 },
  };
}

const levels = {
  1: { label: '2-digit × 12–36', bounds: { a: [12, 99], b: [12, 36], f1: [2, 9], f2: [2, 9] } },
  2: { label: '2-digit × 42–81', bounds: { a: [12, 99], b: [42, 81], f1: [2, 9], f2: [2, 9] } },
  3: {
    label: '3-digit × 2-digit, or 3 factors',
    bounds: { a: [12, 399], b: [12, 196], f1: [2, 9], f2: [2, 9], f3: [1, 9] },
  },
} as const satisfies Levels;

function pickSplit(rng: Rng, b: number): number[] {
  return rng.pick(splits2(b));
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Factoring method',
    category: 'mul',
    tier: 'Core',
    order: 90,
    idea: 'Split the second number into one-digit factors, then multiply by each factor in turn.',
  },
  card: {
    prose: [
      'Write the second number as one-digit factors: 42 = 6 × 7.',
      'Multiply the first number by the first factor: 47 × 6 = 282.',
      'Multiply that result by the next factor: 282 × 7 = 1,974.',
    ],
    example: make(47, [6, 7], 2),
    graphic: () =>
      chain({
        start: '47',
        moves: [
          { op: '× 6', value: '282' },
          { op: '× 7', value: '1,974' },
        ],
        label: '47 times 42 with 42 as 6 times 7: 47 times 6 is 282, then 282 times 7 is 1,974',
      }),
    caption: 'With 42 as 6 × 7: times 6, then times 7.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      const b = rng.pick(SMALL);
      return make(nonRound(rng, 12, 99), pickSplit(rng, b), level);
    }
    if (level === 2) {
      const b = rng.pick(LARGE);
      return make(nonRound(rng, 12, 99), pickSplit(rng, b), level);
    }
    if (rng.chance(0.5)) {
      const b = rng.pick([...SMALL, ...LARGE]);
      return make(nonRound(rng, 101, 399), pickSplit(rng, b), level);
    }
    const b = rng.pick(TRIPLE);
    return make(nonRound(rng, 12, 99), rng.pick(splits3(b)), level);
  },
  steps(p) {
    const { a, b, f1, f2, f3 } = p.data;
    const fs = f3 > 1 ? [f1, f2, f3] : [f1, f2];
    const steps: Step[] = [
      { op: '', expr: `${a} × ${b}` },
      { op: '', expr: `${fs.join(' × ')} = ${b}`, note: `split ${b} into digits` },
    ];
    let acc = a;
    fs.forEach((f, i) => {
      const prev = acc;
      acc *= f;
      steps.push({ op: '', expr: `${fmt(prev)} × ${f} = ${fmt(acc)}`, note: i === 0 ? `times ${f}` : `then times ${f}` });
    });
    steps.push({ expr: fmt(acc), note: 'answer' });
    return steps;
  },
});
