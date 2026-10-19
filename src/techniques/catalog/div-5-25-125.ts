import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'div-5-25-125';

/** d → [multiplier, power of ten]: 5 = 10/2, 25 = 100/4, 125 = 1000/8. */
const RULE: Record<number, [number, number]> = { 5: [2, 1], 25: [4, 2], 125: [8, 3] };

function make(n: number, d: number, level: Level): Problem {
  const [k, places] = RULE[d];
  return { technique: ID, level, text: `${fmt(n)} ÷ ${d}`, answer: scaled(n * k, places), data: { n, d } };
}

const levels = {
  1: { label: '2-digit ÷ 5', bounds: { n: [11, 99], d: [5, 5] } },
  2: { label: '2–3-digit ÷ 5', bounds: { n: [11, 999], d: [5, 5] } },
  3: { label: '2–3-digit ÷ 25', bounds: { n: [11, 999], d: [25, 25] } },
  4: { label: '3–4-digit ÷ 25 or 125', bounds: { n: [101, 9999], d: [25, 125] } },
  5: { label: '4-digit ÷ 125', bounds: { n: [1001, 9999], d: [125, 125] } },
  6: { label: '5-digit ÷ 25 or 125', bounds: { n: [10001, 99999], d: [25, 125] } },
} as const satisfies Levels;

/** Divisor for a level: 5 at the start, then 25, then mostly 125. */
function divisor(rng: Rng, level: Level): number {
  if (level <= 2) return 5;
  if (level === 3) return 25;
  if (level === 5) return 125;
  return rng.chance(level === 4 ? 0.7 : 0.75) ? 125 : 25;
}

const ZEROS = ['', 'drop the 0', 'drop two 0s', 'drop three 0s'];

function graphic(): string {
  return chain({
    start: '375',
    moves: [
      { op: '× 2', value: '750' },
      { op: '× 2', value: '1,500' },
      { op: 'drop two 0s', value: '15' },
    ],
    label: 'Dividing 375 by 25: double to 750, double again to 1,500, then drop two zeros to get 15',
  });
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Dividing by 5, 25 and 125',
    category: 'div',
    tier: 'Foundation',
    order: 20,
    idea: 'For ÷5 double once, ÷25 double twice, ÷125 double three times; then drop that many zeros.',
  },
  card: {
    prose: [
      'Double the number: once for ÷5, twice for ÷25, three times for ÷125.',
      'Drop zeros from the end: one for ÷5, two for ÷25, three for ÷125.',
    ],
    example: make(375, 25, 3),
    graphic,
    caption: 'Double, double again, then drop two zeros.',
  },
  levels,
  generate(rng, level) {
    const [lo, hi] = levels[level].bounds.n;
    const d = divisor(rng, level);
    for (;;) {
      // Whole answers only: a multiple of d, mostly not a round one.
      const n = d * rng.int(Math.ceil(lo / d), Math.floor(hi / d));
      if (n % (2 * d) === 0 && rng.chance(0.7)) continue;
      return make(n, d, level);
    }
  },
  steps(p) {
    const { n, d } = p.data;
    const [k, places] = RULE[d];
    const steps: Step[] = [{ op: '', expr: `${fmt(n)} ÷ ${d}` }];
    let v = n;
    for (let i = 0; i < Math.log2(k); i++) {
      steps.push({ op: '', expr: `${fmt(v)} × 2 = ${fmt(v * 2)}`, note: ['double', 'double again', 'double a third time'][i] });
      v *= 2;
    }
    steps.push({ expr: fmt(scaled(v, places)), note: ZEROS[places] });
    return steps;
  },
});
