import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'crosswise';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * b), data: { a, b } };
}

const levels = {
  1: { label: '2-digit × 2-digit, no carries', bounds: { a: [12, 44], b: [12, 44] } },
  2: { label: '2-digit × 2-digit, digits 1–4', bounds: { a: [11, 44], b: [11, 44] } },
  3: { label: '2-digit × 2-digit', bounds: { a: [12, 99], b: [12, 99] } },
  4: { label: '3-digit × 2-digit', bounds: { a: [101, 999], b: [12, 99] } },
  5: { label: '3-digit × 3-digit, digits 1–5', bounds: { a: [111, 555], b: [111, 555] } },
  6: { label: '3-digit × 3-digit', bounds: { a: [101, 999], b: [101, 999] } },
} as const satisfies Levels;

/** Digits of n from the right, padded to `len`. */
const rev = (n: number, len: number) => digits(n).reverse().concat(Array(len).fill(0)).slice(0, len);

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Vertically and crosswise',
    category: 'mul',
    tier: 'Core',
    order: 140,
    idea: 'Right to left, one column at a time: ones × ones, then the two cross products, then tens × tens, carrying as you go.',
  },
  card: {
    prose: [
      'Right column: multiply the ones digits. Write the last digit and carry the rest.',
      'Middle column: multiply crosswise, add both products and the carry. Write one digit, carry the rest.',
      'Left column: multiply the tens digits, add the carry, and write the whole number.',
    ],
    example: make(43, 27, 3),
    graphic: () =>
      pieces({
        input: '43 × 27',
        ops: [
          { text: '3×7', out: '21' },
          { text: '4×7+3×2+2', out: '36' },
          { text: '4×2+3', out: '11' },
        ],
        answer: [
          { text: '11', from: 2 },
          { text: '6', from: 1 },
          { text: '1', from: 0 },
        ],
        result: '1,161',
        label: '43 times 27 by columns: 3 times 7 is 21, write 1 carry 2; 4 times 7 plus 3 times 2 plus 2 is 36, write 6 carry 3; 4 times 2 plus 3 is 11; answer 1,161',
      }),
    caption: 'Work the columns right to left; each one keeps a digit and passes its carry on.',
  },
  levels,
  generate(rng, level) {
    const { a, b } = levels[level].bounds;
    if (level === 1) {
      for (;;) {
        const [a1, a0, b1, b0] = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 4), rng.int(1, 4)];
        const x = a1 * 10 + a0, y = b1 * 10 + b0;
        if (x === 11 || y === 11 || x === y) continue;
        if (a0 * b0 <= 9 && a1 * b0 + a0 * b1 <= 9) return make(x, y, level);
      }
    }
    if (level === 2) {
      const d = () => rng.int(1, 4);
      return make(d() * 10 + d(), d() * 10 + d(), level);
    }
    if (level === 5) {
      const d = () => rng.int(1, 5);
      for (;;) {
        const x = d() * 100 + d() * 10 + d(), y = d() * 100 + d() * 10 + d();
        if (x !== y && x !== 125 && y !== 125) return make(x, y, level);
      }
    }
    for (;;) {
      const x = nonRound(rng, a[0], a[1]), y = nonRound(rng, b[0], b[1]);
      if (level !== 6 || x !== y) return make(x, y, level);
    }
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
    steps.push({ expr: fmt(Number(written.join(''))), note: 'read the digits written' });
    return steps;
  },
});
