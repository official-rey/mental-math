import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'divisibility';

/** Final reduction of a small number s (0 ≤ s) to its remainder mod d. */
function finish(steps: Step[], s: number, d: number): number {
  const r = s % d;
  steps.push({ expr: String(r), note: s < d ? `already below ${d}` : `${s} = ${d} × ${(s - r) / d} + ${r}` });
  return r;
}

/** Repeated digit sums, written as side lines; returns the final one-digit sum. */
function digitSums(steps: Step[], n: number, d: number | null, firstNote: string): number {
  let s = n;
  let first = true;
  while (s >= 10) {
    const ds = digits(s);
    const sum = ds.reduce((a, b) => a + b, 0);
    steps.push({ op: '→', expr: `${ds.join('+')} = ${sum}`, note: first ? firstNote : 'digit sum again' });
    first = false;
    s = sum;
    if (d !== null) steps.push({ expr: `${s} mod ${d}` });
  }
  return s;
}

/** Applies the divisibility test for d to n. Returns the worked lines and the remainder they reach. */
function work(n: number, d: number): { steps: Step[]; r: number } {
  const steps: Step[] = [{ op: '', expr: `${fmt(n)} mod ${d}` }];
  let r: number;
  switch (d) {
    case 2:
    case 5:
    case 10: {
      const t = n % 10;
      steps.push({ expr: `${t} mod ${d}`, note: `10 ≡ 0 (mod ${d})` });
      r = finish(steps, t, d);
      break;
    }
    case 4: {
      const t = n % 100;
      steps.push({ expr: `${t} mod 4`, note: '100 ≡ 0 (mod 4)' });
      r = finish(steps, t, 4);
      break;
    }
    case 8: {
      const t = n % 1000;
      steps.push({ expr: `${t} mod 8`, note: '1,000 ≡ 0 (mod 8)' });
      let u = t;
      if (t >= 200) {
        u = t % 200;
        steps.push({ expr: `${u} mod 8`, note: '200 ≡ 0 (mod 8)' });
      }
      r = finish(steps, u, 8);
      break;
    }
    case 3:
    case 9: {
      const s = digitSums(steps, n, d, '10 ≡ 1, so digit sum');
      r = finish(steps, s, d);
      break;
    }
    case 6: {
      const last = n % 10;
      const r2 = last % 2;
      steps.push({ op: '→', expr: `${fmt(n)} mod 2 = ${r2}`, note: `last digit ${last} ${r2 ? 'odd' : 'even'}` });
      const s = digitSums(steps, n, null, 'digit sum');
      const r3 = s % 3;
      steps.push({ op: '→', expr: `${s} mod 3 = ${r3}` });
      steps.push({ op: '→', expr: `${r3} or ${r3 + 3}`, note: `≡ ${r3} (mod 3), below 6` });
      r = r3 % 2 === r2 ? r3 : r3 + 3;
      steps.push({ expr: String(r), note: r2 ? 'the odd one' : 'the even one' });
      break;
    }
    case 11: {
      const ds = digits(n).reverse();
      const s = ds.reduce((acc, x, i) => acc + (i % 2 ? -x : x), 0);
      const terms = ds.map((x, i) => (i === 0 ? `${x}` : `${i % 2 ? '−' : '+'} ${x}`)).join(' ');
      steps.push({ op: '→', expr: `${terms} = ${fmt(s)}`, note: 'units first, 10 ≡ −1' });
      steps.push({ expr: `${fmt(s)} mod 11` });
      if (s < 0) {
        const k = Math.ceil(-s / 11);
        steps.push({ expr: `${fmt(s)} + ${k * 11}`, note: k === 1 ? 'add 11' : `add ${k} × 11` });
        r = s + 11 * k;
        steps.push({ expr: String(r) });
      } else {
        r = finish(steps, s, 11);
      }
      break;
    }
    default: {
      // 7 and 13: 1,000 ≡ −1 (mod 1,001) and 1,001 = 7 × 11 × 13.
      const hi = Math.floor(n / 1000), lo = n % 1000;
      const v = lo - hi;
      steps.push({ expr: `(${lo} − ${hi}) mod ${d}`, note: '1,000 ≡ −1 (mod 1,001)' });
      steps.push({ expr: `${fmt(v)} mod ${d}` });
      const a = Math.abs(v);
      const ra = a % d;
      steps.push({ op: '→', expr: `${a} = ${d} × ${(a - ra) / d} + ${ra}`, note: 'only 3 digits left' });
      if (v >= 0 || ra === 0) {
        r = ra;
        steps.push({ expr: String(r) });
      } else {
        steps.push({ expr: `−${ra} mod ${d}` });
        r = d - ra;
        steps.push({ expr: String(r), note: `−${ra} + ${d}` });
      }
    }
  }
  return { steps, r };
}

