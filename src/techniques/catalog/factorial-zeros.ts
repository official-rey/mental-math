import { defineTechnique } from '../define';
import { line, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, sup } from '../util';

const ID = 'factorial-zeros';

/** How many times p divides n!: n ÷ p, then that ÷ p, …, dropping remainders, all added. */
function legendre(n: number, p: number): number[] {
  const out: number[] = [];
  for (let q = Math.floor(n / p); q > 0; q = Math.floor(q / p)) out.push(q);
  return out;
}

function make(n: number, p: number, level: Level): Problem {
  const sum = legendre(n, p).reduce((a, b) => a + b, 0);
  return {
    technique: ID,
    level,
    text: p === 5 ? `zeros at the end of ${fmt(n)}!` : `power of ${p} in ${fmt(n)}!`,
    answer: String(sum),
    data: { n, p },
    hint: p === 5 ? undefined : `how many ${p}s divide it`,
  };
}

const levels = {
  1: { label: 'n up to 49', bounds: { n: [10, 49], p: [5, 5] } },
  2: { label: 'n 50–199', bounds: { n: [50, 199], p: [5, 5] } },
  3: { label: 'n 200–999', bounds: { n: [200, 999], p: [5, 5] } },
  4: { label: 'n 1,000–9,999', bounds: { n: [1000, 9999], p: [5, 5] } },
  5: { label: 'n 10,000–99,999', bounds: { n: [10000, 99999], p: [5, 5] } },
  6: { label: 'powers of 2, 3, 7 in n!', bounds: { n: [30, 300], p: [2, 7] } },
} as const satisfies Levels;

/** 1 to 100 with a tick at every multiple of 5; multiples of 25 stand taller. */
function graphic(): string {
  const x0 = 20, x1 = 320, y = 92;
  const X = (v: number) => x0 + (v / 100) * (x1 - x0);
  let b = line(x0, y, x1, y, 's-ink');
  for (let v = 5; v <= 100; v += 5) {
    const tall = v % 25 === 0;
    b += line(X(v), y, X(v), y - (tall ? 30 : 12), tall ? 's-accent s-thick' : 's-dim');
    if (tall) b += text(X(v), y + 14, v, 't t-sm t-accent');
  }
  b += text(x0, y + 14, '0', 't t-sm t-dim');
  b += text(170, 20, '100 ÷ 5 = 20 ticks, 20 ÷ 5 = 4 tall', 't t-sm');
  b += text(170, 130, '20 + 4 = 24 fives, so 24 zeros', 't t-accent t-b');
  return svg(340, 146, b, 'From 1 to 100 there are 20 multiples of 5, and 4 of them, the multiples of 25, give a second 5: 24 fives, so 100! ends in 24 zeros');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Zeros at the end of n!',
    category: 'nt',
    tier: 'Advanced',
    order: 40,
    idea: 'Each zero needs a 5: count multiples of 5, then of 25, 125, … by dividing by 5 again and again.',
  },
  card: {
    prose: [
      'Every zero at the end is a 2 × 5, and there are always more 2s than 5s, so count the 5s.',
      'Divide n by 5, dropping any remainder. Divide that by 5 again, and again, until it is below 5.',
      'Add up the answers. To count another prime, such as 3, divide by 3 instead.',
    ],
    example: make(100, 5, 2),
    graphic,
    caption: 'Every fifth number gives a 5; every 25th gives a second one.',
  },
  levels,
  generate(rng, level) {
    const [lo, hi] = levels[level].bounds.n;
    return make(rng.int(lo, hi), level === 6 ? rng.pick([2, 3, 7]) : 5, level);
  },
  steps(p) {
    const { n, p: q } = p.data;
    const parts = legendre(n, q);
    const s: Step[] = [{ op: '', expr: p.text }];
    let prev = n;
    parts.forEach((v, i) => {
      const exact = prev % q === 0;
      const what = i === 0 ? `multiples of ${q}` : `multiples of ${fmt(q ** (i + 1))}: one more ${q} each`;
      s.push({
        op: '',
        expr: `${fmt(v * q)} ÷ ${q} = ${fmt(v)}`,
        note: exact ? what : `${what} (${fmt(prev)} rounds down to ${fmt(v * q)})`,
      });
      prev = v;
    });
    const sum = parts.reduce((a, b) => a + b, 0);
    if (parts.length > 1) s.push({ op: '', expr: `${parts.map(fmt).join(' + ')} = ${fmt(sum)}`, note: q === 5 ? 'add them: that many 5s, that many zeros' : `add them: ${q}${sup(sum)} divides it` });
    s.push({ expr: fmt(sum) });
    return s;
  },
  reference(p) {
    const { n, p: q } = p.data;
    let count = 0;
    for (let k = q; k <= n; k += q) for (let x = k; x % q === 0; x /= q) count++;
    return count;
  },
});
