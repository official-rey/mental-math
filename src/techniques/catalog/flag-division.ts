import { defineTechnique } from '../define';
import { circle, line, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt } from '../util';

const ID = 'flag-division';

interface Column {
  /** Number formed from the carried remainder and this dividend digit (the first column: leading digits). */
  gross: number;
  /** Flag × previous quotient digit, subtracted from gross (0 in the first column). */
  minus: number;
  prevQ: number;
  /** Working value gross − minus, divided by the main digit. */
  w: number;
  q: number;
  r: number;
  /** Quotient digit the plain division gave before lowering (equals q when nothing was lowered). */
  q0: number;
  r0: number;
}

interface Work {
  m: number;
  f: number;
  cols: Column[];
  /** Final (remainder) column. */
  last: { gross: number; minus: number; prevQ: number; R: number };
  quotient: number;
}

/** Straight division of n by d = 10m + f, column by column. */
function run(n: number, d: number): Work {
  const w = columns(n, d, false);
  // A first column that ends up with quotient digit 0 is the same as reading two digits at once.
  return w.cols[0].q === 0 && digits(n).length > 2 ? columns(n, d, true) : w;
}

function columns(n: number, d: number, merge: boolean): Work {
  const m = Math.floor(d / 10), f = d % 10;
  const ds = digits(n);
  const k = ds.length;
  // Leading digits smaller than m join the next digit in the first column.
  let i = 0;
  let lead = ds[0];
  if ((merge || lead < m) && k > 2) {
    i = 1;
    lead = 10 * ds[0] + ds[1];
  }
  const cols: Column[] = [];
  let r = 0, q = 0;
  for (; i <= k - 2; i++) {
    const first = cols.length === 0;
    const gross = first ? lead : 10 * r + ds[i];
    const minus = first ? 0 : f * q;
    const prevQ = q;
    const w = gross - minus;
    const q0 = Math.floor(w / m), r0 = w - q0 * m;
    q = q0;
    r = r0;
    while (q > 0 && 10 * r + ds[i + 1] - f * q < 0) {
      q -= 1;
      r += m;
    }
    cols.push({ gross, minus, prevQ, w, q, r, q0, r0 });
  }
  const gross = 10 * r + ds[k - 1];
  const R = gross - f * q;
  const quotient = cols.reduce((acc, c) => acc * 10 + c.q, 0);
  return { m, f, cols, last: { gross, minus: f * q, prevQ: q, R }, quotient };
}

function make(n: number, d: number, level: Level): Problem {
  const w = run(n, d);
  return { technique: ID, level, text: `${fmt(n)} ÷ ${d}`, answer: String(w.quotient), data: { n, d, q: n / d } };
}

const levels = {
  1: { label: '3-digit ÷ 2-digit, flag 1–3', bounds: { n: [100, 999], d: [21, 93], q: [10, 47] } },
  2: { label: '4-digit ÷ 2-digit', bounds: { n: [1000, 9999], d: [21, 96], q: [11, 476] } },
  3: { label: '5-digit ÷ 2-digit, 3-digit quotient', bounds: { n: [10000, 99999], d: [11, 99], q: [101, 999] } },
} as const satisfies Levels;

function pick(rng: Rng, level: Level): Problem {
  const { n, q } = levels[level].bounds;
  for (;;) {
    const m = level === 3 ? rng.int(1, 9) : rng.int(2, 9);
    const f = level === 1 ? rng.int(1, 3) : level === 2 ? rng.int(1, 6) : rng.int(1, 9);
    const d = 10 * m + f;
    const lo = Math.max(q[0], Math.ceil(n[0] / d)), hi = Math.min(q[1], Math.floor(n[1] / d));
    if (lo > hi) continue;
    const qv = rng.int(lo, hi);
    if (qv % 10 === 0) continue;
    const nv = qv * d;
    const w = run(nv, d);
    // Keep only problems the column method finishes with remainder 0.
    if (w.last.R !== 0 || w.quotient !== qv) continue;
    return make(nv, d, level);
  }
}

/** A circled stage number. */
const badge = (x: number, y: number, i: number) => circle(x, y, 9, 'f-paper s-accent') + text(x, y, i, 't t-sm t-accent');

