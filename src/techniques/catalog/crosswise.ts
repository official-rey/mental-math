import { defineTechnique } from '../define';
import { line, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'crosswise';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit × 2-digit, digits 1–4', bounds: { a: [11, 44], b: [11, 44] } },
  2: { label: '2-digit × 2-digit', bounds: { a: [12, 99], b: [12, 99] } },
  3: { label: '3-digit × 2-digit', bounds: { a: [101, 999], b: [12, 99] } },
} as const satisfies Levels;

/** Digits of n from the right, padded to `len`. */
const rev = (n: number, len: number) => digits(n).reverse().concat(Array(len).fill(0)).slice(0, len);

/** Two-digit crosswise picture: right vertical, the cross, left vertical. */
function diagram(): string {
  const panels = ['vertically', 'crosswise', 'vertically'];
  const pairs: [number, number][][] = [[[1, 1]], [[0, 1], [1, 0]], [[0, 0]]];
  const top = [4, 3], bottom = [2, 7];
  let body = '';
  // Panels run right to left in the order you work them; draw them left to right as steps 1, 2, 3.
  panels.forEach((name, k) => {
    const ox = 14 + k * 110;
    const xs = [ox + 26, ox + 70];
    body += text(ox + 48, 14, `${k + 1}`, 't t-sm t-accent t-b');
    top.forEach((d, i) => (body += text(xs[i], 44, d, 't t-lg')));
    bottom.forEach((d, i) => (body += text(xs[i], 106, d, 't t-lg')));
    for (const [i, j] of pairs[k]) body += line(xs[i], 58, xs[j], 92, 's-accent s-thick');
    body += text(ox + 48, 134, name, 't t-sm t-dim');
  });
  return svg(344, 150, body, 'Vertically and crosswise: units times units, then the two cross products, then tens times tens');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Vertically and crosswise',
    category: 'mul',
    tier: 'Core',
    order: 140,
    idea: 'Build the product one column at a time, right to left, from the digit pairs that land in it.',
  },
  card: {
    prose: [
      'Column k of the product collects every digit pair whose places add to k.',
      'Units × units, then the two cross products, then tens × tens; carry as you go.',
      'Longer numbers just add more crossings to the middle columns.',
    ],
    example: make(43, 27, 2),
    graphic: diagram,
    caption: 'For 43 × 27: 3×7, then 4×7 + 3×2, then 4×2, each with the carry from before.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    if (level === 1) {
      const d = () => rng.int(1, 4);
      return make(d() * 10 + d(), d() * 10 + d(), level);
    }
    return make(nonRound(rng, a[0], a[1]), nonRound(rng, b[0], b[1]), level);
  },
  steps(p) {
    const { a, b } = p.data;
    const la = String(a).length, lb = String(b).length;
    const A = rev(a, la), B = rev(b, lb);
    const cols = la + lb - 1;
    const steps: Step[] = [{ op: '', expr: `${a} × ${b}` }];
    let carry = 0;
    const written: string[] = [];
    for (let k = 0; k < cols; k++) {
      const terms: string[] = [];
      let sum = 0;
      for (let i = la - 1; i >= 0; i--) {
        const j = k - i;
        if (j < 0 || j >= lb) continue;
        terms.push(`${A[i]}×${B[j]}`);
        sum += A[i] * B[j];
      }
      const total = sum + carry;
      const expr = terms.join(' + ') + (carry ? ` + ${carry}` : '') + ` = ${total}`;
      if (k === cols - 1) {
        written.unshift(String(total));
        steps.push({ op: '', expr, note: `write ${total}` });
      } else {
        written.unshift(String(total % 10));
        const nextCarry = Math.floor(total / 10);
        steps.push({ op: '', expr, note: `write ${total % 10}${nextCarry ? `, carry ${nextCarry}` : ''}` });
        carry = nextCarry;
      }
    }
    steps.push({ expr: fmt(Number(written.join(''))) });
    return steps;
  },
});
