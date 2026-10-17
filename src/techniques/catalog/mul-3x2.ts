import { defineTechnique } from '../define';
import { areaModel } from '../svg';
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
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(answer), data: { a, b } };
}

/** How a × T is found for a round T: one digit product, then a shift. */
function tensNote(a: number, t: number): string {
  if (t === 10 || t === 100) return `${a} × ${t}`;
  return `${a}×${t / 10} = ${fmt((a * t) / 10)}, ×10`;
}

const levels = {
  1: { label: '3-digit × 12–19', bounds: { a: [101, 599], b: [12, 19] } },
  2: { label: '3-digit × 21–59', bounds: { a: [101, 999], b: [21, 59] } },
  3: { label: '3-digit × 61–99', bounds: { a: [201, 999], b: [61, 99] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: '3-digit × 2-digit',
    category: 'mul',
    tier: 'Advanced',
    order: 150,
    idea: 'Split the 2-digit factor at its tens: two 3-digit × 1-digit products, then one sum or difference.',
  },
  card: {
    prose: [
      'Split the 2-digit factor into tens and ones and multiply by each part.',
      'If it ends in 8 or 9, round it up instead and subtract 1 or 2 copies.',
      'Hold the larger partial product while the smaller one is formed.',
    ],
    example: make(853, 47, 2),
    graphic: () =>
      areaModel({
        cols: [40, 7],
        rows: [853],
        cell: (_r, c) => fmt([34120, 5971][c]),
        accent: [[0, 0]],
        height: 150,
        label: 'Area model: 853 by 47 split into 853 by 40 and 853 by 7',
      }),
    caption: 'The 853 × 47 rectangle is an 853 × 40 block, 34,120, plus an 853 × 7 strip, 5,971.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    return make(nonRound(rng, a[0], a[1]), nonRound(rng, b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const [t, r] = split(b);
    const big = a * t, small = a * Math.abs(r);
    const steps: Step[] = [{ op: '', expr: `${a} × ${b}` }];
    if (r > 0) {
      steps.push({ expr: `${a} × ${t} + ${a} × ${r}`, note: `${b} = ${t} + ${r}` });
      steps.push({ expr: `${fmt(big)} + ${a} × ${r}`, note: tensNote(a, t) });
      steps.push({ expr: `${fmt(big)} + ${fmt(small)}`, note: `${a} × ${r}` });
      steps.push({ expr: fmt(big + small) });
    } else if (r === -1) {
      steps.push({ expr: `${a} × ${t} − ${a}`, note: `${b} = ${t} − 1` });
      steps.push({ expr: `${fmt(big)} − ${a}`, note: tensNote(a, t) });
      steps.push({ expr: fmt(big - small) });
    } else {
      const d = -r;
      steps.push({ expr: `${a} × ${t} − ${a} × ${d}`, note: `${b} = ${t} − ${d}` });
      steps.push({ expr: `${fmt(big)} − ${a} × ${d}`, note: tensNote(a, t) });
      steps.push({ expr: `${fmt(big)} − ${fmt(small)}`, note: `${a} × ${d}` });
      steps.push({ expr: fmt(big - small) });
    }
    return steps;
  },
});
