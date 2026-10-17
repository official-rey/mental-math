import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-3digit';

/** Shift n to the nearest multiple of 100; the other factor moves the same distance the other way. */
function plan(n: number) {
  const r = n % 100;
  const up = r > 50 ? 1 : 0;
  const d = up ? 100 - r : r;
  const round = up ? n + d : n - d;
  const other = up ? n - d : n + d;
  return { up, d, round, other };
}

function make(n: number, level: Level): Problem {
  const { up, d, round, other } = plan(n);
  return { technique: ID, level, text: `${n}²`, answer: String(round * other + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: 'within 9 of a hundred', bounds: { n: [101, 999], d: [1, 9] } },
  2: { label: 'within 25 of a hundred', bounds: { n: [101, 999], d: [1, 25] } },
  3: { label: 'any 3-digit', bounds: { n: [101, 999], d: [1, 49] } },
} as const satisfies Levels;

/** A number at distance d from a multiple of 100 (never below 101 or above 999). */
function nearHundred(rng: Rng, d: number): number {
  const k = rng.int(1, 10);
  const below = k === 10 || (k > 1 && rng.chance(0.5));
  return below ? 100 * k - d : 100 * k + d;
}

/** Side lines for d² when d is 2-digit: go up and down to a multiple of 10. */
function smallSquare(d: number): Step[] {
  const r = d % 10;
  const up = r >= 5;
  const e = up ? 10 - r : r;
  const round = up ? d + e : d - e;
  const other = up ? d - e : d + e;
  return [
    { op: '→', expr: `${d}² = ${round} × ${other} + ${e}²`, note: up ? `up ${e}, down ${e}` : `down ${e}, up ${e}` },
    { op: '→', expr: `${fmt(round * other)} + ${e * e} = ${fmt(round * other + e * e)}`, note: `${round}×${other}, ${e}²` },
  ];
}

/** 596² with the bottom 4-strip stood up on the right: 600 × 592 plus a 4 × 4 overhang. */
function diagram(): string {
  const a = 596, d = 4;
  const S = 110, D = 22, M = S - D, x0 = 36, y0 = 34;
  let b = rect(x0, y0, S, M, 'f-raised s-ink');
  b += rect(x0, y0 + M, S, D, 'f-soft s-accent');
  b += text(x0 + S / 2, y0 - 14, a, 't t-dim');
  b += text(x0 - 8, y0 + M / 2, a - d, 't t-dim t-end');
  b += text(x0 - 8, y0 + M + D / 2, d, 't t-accent t-end');
  b += text(x0 + S / 2, y0 + M + D / 2, `${a} × ${d}`, 't t-sm t-accent');
  b += text(x0 + S / 2, y0 + S + 24, `${a}²`, 't t-sm');

  const ay = y0 + M + D / 2;
  b += line(x0 + S + 8, ay, x0 + S + 32, ay, 's-accent');
  b += arrowHead(x0 + S + 36, ay, 1, 0);

  const x1 = x0 + S + 60;
  b += rect(x1, y0, S, M, 'f-raised s-ink');
  b += rect(x1 + S, y0, D, M, 'f-soft s-accent');
  b += rect(x1 + S, y0 + M, D, D, 'f-soft s-accent s-dash');
  b += text(x1 + S + D / 2, y0 + M + D / 2, `${d}²`, 't t-sm t-accent');
  b += text(x1 + (S + D) / 2, y0 - 14, a + d, 't t-accent t-b');
  b += text(x1 - 8, y0 + M / 2, a - d, 't t-dim t-end');
  b += text(x1 + (S + D) / 2, y0 + S + 24, `${a + d} × ${a - d} + ${d}²`, 't t-sm');
  return svg(x1 + S + D + 14, y0 + S + 40, b,
    '596 squared: the 596 by 4 strip moves to the side, making 600 by 592 with a 4 by 4 square left over');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: '3-digit squares',
    category: 'mul',
    tier: 'Advanced',
    order: 160,
    idea: 'n² = (n + d)(n − d) + d², with d the distance to the nearest multiple of 100.',
  },
  card: {
    prose: [
      'Go up and down by d to the nearest hundred; that product is 1-digit × 3-digit, then zeros.',
      'Square d with an earlier method: up and down again to a multiple of 10.',
      'Add the two results.',
    ],
    example: make(596, 1),
    graphic: diagram,
    caption: 'Standing the 596 × 4 strip on the side fills a 600 × 592 rectangle and leaves a 4 × 4 square over.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(nearHundred(rng, rng.int(1, 9)), level);
    if (level === 2) return make(nearHundred(rng, nonRound(rng, 6, 25)), level);
    return make(nonRound(rng, 101, 999), level);
  },
  steps(p) {
    const { n } = p.data;
    const { up, d, round, other } = plan(n);
    const k = round / 100, prod = round * other, sq = d * d;
    const steps: Step[] = [
      { op: '', expr: `${n}²` },
      { expr: `${fmt(round)} × ${other} + ${d}²`, note: up ? `up ${d}, down ${d}` : `down ${d}, up ${d}` },
    ];
    if (k > 1 && k < 10) {
      const h = other - (other % 100), rest = other % 100;
      steps.push({ op: '→', expr: `${k} × ${other} = ${fmt(k * other)}`, note: `${k}×${h}, ${k}×${rest}` });
    }
    if (d > 9) steps.push(...smallSquare(d));
    const zeros = k === 10 ? 'append 000' : 'append 00';
    steps.push({ expr: `${fmt(prod)} + ${fmt(sq)}`, note: d > 9 ? zeros : `${zeros}, ${d}²` });
    steps.push({ expr: fmt(prod + sq) });
    return steps;
  },
});
