import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'square-updown';

/** Shift to the nearest multiple of 10 (a final 5 goes up); the other factor moves the other way. */
function plan(n: number) {
  const r = n % 10;
  const up = r >= 5 ? 1 : 0;
  const d = up ? 10 - r : r;
  const round = up ? n + d : n - d;
  const other = up ? n - d : n + d;
  return { up, d, round, other };
}

function make(n: number, level: Level): Problem {
  const { up, d, round, other } = plan(n);
  return { technique: ID, level, text: `${n}²`, answer: String(round * other + d * d), data: { n, d, up } };
}

const levels = {
  1: { label: '2-digit ending in 1, 2, 8, 9', bounds: { n: [11, 99], d: [1, 2] } },
  2: { label: 'any 2-digit', bounds: { n: [11, 99], d: [1, 5] } },
  3: { label: '101² to 199²', bounds: { n: [101, 199], d: [1, 5] } },
} as const satisfies Levels;

/** a² with its bottom d-strip stood up on the right: (a + d)(a − d) plus a d × d overhang. */
function stripPicture(a: number, d: number, label: string): string {
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
  return svg(x1 + S + D + 14, y0 + S + 40, b, label);
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squaring by going up and down',
    category: 'mul',
    tier: 'Core',
    order: 70,
    idea: 'a² = (a + d)(a − d) + d², with d chosen so one factor is a multiple of 10.',
  },
  card: {
    prose: [
      'Move a up by d to the nearest multiple of 10 and down by the same d.',
      'Multiply the two new factors; one of them is round.',
      'Add back d², which is small.',
    ],
    example: make(47, 2),
    graphic: () =>
      stripPicture(47, 3, '47 squared: the 47 by 3 strip moves to the side, making 50 by 44 with a 3 by 3 square left over'),
    caption: 'Standing the 47 × 3 strip on the side fills a 50 × 44 rectangle and leaves a 3 × 3 square over.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(10 * rng.int(1, 9) + rng.pick([1, 2, 8, 9] as const), level);
    if (level === 2) {
      return make(rng.chance(0.7) ? 10 * rng.int(1, 9) + rng.int(3, 7) : nonRound(rng, 11, 99), level);
    }
    return make(nonRound(rng, 101, 199), level);
  },
  steps(p) {
    const { n } = p.data;
    const { up, d, round, other } = plan(n);
    const k = round / 10, prod = round * other, sq = d * d;
    const steps: Step[] = [
      { op: '', expr: `${n}²` },
      { expr: `${round} × ${other} + ${d}²`, note: up ? `up ${d}, down ${d}` : `down ${d}, up ${d}` },
    ];
    if (k <= 9) {
      steps.push({ expr: `${fmt(prod)} + ${sq}`, note: `${k}×${other} = ${k * other}, ${d}²` });
    } else if (k % 10 === 0) {
      const q = k / 10;
      const note = q === 1 ? `append 00, ${d}²` : `${q}×${other} = ${q * other}, ${d}²`;
      steps.push({ expr: `${fmt(prod)} + ${sq}`, note });
    } else {
      const t = k - 10;
      steps.push({
        op: '→',
        expr: `${k} × ${other} = ${fmt(other * 10)} + ${fmt(other * t)}`,
        note: `${other}×10, ${other}×${t}`,
      });
      steps.push({ op: '→', expr: `${fmt(other * 10)} + ${fmt(other * t)} = ${fmt(k * other)}` });
      steps.push({ expr: `${fmt(prod)} + ${sq}`, note: `append 0, ${d}²` });
    }
    steps.push({ expr: fmt(prod + sq) });
    return steps;
  },
});
