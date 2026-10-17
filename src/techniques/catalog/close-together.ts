import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'close-together';

function make(z: number, a: number, b: number, level: Level): Problem {
  const x = z + a, y = z + b;
  return {
    technique: ID,
    level,
    text: `${x} × ${y}`,
    answer: String(z * (x + b) + a * b),
    data: { x, y, z, a, b },
  };
}

const levels = {
  1: { label: '2-digit, same decade', bounds: { x: [11, 99], y: [11, 99], z: [10, 90], a: [1, 9], b: [1, 9] } },
  2: {
    label: 'just above 100, or same decade',
    bounds: { x: [11, 115], y: [11, 115], z: [10, 100], a: [1, 15], b: [1, 15] },
  },
  3: {
    label: 'just above a hundred, 200–900',
    bounds: { x: [201, 925], y: [201, 925], z: [200, 900], a: [1, 25], b: [1, 25] },
  },
} as const satisfies Levels;

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
    example: make(40, 3, 8, 1),
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
    if (level === 1 || (level === 2 && rng.chance(0.4))) {
      return make(10 * rng.int(1, 9), rng.int(1, 9), rng.int(1, 9), level);
    }
    if (level === 2) return make(100, ...offsets(rng, 15), level);
    return make(100 * rng.int(2, 9), ...offsets(rng, 25), level);
  },
  steps(p) {
    const { x, y, z, a, b } = p.data;
    const s = x + b;
    const scale = z >= 100 ? 100 : 10;
    const lead = z / scale;
    const zeros = scale === 100 ? '00' : 'a 0';
    const prodNote = lead === 1 ? (scale === 100 ? 'add two 0s' : `${s}, add a 0`) : `${lead} × ${s}, add ${zeros}`;
    const steps: Step[] = [
      { op: '', expr: `${x} × ${y}` },
      { op: '', expr: `${x} + ${b} = ${s}`, note: `${y} is ${b} past ${z}` },
      { op: '', expr: `${z} × ${s} = ${fmt(z * s)}`, note: prodNote },
      { op: '', expr: `${a} × ${b} = ${a * b}`, note: 'multiply the extras' },
      { op: '', expr: `${fmt(z * s)} + ${a * b}`, note: 'add it on' },
      { expr: fmt(z * s + a * b) },
    ];
    return steps;
  },
});
