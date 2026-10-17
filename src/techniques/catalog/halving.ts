import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound, scaled } from '../util';

const ID = 'halving';

function make(n: number, m: number, level: Level): Problem {
  return { technique: ID, level, text: `${n} × ${m}`, answer: String(n * m), data: { n, m } };
}

const levels = {
  1: { label: 'even 2-digit × 5', bounds: { n: [12, 98], m: [5, 5] } },
  2: { label: '2–3-digit × 5 or × 50', bounds: { n: [12, 999], m: [5, 50] } },
  3: { label: '2–3-digit × 25', bounds: { n: [12, 999], m: [25, 25] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Multiplying by 5, 25 and 50',
    category: 'mul',
    tier: 'Foundation',
    order: 40,
    idea: 'Halve the number, then shift: one place for × 5, two for × 50. For × 25, halve twice and shift two.',
  },
  card: {
    prose: [
      'Halve the number. For × 25, halve it again.',
      'Shift one place left for × 5 (add a 0), two places for × 50 or × 25 (add 00).',
      'If halving left a .5 or .25, the shift moves those digits into the answer.',
    ],
    example: make(48, 5, 1),
    graphic: () =>
      chain({
        start: '48 × 5',
        moves: [
          { op: '÷ 2 (halve)', value: '24' },
          { op: '× 10 (add a 0)', value: '240' },
        ],
        label: '48 times 5: halve 48 to get 24, then add a 0 to get 240',
      }),
    caption: 'Halve first, then add a zero.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      for (;;) {
        const n = 2 * rng.int(6, 49);
        if (n % 10 !== 0) return make(n, 5, level);
      }
    }
    let n = rng.chance(0.5) ? nonRound(rng, 12, 99) : nonRound(rng, 101, 999);
    if (level === 2) {
      if (n % 2 === 0 && rng.chance(0.5)) n += 1;
      return make(n, rng.pick([5, 50] as const), level);
    }
    return make(n, 25, level);
  },
  steps(p) {
    const { n, m } = p.data;
    const half = scaled(n * 5, 1);
    const steps: Step[] = [
      { op: '', expr: `${fmt(n)} × ${m}` },
      { op: '', expr: `${fmt(n)} ÷ 2 = ${fmt(half)}`, note: `halve ${fmt(n)}` },
    ];
    if (m === 25) {
      steps.push({ op: '', expr: `${fmt(half)} ÷ 2 = ${fmt(scaled(n * 25, 2))}`, note: 'halve again' });
    }
    const two = m !== 5;
    const whole = Number.isInteger(two ? n * m / 100 : n * m / 10);
    const note = two
      ? whole ? 'shift two places: add 00' : 'shift the point two places'
      : whole ? 'shift one place: add 0' : 'shift the point one place';
    steps.push({ expr: fmt(n * m), note });
    return steps;
  },
});