function make(n: number, d: number, level: Level): Problem {
  return {
    technique: ID,
    level,
    text: `${fmt(n)} mod ${d}`,
    answer: String(work(n, d).r),
    data: { n, d },
    hint: 'remainder',
  };
}

const DIVISORS: Record<Level, number[]> = { 1: [3, 4, 5, 9], 2: [6, 8, 11], 3: [7, 13] };

const levels = {
  1: { label: '3–5-digit mod 3, 4, 5, 9', bounds: { n: [100, 99999], d: [3, 9] } },
  2: { label: '4–6-digit mod 6, 8, 11', bounds: { n: [1000, 999999], d: [6, 11] } },
  3: { label: '6-digit mod 7, 13', bounds: { n: [100000, 999999], d: [7, 13] } },
} as const satisfies Levels;

function graphic(): string {
  let body = '';
  body += text(115, 14, 'thousands', 't t-sm t-dim');
  body += text(225, 14, 'units', 't t-sm t-dim');
  body += rect(70, 26, 90, 40, 'f-raised s-ink', 4);
  body += rect(180, 26, 90, 40, 'f-raised s-ink', 4);
  body += text(115, 46, '384', 't t-xl');
  body += text(225, 46, '621', 't t-xl');
  body += text(115, 82, '× 1,000 ≡ −1', 't t-sm t-accent');
  body += text(225, 82, '× 1', 't t-sm');
  body += line(115, 92, 160, 108, 's-accent');
  body += arrowHead(160, 108, 45, 16);
  body += line(225, 92, 180, 108, 's-accent');
  body += arrowHead(180, 108, -45, 16);
  body += text(170, 122, '621 − 384 = 237', 't');
  body += text(170, 150, '237 mod 7 = 6', 't t-accent t-b');
  body += text(170, 182, '1,001 = 7 × 11 × 13', 't t-sm t-dim');
  return svg(
    340,
    196,
    body,
    'The 6-digit number 384,621 split into groups 384 and 621. Since 1,000 is −1 modulo 1,001, the number has the same remainder as 621 minus 384, which is 237, and 237 mod 7 is 6',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Divisibility tests',
    category: 'div',
    tier: 'Foundation',
    order: 30,
    idea: 'Replace N by a short number with the same remainder, using what each power of 10 is mod d.',
  },
  card: {
    prose: [
      'Last digit for 2, 5, 10; last two for 4; last three for 8; digit sum for 3, 9; alternating sum for 11.',
      '6 is 2 and 3 together: parity from the last digit, the rest from the digit sum.',
      'For 7 and 13 use 1,000 ≡ −1 (mod 1,001 = 7 × 11 × 13): units group minus thousands group.',
    ],
    example: make(384621, 7, 3),
    graphic,
    caption: '384,621 = 384 × 1,000 + 621 and 1,000 ≡ −1, so it leaves the same remainder as 621 − 384.',
  },
  levels,
  generate(rng, level) {
    const d = rng.pick(DIVISORS[level]);
    if (level === 1) {
      const len = rng.int(3, 5);
      return make(nonRound(rng, 10 ** (len - 1), 10 ** len - 1), d, level);
    }
    if (level === 2) {
      const len = rng.int(4, 6);
      return make(nonRound(rng, 10 ** (len - 1), 10 ** len - 1), d, level);
    }
    for (;;) {
      const n = nonRound(rng, 100000, 999999);
      if (Math.floor(n / 1000) !== n % 1000) return make(n, d, level);
    }
  },
  steps(p) {
    return work(p.data.n, p.data.d).steps;
  },
});
