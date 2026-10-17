import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound, scaled } from '../util';

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

const PLACE = ['', 'point 1 place', 'point 2 places', 'point 3 places'];

function graphic(): string {
  return chain({
    start: '37',
    moves: [
      { op: '× 2', value: '74' },
      { op: '× 2', value: '148' },
      { op: 'point 2 left', value: '1.48' },
    ],
    label: 'Dividing 37 by 25: 1, double 37 to 74; 2, double again to 148; 3, move the point two places left to get 1.48',
  });
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Dividing by 5, 25 and 125',
    category: 'div',
    tier: 'Foundation',
    order: 20,
    idea: 'For ÷5 double once, ÷25 double twice, ÷125 double three times; then move the point that many places left.',
  },
  card: {
    prose: [
      'Double the number: once for ÷5, twice for ÷25, three times for ÷125.',
      'Move the decimal point left: 1 place for ÷5, 2 for ÷25, 3 for ÷125.',
      'Drop any zeros left at the end after the point.',
    ],
    example: make(37, 25, 3),
    graphic,
    caption: 'Double, double again, then slide the point two places left.',
  },
  levels,
  generate(rng, level) {
    const { n } = levels[level].bounds;
    return make(nonRound(rng, n[0], n[1]), divisor(rng, level), level);
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
    const ans = scaled(v, places);
    const trimmed = !ans.includes('.') || ans.split('.')[1].length < places;
    steps.push({ expr: fmt(ans), note: `${PLACE[places]} left${trimmed ? ', drop 0s' : ''}` });
    return steps;
  },
});
