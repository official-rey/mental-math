import { defineTechnique } from '../define';
import { rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound, numStr } from '../util';

const ID = 'est-products';

/** Round a positive integer to two significant figures, halves up. */
function sig2(n: number): number {
  const p = 10 ** Math.max(0, String(n).length - 2);
  return Math.round(n / p) * p;
}

/** Round to s significant figures. */
const sig = (x: number, s: number) => Number(x.toPrecision(s));

/** Significant digits of a rounded number: 480 → 48, 3000 → 3. */
function mantissa(n: number): number {
  while (n >= 10 && n % 10 === 0) n /= 10;
  return n;
}

interface Plan {
  A: number;
  B: number;
  /** Product or quotient of the rounded numbers. */
  E: number;
  /** +1 when the two roundings push the estimate up, −1 down, 0 when they do not compound. */
  dir: number;
  pa: number;
  pb: number;
  corr: number;
  /** Estimate after compensation, before the final rounding. */
  C: number;
  answer: number;
}

function plan(kind: number, a: number, b: number): Plan {
  if (kind === 1) {
    const A = sig2(a);
    const E = A / b;
    return { A, B: b, E, dir: 0, pa: 0, pb: 0, corr: 0, C: E, answer: sig(E, 3) };
  }
  const A = sig2(a), B = sig2(b);
  const E = A * B;
  const sa = Math.sign(A - a), sb = Math.sign(B - b);
  const pa = Math.round((100 * Math.abs(A - a)) / A);
  const pb = Math.round((100 * Math.abs(B - b)) / B);
  const dir = sa !== 0 && sa === sb && pa + pb > 0 ? sa : 0;
  const corr = dir ? sig((E * (pa + pb)) / 100, 2) : 0;
  const C = E - dir * corr;
  return { A, B, E, dir, pa, pb, corr, C, answer: sig(C, 3) };
}

const truth = (kind: number, a: number, b: number) => (kind === 1 ? a / b : a * b);

function make(kind: number, a: number, b: number, level: Level): Problem {
  const exact = truth(kind, a, b);
  return {
    technique: ID,
    level,
    text: `${fmt(a)} ${kind === 1 ? '÷' : '×'} ${fmt(b)}`,
    answer: numStr(plan(kind, a, b).answer),
    data: { kind, a, b },
    tolerance: sig(0.05 * exact, 2),
    hint: 'within 5%',
  };
}

const levels = {
  1: { label: '3-digit × 2-digit', bounds: { kind: [0, 0], a: [101, 999], b: [11, 99] } },
  2: { label: '3-digit × 3-digit, 4-digit ÷ 2-digit', bounds: { kind: [0, 1], a: [101, 9999], b: [11, 999] } },
  3: { label: '4-digit × 3-digit, 5-digit ÷ 2-digit', bounds: { kind: [0, 1], a: [1001, 99999], b: [11, 999] } },
} as const satisfies Levels;

