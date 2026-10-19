import { defineTechnique } from '../define';
import { arrowHead, path, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt } from '../util';

const ID = 'short-division';

interface Column {
  /** Working number read at this digit: carried remainder in front of the digit. */
  w: number;
  q: number;
  r: number;
}

/** Left-to-right pass: each remainder is carried in front of the next digit. */
function columns(n: number, d: number): Column[] {
  let r = 0;
  return digits(n).map((a) => {
    const w = 10 * r + a;
    const q = Math.floor(w / d);
    r = w - q * d;
    return { w, q, r };
  });
}

/** Quotient read off the written digits (leading zeros are never written). */
function quotient(cols: Column[]): number {
  return Number(cols.map((c) => c.q).join(''));
}

function make(n: number, d: number, level: Level): Problem {
  const q = quotient(columns(n, d));
  return { technique: ID, level, text: `${fmt(n)} ÷ ${d}`, answer: String(q), data: { n, d, q } };
}

const levels = {
  1: { label: '2-digit ÷ 2–5, one carry', bounds: { n: [20, 99], d: [2, 5], q: [10, 49] } },
  2: { label: '3-digit ÷ 2–5', bounds: { n: [100, 999], d: [2, 5], q: [20, 499] } },
  3: { label: '4-digit ÷ 3–9', bounds: { n: [1000, 9999], d: [3, 9], q: [112, 3333] } },
  4: { label: '5-digit ÷ 6–9', bounds: { n: [10000, 99999], d: [6, 9], q: [1112, 16666] } },
  5: { label: '6-digit ÷ 6–9', bounds: { n: [100000, 999999], d: [6, 9], q: [11112, 166666] } },
  6: { label: '6-digit ÷ 12–15', bounds: { n: [100000, 999999], d: [12, 15], q: [6667, 83333] } },
} as const satisfies Levels;

/** Number of carries that are not zero, excluding the final (zero) remainder. */
const carries = (n: number, d: number) => columns(n, d).slice(0, -1).filter((c) => c.r > 0).length;

/** Fewest non-zero carries a problem needs at each level. */
const NEED: Record<Level, number> = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3 };

function pick(rng: Rng, level: Level): Problem {
  const { n, d, q } = levels[level].bounds;
  for (;;) {
    const dv = rng.int(d[0], d[1]);
    const lo = Math.max(q[0], Math.ceil(n[0] / dv)), hi = Math.min(q[1], Math.floor(n[1] / dv));
    const qv = rng.int(lo, hi);
    const nv = qv * dv;
    if (nv % 10 === 0) continue;
    if (carries(nv, dv) < NEED[level]) continue;
    return make(nv, dv, level);
  }
}

function graphic(): string {
  // 756 ÷ 4 = 189: carries 3 and 3.
  const xs = [130, 190, 250];
  const dividend = [7, 5, 6];
  const quot = [1, 8, 9];
  const carry = ['', '3', '3'];
  const reads = ['7 ÷ 4', '35 ÷ 4', '36 ÷ 4'];
  const outs = ['1 r 3', '8 r 3', '9 r 0'];
  let body = '';
  body += text(58, 96, 4, 't t-xl');
  body += path('M84,68 Q98,94 84,122 M84,68 L286,68', 's-ink s-thick f-none');
  xs.forEach((x, i) => {
    body += text(x, 42, quot[i], 't t-xl t-b t-accent');
    body += text(x, 96, dividend[i], 't t-xl');
    if (carry[i]) {
      body += text(x - 17, 84, carry[i], 't t-sm t-accent t-b');
      // The remainder hops from the previous column to sit in front of this digit.
      body += path(`M${xs[i - 1] + 14},${108} Q${x - 30},${124} ${x - 20},${92}`, 's-accent f-none s-dash');
      body += arrowHead(x - 20, 92, 2, -6, 'f-accent', 6);
    }
    body += text(x, 174, reads[i], 't t-sm');
    body += text(x, 194, outs[i], 't t-sm t-dim');
  });
  return svg(
    310,
    210,
    body,
    'Short division of 756 by 4 in three numbered columns: 1, 7 divided by 4 is 1 remainder 3; 2, carry the 3 in front of 5 to make 35, 8 remainder 3; 3, carry the 3 in front of 6 to make 36, exactly 9. The quotient 189 sits above the bracket',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Short division',
    category: 'div',
    tier: 'Foundation',
    order: 10,
    idea: 'Divide one digit at a time from the left; carry each remainder in front of the next digit.',
  },
  card: {
    prose: [
      'Divide the first digit, write the answer digit above it, and keep the remainder.',
      'Carry that remainder in front of the next digit to make a new number, and divide that.',
      'Repeat to the last digit. If a number is too small to divide, write 0 and carry it all.',
    ],
    example: make(756, 4, 2),
    graphic,
    caption: 'Work the columns in order: each remainder hops in front of the next digit.',
  },
  levels,
  generate: pick,
  steps(p) {
    const { n, d } = p.data;
    const cols = columns(n, d);
    const steps: Step[] = [{ op: '', expr: `${fmt(n)} ÷ ${d}` }];
    let started = false;
    cols.forEach((c, i) => {
      const last = i === cols.length - 1;
      const expr = `${c.w} ÷ ${d} = ${c.q} r ${c.r}`;
      let note: string;
      if (!started && c.q === 0) note = `too small, carry ${c.r}`;
      else if (last) note = c.r ? `write ${c.q}, ${c.r} left over` : `write ${c.q}, nothing left`;
      else note = c.r ? `write ${c.q}, carry ${c.r}` : `write ${c.q}, nothing to carry`;
      if (c.q > 0) started = true;
      steps.push({ op: '', expr, note });
    });
    steps.push({ expr: fmt(quotient(cols)), note: 'read the top row' });
    return steps;
  },
});
