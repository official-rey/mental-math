import { defineTechnique } from '../define';
import { chain } from '../svg';
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

/** "476 + 4 = 480" or "236 − 6 = 230". */
function roundStep(n: number, r: number, note: string): Step {
  const up = r > n;
  return { op: '', expr: `${fmt(n)} ${up ? '+' : '−'} ${fmt(Math.abs(r - n))} = ${fmt(r)}`, note };
}

/** How far a rounding moved the number, in whole percent. */
function moveNote(n: number, r: number, pct: number): string {
  return `round ${r > n ? 'up' : 'down'}, ${pct > 0 ? `about ${pct}%` : 'under 1%'}`;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Estimating products and quotients',
    category: 'est',
    tier: 'Core',
    order: 10,
    idea: 'Keep two leading digits of each number, multiply, then take off the overshoot if both went the same way.',
  },
  card: {
    prose: [
      'Round each number to its first two digits and note roughly what percent you moved it.',
      'Multiply the two-digit numbers and put the zeros back on.',
      'Both moved up: take those percents off. Both down: add them on. To divide, round only the top number.',
    ],
    example: make(0, 476, 236, 2),
    graphic: () =>
      chain({
        start: '476 × 236',
        moves: [
          { op: 'round both up', value: '480 × 240' },
          { op: 'multiply', value: '115,200' },
          { op: '− 3,500 (3%)', value: '111,700' },
          { op: 'round', value: '112,000' },
        ],
        label:
          'Estimating 476 times 236: round up to 480 times 240, multiply to 115,200, take off about 3% which is 3,500 to get 111,700, round to 112,000',
      }),
    caption: 'Round, multiply, then take back the few percent the rounding added.',
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
      steps.push(roundStep(a, q.A, 'keep 2 leading digits'));
      steps.push({ op: '', expr: `${fmt(q.A)} ÷ ${b}`, note: 'divide to 3 figures' });
      steps.push({ op: '', expr: `${b} × ${ans} = ${fmt(numStr(b * q.answer))}`, note: `check: close to ${fmt(q.A)}` });
      steps.push({ op: '≈', expr: ans, note: 'the estimate' });
      return steps;
    }
    steps.push(roundStep(a, q.A, moveNote(a, q.A, q.pa)));
    if (q.B !== b) steps.push(roundStep(b, q.B, moveNote(b, q.B, q.pb)));
    const ma = mantissa(q.A), mb = mantissa(q.B);
    const z = Math.round(Math.log10(q.E / (ma * mb)));
    steps.push({
      op: '',
      expr: `${fmt(q.A)} × ${fmt(q.B)} = ${fmt(q.E)}`,
      note: `${ma} × ${mb}, then ${z} zero${z === 1 ? '' : 's'}`,
    });
    let current = q.E;
    let fixNote = '';
    if (q.dir !== 0) {
      const k = q.pa + q.pb;
      const one = q.E / 100;
      const exact = (q.E * k) / 100;
      const callIt = exact !== q.corr ? `, call it ${fmt(numStr(q.corr))}` : '';
      steps.push({ op: '', expr: `${fmt(q.E)} ÷ 100 = ${fmt(numStr(one))}`, note: k === 1 ? `1%${callIt}` : '1%: shift two places' });
      if (k > 1) steps.push({ op: '', expr: `${fmt(numStr(one))} × ${k} = ${fmt(numStr(exact))}`, note: `${k}%${callIt}` });
      steps.push({
        op: '',
        expr: `${fmt(q.E)} ${q.dir > 0 ? '−' : '+'} ${fmt(numStr(q.corr))} = ${fmt(numStr(q.C))}`,
        note: q.dir > 0 ? 'both up: take it off' : 'both down: add it on',
      });
      current = q.C;
    } else {
      fixNote = Math.sign(q.A - a) * Math.sign(q.B - b) < 0 ? 'one up, one down: no fix' : 'no fix needed';
    }
    if (current === q.answer) steps.push({ expr: ans, note: fixNote || 'the estimate' });
    else steps.push({ op: '≈', expr: ans, note: fixNote ? 'no fix; round to 3 figures' : 'round to 3 figures' });
    return steps;
  },
  reference: (p) => truth(p.data.kind, p.data.a, p.data.b),
});