function graphic(): string {
  // 7,866 ÷ 23 = 342: divide by 2, flag 3.
  const xs = [112, 182, 252, 322];
  const dividend = [7, 8, 6, 6];
  const rem = ['', '1', '1', '0'];
  const quot = ['3', '4', '2', ''];
  const take = ['', '18 − 3×3', '16 − 3×4', '6 − 3×2'];
  const work = ['7 ÷ 2', '9 ÷ 2', '4 ÷ 2', '0'];
  let body = '';
  body += text(38, 70, 2, 't t-xl');
  body += text(56, 50, 3, 't t-lg t-accent t-b');
  body += text(44, 104, 'flag', 't t-sm t-accent');
  body += line(76, 40, 350, 40, 's-ink s-thick');
  body += line(76, 40, 76, 96, 's-ink s-thick');
  body += line(288, 32, 288, 186, 's-dim s-dash');
  xs.forEach((x, i) => {
    body += text(x, 20, quot[i] || 'rem.', quot[i] ? 't t-xl t-b t-accent' : 't t-sm t-dim');
    body += text(x, 70, dividend[i], 't t-xl');
    if (rem[i]) body += text(x - 16, 58, rem[i], 't t-sm t-accent t-b');
    body += badge(x, 124, i + 1);
    if (take[i]) body += text(x, 150, take[i], 't t-sm t-accent');
    body += text(x, 172, work[i], 't t-sm');
  });
  return svg(
    360,
    192,
    body,
    'Flag division of 7,866 by 23, dividing by 2 with flag 3. Column 1: 7 divided by 2 is 3, carry 1. Column 2: 18 minus 3 times 3 is 9, divided by 2 is 4, carry 1. Column 3: 16 minus 3 times 4 is 4, divided by 2 is 2. Column 4: 6 minus 3 times 2 is 0, nothing left. The answer is 342',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Straight (flag) division',
    category: 'div',
    tier: 'Advanced',
    order: 50,
    idea: 'Divide by the tens digit only; before each next division, take off the units digit times the last answer digit.',
  },
  card: {
    prose: [
      'Divide by the tens digit of the divisor only; its units digit is the flag, kept aside.',
      'Carry each remainder in front of the next digit, take off flag × the last answer digit, then divide.',
      'If the next column would go below zero, write one less and carry the bigger remainder.',
    ],
    example: make(7866, 23, 2),
    graphic,
    caption: 'Numbered columns in order: carry, take off the flag times the last digit, divide by 2.',
  },
  levels,
  generate: pick,
  steps(p) {
    const { n, d } = p.data;
    const w = run(n, d);
    const steps: Step[] = [{ op: '', expr: `${fmt(n)} ÷ ${d}` }];
    const carried = (g: number) => `carry ${Math.floor(g / 10)} in front of ${g % 10}`;
    const divide = (c: Column, note: string) => {
      const lowered = c.q !== c.q0;
      steps.push({
        op: '',
        expr: `${c.w} ÷ ${w.m} = ${c.q} r ${c.r}`,
        note: lowered ? `${c.q0} too big, write ${c.q}` : note,
      });
    };
    w.cols.forEach((c, i) => {
      if (i === 0) {
        divide(c, `÷ ${w.m} only, flag ${w.f}`);
        return;
      }
      steps.push({ op: '', expr: `${w.f} × ${c.prevQ} = ${c.minus}`, note: 'flag × last answer digit' });
      steps.push({ op: '', expr: `${c.gross} − ${c.minus} = ${c.w}`, note: carried(c.gross) });
      divide(c, c.r ? `write ${c.q}, carry ${c.r}` : `write ${c.q}, nothing to carry`);
    });
    const L = w.last;
    steps.push({ op: '', expr: `${w.f} × ${L.prevQ} = ${L.minus}`, note: 'flag × last answer digit' });
    steps.push({ op: '', expr: `${L.gross} − ${L.minus} = ${L.R}`, note: '0 left, so it divides' });
    const qs = w.cols.map((c) => c.q);
    if (qs.some((q) => q > 9)) {
      let acc = qs[0];
      for (const q of qs.slice(1)) {
        steps.push({ op: '', expr: `${fmt(acc * 10)} + ${q} = ${fmt(acc * 10 + q)}`, note: q > 9 ? 'digit over 9 carries' : 'next digit' });
        acc = acc * 10 + q;
      }
      steps.push({ expr: fmt(w.quotient), note: 'the answer' });
    } else {
      steps.push({ expr: fmt(w.quotient), note: `digits ${qs.join(', ')}` });
    }
    return steps;
  },
});
