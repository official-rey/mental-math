import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-3x2';

/** Round part of b and the signed rest: 47 → [40, 7], 48 → [50, −2]. */
function split(b: number): [number, number] {
  const ones = b % 10;
  return ones >= 8 ? [b - ones + 10, ones - 10] : [b - ones, ones];
}

function make(a: number, b: number, level: Level): Problem {
  const [t, r] = split(b);
  const answer = r >= 0 ? a * t + a * r : a * t - a * -r;
  return { technique: ID, level, text: `${fmt(a)} × ${b}`, answer: String(answer), data: { a, b } };
}

/** How a × T is found for a round T: a one-digit product, then zeros on the end. */
function tensNote(a: number, t: number): string {
  if (t === 10) return 'add a 0';
  if (t === 100) return 'add two 0s';
  return `${fmt(a)}×${t / 10} = ${fmt((a * t) / 10)}, add a 0`;
}

const levels = {
  1: { label: 'small 3-digit × 12–14', bounds: { a: [101, 399], b: [12, 14] } },
  2: { label: '3-digit × 12–19', bounds: { a: [101, 599], b: [12, 19] } },
  3: { label: '3-digit × 21–59', bounds: { a: [101, 999], b: [21, 59] } },
  4: { label: '3-digit × 61–99', bounds: { a: [201, 999], b: [61, 99] } },
  5: { label: '3-digit (≥ 600) × 63–99, big digits', bounds: { a: [644, 999], b: [63, 99] } },
  6: { label: '4-digit (up to 2,999) × 2-digit', bounds: { a: [1111, 2999], b: [32, 99] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '3-digit × 2-digit',
    category: 'mul',
    tier: 'Advanced',
    order: 150,
    idea: 'Multiply by the tens, then by the ones, and add. Ending in 8 or 9: round up and subtract.',
  },
  card: {
    prose: [
      'Multiply by the tens: 853 × 4 = 3,412, add a 0 to get 34,120.',
      'Multiply by the ones: 853 × 7 = 5,971, then add the two: 40,091.',
      'If it ends in 8 or 9, round up to the next ten instead and take away 2 or 1 copies.',
    ],
    example: make(853, 47, 3),
    graphic: () =>
      chain({
        start: '853 × 47',
        moves: [
          { op: '853 × 40', value: '34,120' },
          { op: '+ 853 × 7', value: '40,091' },
        ],
        label: '853 times 47: 853 times 40 is 34,120, then add 853 times 7, 5,971, to reach 40,091',
      }),
    caption: 'Multiply by 40 first, then add on 853 × 7.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    if (level === 1) {
      let x = nonRound(rng, a[0], a[1]);
      while (x === 125) x = nonRound(rng, a[0], a[1]);
      return make(x, rng.int(b[0], b[1]), level);
    }
    if (level === 5) {
      const x = rng.int(6, 9) * 100 + rng.int(4, 9) * 10 + rng.int(4, 9);
      return make(x, rng.int(6, 9) * 10 + rng.int(3, 9), level);
    }
    if (level === 6) {
      const x = rng.int(1, 2) * 1000 + rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);
      return make(x, rng.int(3, 9) * 10 + rng.int(2, 9), level);
    }
    return make(nonRound(rng, a[0], a[1]), nonRound(rng, b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const [t, r] = split(b);
    const big = a * t, small = a * Math.abs(r);
    const steps: Step[] = [{ op: '', expr: `${fmt(a)} × ${b}` }];
    if (r > 0) {
      steps.push({ op: '', expr: `${fmt(a)} × ${t} = ${fmt(big)}`, note: tensNote(a, t) });
      steps.push({ op: '', expr: `${fmt(a)} × ${r} = ${fmt(small)}`, note: 'times the ones' });
      steps.push({ op: '', expr: `${fmt(big)} + ${fmt(small)} = ${fmt(big + small)}`, note: 'add them' });
      steps.push({ expr: fmt(big + small), note: 'answer' });
    } else {
      const d = -r;
      steps.push({ op: '', expr: `${b} + ${d} = ${t}`, note: 'round up' });
      steps.push({ op: '', expr: `${fmt(a)} × ${t} = ${fmt(big)}`, note: tensNote(a, t) });
      if (d === 1) {
        steps.push({ op: '', expr: `${fmt(big)} − ${fmt(a)} = ${fmt(big - small)}`, note: `take away one ${fmt(a)}` });
      } else {
        steps.push({ op: '', expr: `${fmt(a)} × ${d} = ${fmt(small)}`, note: `${d} copies of ${fmt(a)}` });
        steps.push({ op: '', expr: `${fmt(big)} − ${fmt(small)} = ${fmt(big - small)}`, note: 'take them away' });
      }
      steps.push({ expr: fmt(big - small), note: 'answer' });
    }
    return steps;
  },
});
