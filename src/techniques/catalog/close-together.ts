import { defineTechnique } from '../define';
import { pieces } from '../svg';
import { betterTechnique } from '../route';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'close-together';

function make(z: number, a: number, b: number, level: Level): Problem {
  const x = z + a, y = z + b;
  return {
    technique: ID,
    level,
    text: `${fmt(x)} × ${fmt(y)}`,
    answer: String(z * (x + b) + a * b),
    data: { x, y, z, a, b },
  };
}

const levels = {
  1: { label: '2-digit up to 45, small extras', bounds: { x: [12, 45], y: [12, 45], z: [10, 40], a: [1, 5], b: [1, 5] } },
  2: { label: '2-digit, same decade', bounds: { x: [11, 99], y: [11, 99], z: [10, 90], a: [1, 9], b: [1, 9] } },
  3: {
    label: 'just above 100, or same decade',
    bounds: { x: [11, 115], y: [11, 115], z: [10, 100], a: [1, 15], b: [1, 15] },
  },
  4: {
    label: 'just above a hundred, 200–900',
    bounds: { x: [201, 925], y: [201, 925], z: [200, 900], a: [1, 25], b: [1, 25] },
  },
  5: {
    label: '200–900, both extras 2-digit',
    bounds: { x: [211, 939], y: [211, 939], z: [200, 900], a: [11, 39], b: [11, 39] },
  },
  6: {
    label: 'just above a thousand, 2,000–9,000',
    bounds: { x: [2002, 9049], y: [2002, 9049], z: [2000, 9000], a: [2, 49], b: [2, 49] },
  },
} as const satisfies Levels;

/** Re-roll until no other technique suits the problem better (no squares, no × 11 or × 25). */
function fresh(build: () => Problem): Problem {
  for (;;) {
    const p = build();
    if (!betterTechnique(p)) return p;
  }
}

/** One offset is 1-digit, the other may be larger; order is random. */
function offsets(rng: Rng, maxBig: number): [number, number] {
  const small = rng.int(1, 9);
  const big = rng.chance(0.5) ? rng.int(1, 9) : nonRound(rng, 1, maxBig);
  return rng.chance(0.5) ? [small, big] : [big, small];
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Close-together method',
    category: 'mul',
    tier: 'Core',
    order: 80,
    idea: "Round number below both, times (first plus the second's extra); then add the two extras multiplied.",
  },
  card: {
    prose: [
      'Find the round number just below both, and how far past it each number is (its extra).',
      "Add the second number's extra to the first, and multiply that by the round number.",
      'Multiply the two extras together and add that on.',
    ],
    example: make(40, 3, 8, 2),
    graphic: () =>
      pieces({
        input: '43 × 48',
        ops: [
          { text: '43 + 8', out: '51' },
          { text: '40 × 51', out: '2,040' },
          { text: '3 × 8', out: '24' },
        ],
        answer: [
          { text: '2,040', from: 1 },
          { text: '+ 24', from: 2 },
        ],
        result: '2,064',
        label: '43 times 48: 43 plus 8 is 51, 40 times 51 is 2,040, the extras 3 times 8 is 24, so 2,064',
      }),
    caption: "Add 48's extra to 43, multiply by 40, then add the extras multiplied.",
  },
  levels,
  generate(rng, level) {
    if (level === 1) return fresh(() => make(10 * rng.int(1, 4), rng.int(1, 5), rng.int(1, 5), level));
    if (level === 2 || (level === 3 && rng.chance(0.4))) {
      return make(10 * rng.int(1, 9), rng.int(1, 9), rng.int(1, 9), level);
    }
    if (level === 3) return make(100, ...offsets(rng, 15), level);
    if (level === 4) return make(100 * rng.int(2, 9), ...offsets(rng, 25), level);
    if (level === 5) {
      return fresh(() => make(100 * rng.int(2, 9), nonRound(rng, 11, 39), nonRound(rng, 11, 39), level));
    }
    return fresh(() => {
      const big = nonRound(rng, 11, 49);
      const other = rng.chance(0.5) ? rng.int(2, 9) : nonRound(rng, 11, 29);
      return make(1000 * rng.int(2, 9), ...(rng.chance(0.5) ? [big, other] as const : [other, big] as const), level);
    });
  },
  steps(p) {
    const { x, y, z, a, b } = p.data;
    const s = x + b;
    const scale = z >= 1000 ? 1000 : z >= 100 ? 100 : 10;
    const lead = z / scale;
    const zeros = scale === 1000 ? '000' : scale === 100 ? '00' : 'a 0';
    const prodNote = lead === 1 ? (scale === 100 ? 'add two 0s' : `${s}, add a 0`) : `${lead} × ${fmt(s)}, add ${zeros}`;
    const ab = a * b;
    const steps: Step[] = [
      { op: '', expr: `${fmt(x)} × ${fmt(y)}` },
      { op: '', expr: `${fmt(x)} + ${b} = ${fmt(s)}`, note: `${fmt(y)} is ${b} past ${fmt(z)}` },
      { op: '', expr: `${fmt(z)} × ${fmt(s)} = ${fmt(z * s)}`, note: prodNote },
    ];
    if (a >= 10 && b >= 10 && b % 10 !== 0) {
      const t = b - (b % 10), u = b % 10;
      steps.push({ op: '', expr: `${a} × ${t} = ${fmt(a * t)}`, note: `extras: ${a} times the tens of ${b}` });
      steps.push({ op: '', expr: `${a} × ${u} = ${a * u}`, note: `then times the ones` });
      steps.push({ op: '', expr: `${fmt(a * t)} + ${a * u} = ${fmt(ab)}`, note: `so ${a} × ${b} = ${fmt(ab)}` });
    } else {
      steps.push({ op: '', expr: `${a} × ${b} = ${fmt(ab)}`, note: 'multiply the extras' });
    }
    steps.push({ op: '', expr: `${fmt(z * s)} + ${fmt(ab)}`, note: 'add it on' });
    steps.push({ expr: fmt(z * s + ab) });
    return steps;
  },
});
