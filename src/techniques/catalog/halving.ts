import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
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

/** 48 × 5 cut in half and restacked as 24 × 10. */
function diagram(): string {
  const L = 160, H = 30, x0 = 22, y0 = 62;
  let b = rect(x0, y0, L / 2, H, 'f-raised s-ink');
  b += rect(x0 + L / 2, y0, L / 2, H, 'f-soft s-accent');
  b += line(x0 + L / 2, y0 - 6, x0 + L / 2, y0 + H + 6, 's-accent s-dash');
  b += text(x0 + L / 4, y0 + H / 2, '24 × 5', 't t-sm');
  b += text(x0 + (3 * L) / 4, y0 + H / 2, '24 × 5', 't t-sm t-accent');
  b += text(x0 + L / 2, y0 - 18, '48', 't t-dim');
  b += text(x0 - 8, y0 + H / 2, '5', 't t-dim t-end');
  b += text(x0 + L / 2, y0 + H + 30, '48 × 5', 't t-sm');

  const ay = y0 + H / 2;
  b += line(x0 + L + 8, ay, x0 + L + 34, ay, 's-accent');
  b += arrowHead(x0 + L + 38, ay, 1, 0);

  const x1 = 232, y1 = y0 + H / 2 - H;
  b += rect(x1, y1, L / 2, H, 'f-raised s-ink');
  b += rect(x1, y1 + H, L / 2, H, 'f-soft s-accent');
  b += text(x1 + L / 4, y1 + H / 2, '24 × 5', 't t-sm');
  b += text(x1 + L / 4, y1 + (3 * H) / 2, '24 × 5', 't t-sm t-accent');
  b += text(x1 + L / 4, y1 - 14, '24', 't t-dim');
  b += text(x1 + L / 2 + 8, y1 + H, '10', 't t-accent t-start');
  b += text(x1 + L / 4, y0 + H + 30, '24 × 10 = 240', 't t-sm');
  return svg(344, 150, b, 'A 48 by 5 strip cut in half and stacked into a 24 by 10 rectangle');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Multiplying by 5, 25 and 50',
    category: 'mul',
    tier: 'Foundation',
    order: 40,
    idea: 'Multiply by 5, 50 or 25 by halving or quartering, then shifting the decimal point.',
  },
  card: {
    prose: [
      '5 = 10 ÷ 2, 50 = 100 ÷ 2 and 25 = 100 ÷ 4.',
      'Halve the other factor (twice for 25), then shift one or two places.',
      'An odd number halves to a .5 or .25, which the shift absorbs.',
    ],
    example: make(48, 5, 1),
    graphic: diagram,
    caption: 'Cutting a 48 × 5 strip in half and stacking the halves gives 24 × 10: same area, easier sum.',
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
    if (m === 25) {
      const quarter = scaled(n * 25, 2);
      return [
        { op: '', expr: `${fmt(n)} × 25` },
        { expr: `${fmt(n)} ÷ 4 × 100`, note: '25 = 100 ÷ 4' },
        { expr: `${fmt(half)} ÷ 2 × 100`, note: `half of ${fmt(n)}` },
        { expr: `${fmt(quarter)} × 100`, note: `half of ${fmt(half)}` },
        { expr: fmt(n * 25), note: 'shift two places' },
      ];
    }
    const shift = m === 5 ? 10 : 100;
    const steps: Step[] = [
      { op: '', expr: `${fmt(n)} × ${m}` },
      { expr: `${fmt(n)} ÷ 2 × ${shift}`, note: `${m} = ${shift} ÷ 2` },
      { expr: `${fmt(half)} × ${shift}`, note: `half of ${fmt(n)}` },
      { expr: fmt(n * m), note: m === 5 ? 'shift one place' : 'shift two places' },
    ];
    return steps;
  },
});
