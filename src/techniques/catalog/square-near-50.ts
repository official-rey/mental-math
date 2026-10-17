import { defineTechnique } from '../define';
import { areaModel } from '../svg';
import type { Level, Levels, Problem } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-near-50';

/** n = base ± d with base 50 or 500. */
function parts(n: number) {
  const base = n < 100 ? 50 : 500;
  const up = n > base ? 1 : 0;
  const d = Math.abs(n - base);
  const unit = base * 2;
  const head = base / 2 + (up ? d : -d);
  return { base, up, d, unit, head };
}

function make(n: number, level: Level): Problem {
  const { up, d, unit, head } = parts(n);
  return { technique: ID, level, text: `${n}²`, answer: String(unit * head + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: '41² to 59²', bounds: { n: [41, 59], d: [1, 9] } },
  2: { label: '35² to 65²', bounds: { n: [35, 65], d: [1, 15] } },
  3: { label: '480² to 520²', bounds: { n: [480, 520], d: [1, 20] } },
} as const satisfies Levels;

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squares near 50',
    category: 'mul',
    tier: 'Core',
    order: 60,
    idea: '(50 ± d)² = 100(25 ± d) + d²: the hundreds are 25 ± d, and d² fills the last two digits.',
  },
  card: {
    prose: [
      'Since 2 · 50 · d = 100d, the cross term only moves the hundreds: they become 25 ± d.',
      'Append d² as two digits, carrying if d ≥ 10.',
      'Near 500 the same holds with 250 ± d thousands and d² as three digits.',
    ],
    example: make(53, 1),
    graphic: () =>
      areaModel({
        cols: [50, 3],
        rows: [50, 3],
        cell: (r, c) => ['2,500', '150', '150', '9'][r * 2 + c],
        accent: [[0, 1], [1, 0]],
        label: 'Area model: 53 squared as 50 squared, two 50 by 3 strips, and a 3 by 3 corner',
      }),
    caption: '53² is 2,500 plus two 50 × 3 strips, together 3 hundreds, plus the 3 × 3 corner.',
  },
  levels,
  generate(rng, level) {
    const up = rng.chance(0.5);
    let d: number, base: number;
    if (level === 1) [d, base] = [rng.int(1, 9), 50];
    else if (level === 2) [d, base] = [nonRound(rng, 4, 15), 50];
    else [d, base] = [nonRound(rng, 1, 19), 500];
    return make(up ? base + d : base - d, level);
  },
  steps(p) {
    const { n } = p.data;
    const { base, up, d, unit, head } = parts(n);
    const sign = up ? '+' : '−';
    const sq = d * d;
    const width = unit === 100 ? 2 : 3;
    const tail =
      sq < 10 ** width
        ? `append ${String(sq).padStart(width, '0')}`
        : `append ${String(sq % 100).padStart(2, '0')}, carry ${Math.floor(sq / 100)}`;
    return [
      { op: '', expr: `${n}²` },
      { expr: `${fmt(unit)} × (${base / 2} ${sign} ${d}) + ${d}²`, note: `${n} = ${base} ${sign} ${d}` },
      { expr: `${fmt(unit)} × ${head} + ${sq}`, note: `${base / 2} ${sign} ${d}, ${d}²` },
      { expr: fmt(unit * head + sq), note: tail },
    ];
  },
});
