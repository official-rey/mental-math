import { defineTechnique } from '../define';
import { line, svg, text } from '../svg';
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

function graphic(): string {
  // 7,866 ÷ 23 = 342: main 2, flag 3.
  const xs = [118, 168, 218, 286];
  const dividend = [7, 8, 6, 6];
  const rem = ['', '1', '1', '0'];
  const quot = ['3', '4', '2', '0'];
  const work = ['7', '18 − 9', '16 − 12', '6 − 6'];
  let body = '';
  body += text(40, 76, 2, 't t-xl');
  body += text(58, 56, 3, 't t-lg t-accent t-b');
  body += text(46, 112, 'flag', 't t-sm t-accent');
  body += line(78, 44, 316, 44, 's-ink s-thick');
  body += line(78, 44, 78, 104, 's-ink s-thick');
  body += line(78, 104, 316, 104, 's-ink');
  body += line(252, 36, 252, 150, 's-dim s-dash');
  xs.forEach((x, i) => {
    body += text(x, 76, dividend[i], 't t-xl');
    if (rem[i]) body += text(x - 15, 64, rem[i], 't t-sm t-accent t-b');
    body += text(x, 128, quot[i], i === 3 ? 't t-lg t-dim' : 't t-lg t-b');
    body += text(x, 166, work[i], 't t-sm t-dim');
  });
  body += text(168, 20, 'quotient digits', 't t-sm t-dim');
  body += text(286, 20, 'rem.', 't t-sm t-dim');
  return svg(
    340,
    182,
    body,
    'Straight division of 7,866 by 23: main digit 2 with flag 3 raised. Columns 7, 8, 6 give quotient digits 3, 4, 2 with small remainders 1, 1 carried; each working value subtracts 3 times the previous quotient digit; the last column gives remainder 0',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Straight (flag) division',
    category: 'div',
    tier: 'Advanced',
    order: 50,
    idea: 'Divide by the tens digit only, correcting each column by the units digit times the last quotient digit.',
  },
  card: {
    prose: [
      'Write d = 10m + f: divide by the main digit m, and treat f as a flag that is paid for one column later.',
      'Each column: carried remainder and next digit, minus f × the previous quotient digit, then ÷ m.',
      'If the next column would go negative, lower the quotient digit by 1 and add m to the remainder.',
    ],
    example: make(7866, 23, 2),
    graphic,
    caption: 'For 7,866 ÷ 23: divide by 2, carry the small remainders, and subtract 3 × the last quotient digit each time.',
  },
  levels,
  generate: pick,
  steps(p) {
    const { n, d } = p.data;
    const w = run(n, d);
    const steps: Step[] = [{ op: '', expr: `${fmt(n)} ÷ ${d}` }];
    steps.push({ op: '→', expr: `main ${w.m}, flag ${w.f}` });
    for (const c of w.cols) {
      const expr = c === w.cols[0] ? `${c.w}` : `${c.gross} − ${w.f}×${c.prevQ} = ${c.w}`;
      const div = c.q === c.q0 ? `${c.q} r ${c.r}` : `${c.q0} r ${c.r0} → ${c.q} r ${c.r}`;
      steps.push({ op: '→', expr, note: `÷${w.m}: ${div}` });
    }
    const L = w.last;
    steps.push({ op: '→', expr: `${L.gross} − ${w.f}×${L.prevQ} = ${L.R}`, note: `remainder ${L.R}` });
    const qs = w.cols.map((c) => c.q);
    if (qs.some((q) => q > 9)) {
      const terms = qs.map((q, i) => {
        const place = 10 ** (qs.length - 1 - i);
        return place === 1 ? `${q}` : `${q}×${fmt(place)}`;
      });
      steps.push({ expr: terms.join(' + '), note: 'a digit over 9 carries' });
    } else {
      steps.push({ op: '→', expr: qs.join(' '), note: 'quotient digits' });
    }
    steps.push({ expr: fmt(w.quotient) });
    return steps;
  },
});
