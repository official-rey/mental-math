import { defineTechnique } from '../define';
import { path, svg, text } from '../svg';
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
  1: { label: '3-digit ÷ 2–5', bounds: { n: [100, 999], d: [2, 5], q: [20, 499] } },
  2: { label: '4-digit ÷ 3–9', bounds: { n: [1000, 9999], d: [3, 9], q: [112, 3333] } },
  3: { label: '5-digit ÷ 6–9', bounds: { n: [10000, 99999], d: [6, 9], q: [1112, 16666] } },
} as const satisfies Levels;

/** Number of carries that are not zero, excluding the final (zero) remainder. */
const carries = (n: number, d: number) => columns(n, d).slice(0, -1).filter((c) => c.r > 0).length;

function pick(rng: Rng, level: Level): Problem {
  const { n, d } = levels[level].bounds;
  const need = level === 1 ? 1 : 2;
  for (;;) {
    const dv = rng.int(d[0], d[1]);
    const q = rng.int(Math.ceil(n[0] / dv), Math.floor(n[1] / dv));
    const nv = q * dv;
    if (nv % 10 === 0) continue;
    if (carries(nv, dv) < need) continue;
    return make(nv, dv, level);
  }
}

function graphic(): string {
  // 756 ÷ 4 = 189: carries 3 and 3.
  const xs = [120, 170, 220];
  const dividend = [7, 5, 6];
  const quot = [1, 8, 9];
  const carry = ['', '3', '3'];
  const reads = ['7 ÷ 4', '35 ÷ 4', '36 ÷ 4'];
  let body = '';
  body += text(48, 90, 4, 't t-xl');
  body += path('M76,62 Q90,88 76,116 M76,62 L256,62', 's-ink s-thick f-none');
  xs.forEach((x, i) => {
    body += text(x, 36, quot[i], 't t-xl t-b');
    body += text(x, 90, dividend[i], 't t-xl');
    if (carry[i]) body += text(x - 15, 79, carry[i], 't t-sm t-accent t-b');
    body += text(x, 138, reads[i], 't t-sm t-dim');
  });
  return svg(
    300,
    152,
    body,
    'Short division of 756 by 4: quotient 189 above the bracket, remainders 3 and 3 carried in front of the next digits',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Short division',
    category: 'div',
    tier: 'Foundation',
    order: 10,
    idea: 'Divide digit by digit from the left, carrying each remainder into the next digit.',
  },
  card: {
    prose: [
      'Divide the leading digit, write the quotient digit, and carry the remainder as a tens digit.',
      'The carry in front of the next digit makes the next working number; repeat to the end.',
      'Only one small division is ever in your head at a time.',
    ],
    example: make(756, 4, 1),
    graphic,
    caption: 'For 756 ÷ 4 the carried 3s turn 5 into 35 and 6 into 36; the quotient 189 sits above.',
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
      if (!started && c.q === 0) note = `no digit, carry ${c.r}`;
      else note = `write ${c.q}${!last && c.r ? `, carry ${c.r}` : ''}`;
      if (c.q > 0) started = true;
      steps.push({ op: '→', expr, note });
    });
    steps.push({ expr: fmt(quotient(cols)) });
    return steps;
  },
});
