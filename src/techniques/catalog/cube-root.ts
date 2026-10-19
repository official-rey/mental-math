import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound, sup } from '../util';

const ID = 'cube-root';

/** Last digit of a cube → units digit of its root. Only 2 ↔ 8 and 3 ↔ 7 swap. */
const CUBE_UNITS = [0, 1, 8, 7, 4, 5, 6, 3, 2, 9];

function make(r: number, k: 3 | 5, level: Level): Problem {
  return {
    technique: ID,
    level,
    text: `${k === 3 ? '∛' : '⁵√'}${fmt(r ** k)}`,
    answer: String(r),
    data: { r, k },
    hint: k === 3 ? 'perfect cube' : 'perfect fifth power',
  };
}

const levels = {
  1: { label: 'cube roots 11–25', bounds: { r: [11, 25], k: [3, 3] } },
  2: { label: 'cube roots 26–50', bounds: { r: [26, 50], k: [3, 3] } },
  3: { label: 'cube roots 51–75', bounds: { r: [51, 75], k: [3, 3] } },
  4: { label: 'cube roots 76–99', bounds: { r: [76, 99], k: [3, 3] } },
  5: { label: 'fifth roots 11–50', bounds: { r: [11, 50], k: [5, 5] } },
  6: { label: 'fifth roots 51–99', bounds: { r: [51, 99], k: [5, 5] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Cube and fifth roots',
    category: 'pow',
    tier: 'Advanced',
    order: 170,
    idea: 'For a perfect cube, the last digit names the units of the root and the front names the tens.',
  },
  card: {
    prose: [
      'Learn the cubes of 1 to 9. Each ends in a different digit, so a cube’s last digit names the units: 2 and 8 swap, 3 and 7 swap, the rest stay.',
      'Drop the last three digits. The largest cube that fits under what is left is the tens digit.',
      'Fifth powers end in the root’s own digit: drop five digits and compare with 1⁵ to 9⁵.',
    ],
    example: make(47, 3, 2),
    graphic: () =>
      pieces({
        input: '∛103,823',
        ops: [
          { text: '103: 4³ = 64', out: '4' },
          { text: 'ends in 3', out: '7' },
        ],
        answer: [
          { text: '4', from: 0 },
          { text: '7', from: 1 },
        ],
        label: 'Cube root of 103,823: 103 holds 4 cubed but not 5 cubed, so the tens digit is 4; a cube ending in 3 comes from 7, so 47',
      }),
    caption: '103 holds 4³ but not 5³; a cube ending in 3 comes from a 7.',
  },
  levels,
  generate(rng, level) {
    const [lo, hi] = levels[level].bounds.r;
    return make(nonRound(rng, lo, hi), level >= 5 ? 5 : 3, level);
  },
  steps(p) {
    const { r, k } = p.data;
    const N = r ** k;
    const last = N % 10;
    const u = k === 3 ? CUBE_UNITS[last] : last;
    const front = Math.floor(N / 10 ** k);
    const t = Math.floor(r / 10);
    const kind = k === 3 ? 'cube' : 'fifth power';
    return [
      { op: '', expr: p.text },
      { op: '', expr: `${u}${sup(k)} = ${fmt(u ** k)}`, note: k === 3 ? `ends in ${last} too: units ${u}` : `same last digit: units ${u}` },
      { op: '', expr: fmt(front), note: `drop the last ${k === 3 ? 'three' : 'five'} digits` },
      { op: '', expr: `${t}${sup(k)} = ${fmt(t ** k)}`, note: `largest ${kind} up to ${fmt(front)}: tens ${t}` },
      { expr: String(r) },
    ];
  },
  reference: (p) => (p.data.r ** p.data.k) ** (1 / p.data.k),
});