/** Exact rectangle 476 × 236 inside the rounded 480 × 240, error strips exaggerated. */
function diagram(): string {
  const x = 52, y = 30, w = 240, h = 120, s = 13;
  let b = '';
  b += rect(x, y, w, h, 'f-soft s-accent');
  b += rect(x, y, w - s, h - s, 'f-raised s-ink');
  b += text(x + (w - s) / 2, y + (h - s) / 2 - 10, '476 × 236', 't t-sm t-dim');
  b += text(x + (w - s) / 2, y + (h - s) / 2 + 10, '112,336', 't');
  b += text(x + (w - s) / 2, 18, '476', 't t-sm t-dim');
  b += text(x + w - s / 2, 18, '+4', 't t-sm t-accent');
  b += text(x - 8, y + (h - s) / 2, '236', 't t-sm t-dim t-end');
  b += text(x - 8, y + h - s / 2, '+4', 't t-sm t-accent t-end');
  b += text(x + w + 8, y + h / 2, '≈1%', 't t-sm t-accent t-start');
  b += text(x + (w - s) / 2, y + h + 14, '≈2%', 't t-sm t-accent');
  b += text(x + w / 2, y + h + 38, '480 × 240 = 115,200', 't t-sm t-dim');
  return svg(340, 200, b, 'The rounded 480 by 240 rectangle contains the exact 476 by 236 rectangle plus two thin strips worth about 1% and 2%');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Estimating products and quotients',
    category: 'est',
    tier: 'Core',
    order: 10,
    idea: 'Round each number to two significant figures, then undo the bias when the roundings compound.',
  },
  card: {
    prose: [
      'Each rounding moves a product by roughly its own percentage; opposite moves largely cancel.',
      'When both move the same way, take the combined percentage back off.',
      'For a quotient, round the dividend and keep the 2-digit divisor exact.',
    ],
    example: make(0, 476, 236, 2),
    graphic: diagram,
    caption: 'Rounding 476 × 236 up to 480 × 240 adds two thin strips, about 1% and 2% of the area.',
  },
  levels,
  generate(rng, level) {
    for (;;) {
      const kind = level === 1 ? 0 : rng.chance(0.6) ? 0 : 1;
      let a: number, b: number;
      if (kind === 0) {
        a = level === 3 ? nonRound(rng, 1001, 9999) : nonRound(rng, 101, 999);
        b = level === 1 ? nonRound(rng, 11, 99) : nonRound(rng, 101, 999);
      } else {
        a = level === 3 ? nonRound(rng, 10001, 99999) : nonRound(rng, 1001, 9999);
        b = nonRound(rng, 11, 99);
      }
      // Skip operands that are already two-figure numbers, and the rare cases where rounding a
      // leading 1 costs more than 3%.
      if (kind === 0 && sig2(a) === a) continue;
      if (kind === 0 && level > 1 && sig2(b) === b) continue;
      if (kind === 1 && sig2(a) === a) continue;
      const exact = truth(kind, a, b);
      if (Math.abs(plan(kind, a, b).answer - exact) > 0.03 * exact) continue;
      return make(kind, a, b, level);
    }
  },
  steps(p) {
    const { kind, a, b } = p.data;
    const q = plan(kind, a, b);
    const ans = fmt(numStr(q.answer));
    const steps: Step[] = [{ op: '', expr: p.text }];
    if (kind === 1) {
      steps.push({ op: '≈', expr: `${fmt(q.A)} ÷ ${fmt(b)}`, note: '2 sig figs' });
      const check = fmt(numStr(b * q.answer));
      steps.push({ op: '≈', expr: ans, note: `${b} × ${ans} = ${check}` });
      return steps;
    }
    steps.push({ op: '≈', expr: `${fmt(q.A)} × ${fmt(q.B)}`, note: '2 sig figs' });
    if (Math.sign(q.A - a) * Math.sign(q.B - b) < 0) {
      steps.push({ op: '→', expr: 'one up, one down', note: 'errors offset' });
    }
    const ma = mantissa(q.A), mb = mantissa(q.B);
    steps.push({ expr: fmt(q.E), note: `${ma} × ${mb} = ${fmt(ma * mb)}` });
    let current = q.E;
    if (q.dir !== 0) {
      steps.push({
        op: '→',
        expr: `both ${q.dir > 0 ? 'up' : 'down'}: ${q.pa}% + ${q.pb}%`,
        note: `about ${q.pa + q.pb}% ${q.dir > 0 ? 'high' : 'low'}`,
      });
      steps.push({
        op: '≈',
        expr: `${fmt(q.E)} ${q.dir > 0 ? '−' : '+'} ${fmt(numStr(q.corr))}`,
        note: `${q.pa + q.pb}% of ${fmt(q.E)}`,
      });
      steps.push({ expr: fmt(numStr(q.C)) });
      current = q.C;
    }
    if (current !== q.answer) steps.push({ op: '≈', expr: ans, note: '3 sig figs' });
    return steps;
  },
  reference: (p) => truth(p.data.kind, p.data.a, p.data.b),
});
