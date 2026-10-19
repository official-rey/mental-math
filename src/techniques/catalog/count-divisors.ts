import { defineTechnique } from '../define';
import { line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, sup } from '../util';

const ID = 'count-divisors';
const PRIMES = [2, 3, 5, 7, 11, 13];
const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Prime → exponent, smallest prime first. */
function factor(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (const p of PRIMES) {
    let e = 0;
    while (n % p === 0) {
      n /= p;
      e++;
    }
    if (e) out.push([p, e]);
  }
  return out;
}

function make(n: number, level: Level): Problem {
  const count = factor(n).reduce((acc, [, e]) => acc * (e + 1), 1);
  return { technique: ID, level, text: `divisors of ${fmt(n)}`, answer: String(count), data: { n }, hint: 'how many' };
}

/** Largest exponent tried for each prime, and which primes a level uses. */
const MAX_EXP: Record<number, number> = { 2: 9, 3: 5, 5: 4, 7: 3, 11: 2, 13: 2 };
const SPEC: Record<Level, { primes: number[]; lo: number; hi: number }> = {
  1: { primes: [2, 3, 5, 7], lo: 12, hi: 100 },
  2: { primes: [2, 3, 5], lo: 100, hi: 999 },
  3: { primes: [2, 3, 5, 7], lo: 100, hi: 999 },
  4: { primes: [2, 3, 5, 7, 11], lo: 1000, hi: 9999 },
  5: { primes: [2, 3, 5, 7, 11, 13], lo: 10000, hi: 99999 },
  6: { primes: [2, 3, 5, 7, 11, 13], lo: 100000, hi: 999999 },
};

const levels = {
  1: { label: 'up to 100', bounds: { n: [12, 100] } },
  2: { label: '3-digit, primes 2, 3, 5', bounds: { n: [100, 999] } },
  3: { label: '3-digit, primes up to 7', bounds: { n: [100, 999] } },
  4: { label: '4-digit, primes up to 11', bounds: { n: [1000, 9999] } },
  5: { label: '5-digit, primes up to 13', bounds: { n: [10000, 99999] } },
  6: { label: '6-digit, primes up to 13', bounds: { n: [100000, 999999] } },
} as const satisfies Levels;

function pick(rng: Rng, level: Level): number {
  const { primes, lo, hi } = SPEC[level];
  for (;;) {
    let n = 1, kinds = 0;
    for (const p of primes) {
      // Mostly small exponents, sometimes none.
      const e = rng.chance(0.35) ? 0 : rng.int(1, MAX_EXP[p]);
      n *= p ** e;
      if (e) kinds++;
    }
    if (n >= lo && n <= hi && kinds >= 2) return n;
  }
}

/** The divisors of 360 laid out as choices: powers of 2 across, powers of 3 down, with or without the 5. */
function graphic(): string {
  const cw = 46, ch = 28, x0 = 74, y0 = 54;
  const cols = [1, 2, 4, 8], rows = [1, 3, 9];
  let b = '';
  // The "× 5" copy sits behind, shifted up and right.
  b += rect(x0 + 12, y0 - 12, cw * 4, ch * 3, 'f-paper s-rule');
  b += text(x0 + 12 + cw * 4 + 6, y0 - 4, '× 5', 't t-sm t-dim t-start');
  rows.forEach((r, i) =>
    cols.forEach((c, j) => {
      b += rect(x0 + j * cw, y0 + i * ch, cw, ch, 'f-raised s-ink');
      b += text(x0 + j * cw + cw / 2, y0 + i * ch + ch / 2, r * c, 't t-sm');
    }),
  );
  cols.forEach((_, j) => (b += text(x0 + j * cw + cw / 2, y0 - 26, `2${sup(j)}`, 't t-sm t-accent')));
  rows.forEach((_, i) => (b += text(x0 - 10, y0 + i * ch + ch / 2, `3${sup(i)}`, 't t-sm t-accent t-end')));
  b += line(x0, y0 + 3 * ch + 14, x0 + 4 * cw, y0 + 3 * ch + 14, 's-rule');
  b += text(x0 + 2 * cw, y0 + 3 * ch + 32, '4 × 3 × 2 = 24', 't t-accent t-b');
  return svg(
    340,
    190,
    b,
    'Divisors of 360 = 2³ × 3² × 5: four choices of 2s across, three choices of 3s down, and each with or without the 5: 4 × 3 × 2 = 24',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Counting divisors',
    category: 'higher',
    tier: 'Core',
    order: 30,
    idea: 'Split into prime powers, add one to each exponent, and multiply.',
  },
  card: {
    prose: [
      'Pull out each prime as many times as it goes: 360 = 2 × 2 × 2 × 3 × 3 × 5.',
      'A divisor takes anywhere from none to all of each prime: 0–3 twos, 0–2 threes, 0–1 five.',
      'Multiply the number of choices: 4 × 3 × 2 = 24 divisors.',
    ],
    example: make(360, 2),
    graphic,
    caption: '4 choices of 2s, 3 choices of 3s, with or without the 5.',
  },
  levels,
  generate(rng, level) {
    return make(pick(rng, level), level);
  },
  steps(p) {
    const n = p.data.n;
    const f = factor(n);
    const s: Step[] = [{ op: '', expr: p.text }];
    let x = n;
    f.slice(0, -1).forEach(([q, e]) => {
      const pe = q ** e;
      s.push({ op: '', expr: `${fmt(x)} ÷ ${fmt(pe)} = ${fmt(x / pe)}`, note: `${WORDS[e]} ${q}${e > 1 ? 's' : ''}: ${q}${sup(e)}` });
      x /= pe;
    });
    const [lp, le] = f[f.length - 1];
    s.push({ op: '', expr: f.map(([q, e]) => `${q}${sup(e)}`).join(' × '), note: `${fmt(x)} is ${lp}${le > 1 ? sup(le) : ''}` });
    const counts = f.map(([, e]) => e + 1);
    const total = counts.reduce((a, b) => a * b, 1);
    s.push({ op: '', expr: `${counts.join(' × ')} = ${total}`, note: 'one more than each exponent' });
    s.push({ expr: String(total) });
    return s;
  },
  reference(p) {
    let c = 0;
    for (let d = 1; d * d <= p.data.n; d++) if (p.data.n % d === 0) c += d * d === p.data.n ? 1 : 2;
    return c;
  },
});
