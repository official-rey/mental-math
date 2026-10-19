import { defineTechnique } from '../define';
import { circle, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, gcd } from '../util';

const ID = 'gcd-euclid';

/** Euclid by taking off: each line leaves a smaller remainder, until one divides exactly. */
function euclid(a: number, b: number): { steps: Step[]; g: number } {
  let x = Math.max(a, b), y = Math.min(a, b);
  const steps: Step[] = [];
  for (;;) {
    const q = Math.floor(x / y), r = x - q * y;
    if (r === 0) {
      steps.push({ op: '', expr: `${fmt(x)} ÷ ${fmt(y)} = ${q}`, note: `${fmt(y)} goes in exactly` });
      return { steps, g: y };
    }
    steps.push({ op: '', expr: `${fmt(x)} − ${fmt(q * y)} = ${fmt(r)}`, note: q === 1 ? `take off ${fmt(y)}` : `take off ${q} × ${fmt(y)}` });
    x = y;
    y = r;
  }
}

function make(a: number, b: number, lcm: 0 | 1, level: Level): Problem {
  const g = gcd(a, b);
  return {
    technique: ID,
    level,
    text: `${lcm ? 'lcm' : 'gcd'}(${a}, ${b})`,
    answer: String(lcm ? (a / g) * b : g),
    data: { a, b, g, lcm },
    hint: lcm ? 'least common multiple' : 'greatest common divisor',
  };
}

const levels = {
  1: { label: 'gcd, 2-digit, small factors', bounds: { a: [4, 81], b: [4, 81], g: [2, 9], lcm: [0, 0] } },
  2: { label: 'gcd, 2-digit', bounds: { a: [10, 99], b: [10, 99], g: [2, 33], lcm: [0, 0] } },
  3: { label: 'gcd, 3-digit', bounds: { a: [100, 999], b: [100, 999], g: [2, 99], lcm: [0, 0] } },
  4: { label: 'gcd, 3-digit, hidden prime factor', bounds: { a: [100, 999], b: [100, 999], g: [11, 47], lcm: [0, 0] } },
  5: { label: 'gcd, 4-digit', bounds: { a: [1000, 9999], b: [1000, 9999], g: [11, 99], lcm: [0, 0] } },
  6: { label: 'lcm, 2-digit', bounds: { a: [12, 99], b: [12, 99], g: [2, 33], lcm: [1, 1] } },
} as const satisfies Levels;

const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

/** Euclid's rectangle for gcd(391, 299): cut the biggest squares you can, in turn. */
function graphic(): string {
  const s = 0.6, X = (v: number) => 24 + v * s, Y = (v: number) => 26 + v * s;
  const badge = (x: number, y: number, n: number) => circle(x, y, 8, 'f-paper s-accent') + text(x, y, n, 't t-sm t-accent');
  let b = text(X(195.5), 12, '391', 't t-sm t-dim');
  b += rect(X(0), Y(0), 299 * s, 299 * s, 'f-raised s-ink');
  b += text(X(149.5), Y(149.5), '299', 't t-lg') + badge(X(0) + 14, Y(0) + 14, 1);
  for (let i = 0; i < 3; i++) {
    b += rect(X(299), Y(92 * i), 92 * s, 92 * s, 'f-soft s-ink');
    b += text(X(345), Y(92 * i + 46), '92', 't');
  }
  b += badge(X(299) + 12, Y(0) + 12, 2);
  for (let j = 0; j < 4; j++) b += rect(X(299 + 23 * j), Y(276), 23 * s, 23 * s, 'f-soft s-accent');
  b += badge(X(391) + 16, Y(287.5), 3);
  b += text(X(391) + 30, Y(287.5), '23', 't t-accent t-b t-start');
  return svg(
    340,
    232,
    b,
    'Euclid for 391 and 299 as a rectangle: 1, cut off a 299 square, leaving a strip 92 wide; 2, cut three 92 squares, leaving 23; 3, four 23 squares fill the rest, so the GCD is 23',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'GCD and LCM by Euclid',
    category: 'nt',
    tier: 'Core',
    order: 10,
    idea: 'Keep replacing the bigger number with what is left after taking off the smaller; when one divides exactly, that is the GCD.',
  },
  card: {
    prose: [
      'Take the smaller number off the bigger one as many times as it fits, and keep what is left.',
      'Repeat with the smaller number and that leftover. When one goes into the other exactly, it is the GCD.',
      'For the LCM, divide one number by the GCD and multiply by the other.',
    ],
    example: make(391, 299, 0, 3),
    graphic,
    caption: 'Cut off the biggest squares you can; the last square’s side, 23, is the GCD.',
  },
  levels,
  generate(rng, level) {
    const { a: [lo, hi], g: [g0, g1] } = levels[level].bounds;
    for (;;) {
      const g = level === 4 ? rng.pick(PRIMES) : rng.int(g0, g1);
      const k0 = Math.ceil(lo / g), k1 = Math.floor(hi / g);
      if (k1 - k0 < 2) continue;
      const x = rng.int(level === 1 ? 2 : k0, level === 1 ? 9 : k1), y = rng.int(level === 1 ? 2 : k0, level === 1 ? 9 : k1);
      const a = g * x, b = g * y;
      if (x === y || gcd(x, y) !== 1 || a < lo || b < lo || a > hi || b > hi) continue;
      const n = euclid(a, b).steps.length;
      if (n > 5 || (level >= 3 && level <= 5 && n < 3)) continue;
      return make(a, b, level === 6 ? 1 : 0, level);
    }
  },
  steps(p) {
    const { a, b, lcm } = p.data;
    const { steps, g } = euclid(a, b);
    const s: Step[] = [{ op: '', expr: p.text }];
    if (!lcm) return [...s, ...steps, { expr: String(g), note: 'the GCD' }];
    const big = Math.max(a, b), small = Math.min(a, b);
    return [
      ...s,
      { op: '', expr: `gcd(${a}, ${b})`, note: 'first the GCD' },
      ...steps,
      { op: '', expr: `${fmt(big)} ÷ ${g} = ${fmt(big / g)}`, note: 'one number ÷ the GCD' },
      { op: '', expr: `${fmt(big / g)} × ${fmt(small)} = ${fmt((big / g) * small)}`, note: 'times the other' },
      { expr: fmt((big / g) * small) },
    ];
  },
  reference(p) {
    const { a, b, lcm } = p.data;
    let g = 1;
    for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) g = d;
    return lcm ? (a * b) / g : g;
  },
});
