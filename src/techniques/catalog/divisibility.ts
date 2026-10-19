import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'divisibility';

/** Takes the nearest multiple of d off s (0 ≤ s); returns the remainder. */
function takeOff(steps: Step[], s: number, d: number): number {
  const r = s % d;
  if (s >= d) steps.push({ op: '', expr: `${fmt(s)} − ${fmt(s - r)} = ${r}`, note: `take off ${fmt(s - r)} (${d} × ${(s - r) / d})` });
  return r;
}

/** Adds the digits, again and again, down to one digit. */
function digitSums(steps: Step[], n: number): number {
  let s = n;
  let first = true;
  while (s >= 10) {
    const ds = digits(s);
    const sum = ds.reduce((a, b) => a + b, 0);
    steps.push({ op: '', expr: `${ds.join(' + ')} = ${sum}`, note: first ? 'add the digits' : 'add the digits again' });
    first = false;
    s = sum;
  }
  return s;
}

const END = ['', 'last digit', 'last two digits', 'last three digits'];

/**
 * Shrinks n by the test for a simple divisor (2, 3, 4, 5, 8, 9, 10) and takes off the nearest multiple.
 * Returns the remainder, and why when no line was written (the end digits are already below d).
 */
function shrink(steps: Step[], n: number, d: number): { r: number; why?: string } {
  if (d === 3 || d === 9) return { r: takeOff(steps, digitSums(steps, n), d) };
  const places = d === 4 ? 2 : d === 8 ? 3 : 1;
  let t = n % 10 ** places;
  if (t < d) return { r: t, why: `${END[places]}, below ${d}` };
  steps.push({ op: '', expr: `${t}`, note: `keep the ${END[places]}` });
  if (d === 8 && t >= 200) {
    const u = t % 200;
    steps.push({ op: '', expr: `${t} − ${t - u} = ${u}`, note: 'drop the even hundreds' });
    t = u;
  }
  return { r: takeOff(steps, t, d) };
}

/** Divisors handled as two simple tests: [big part, small part], with d = big × small. */
const PAIRS: Record<number, [number, number]> = { 12: [4, 3], 15: [5, 3], 18: [9, 2], 24: [8, 3], 36: [9, 4], 45: [9, 5] };

/** Runs one simple test of a pair, marking its first line with the divisor it is for. */
function part(steps: Step[], n: number, d: number): number {
  const from = steps.length;
  const { r, why } = shrink(steps, n, d);
  if (steps.length === from) steps.push({ op: '', expr: String(r), note: `for ${d}: ${why ?? 'remainder'}` });
  else steps[from].note = `for ${d}: ${steps[from].note}`;
  return r;
}

/** Applies the divisibility test for d to n. Returns the worked lines and the remainder they reach. */
function work(n: number, d: number): { steps: Step[]; r: number } {
  const steps: Step[] = [{ op: '', expr: `${fmt(n)} mod ${d}` }];
  let r: number;
  let last = 'remainder';
  if (d in PAIRS) {
    // Remainder for the big part, list the choices below d, keep the one the small part agrees with.
    const [a, b] = PAIRS[d];
    const ra = part(steps, n, a);
    const choices = Array.from({ length: b }, (_, i) => ra + a * i);
    steps.push({ op: '', expr: choices.join(', '), note: `choices: ${ra} plus ${a}s, below ${d}` });
    if (b === 2) {
      r = choices.find((c) => c % 2 === n % 2)!;
      last = n % 2 ? 'last digit odd: odd one' : 'last digit even: even one';
    } else {
      const rb = part(steps, n, b);
      r = choices.find((c) => c % b === rb)!;
      last = `${r} ÷ ${b} also leaves ${rb}`;
    }
    steps.push({ expr: String(r), note: last });
    return { steps, r };
  }
  switch (d) {
    case 2:
    case 3:
    case 4:
    case 5:
    case 8:
    case 9:
    case 10: {
      const s = shrink(steps, n, d);
      r = s.r;
      if (s.why) last = s.why;
      break;
    }
    case 6: {
      const odd = n % 2;
      const r3 = takeOff(steps, digitSums(steps, n), 3);
      steps.push({ op: '', expr: `${r3} + 3 = ${r3 + 3}`, note: `choices: ${r3} or ${r3 + 3}` });
      r = r3 % 2 === odd ? r3 : r3 + 3;
      last = odd ? 'last digit odd: odd one' : 'last digit even: even one';
      break;
    }
    case 11: {
      const ds = digits(n).reverse();
      const s = ds.reduce((acc, x, i) => acc + (i % 2 ? -x : x), 0);
      const terms = ds.map((x, i) => (i === 0 ? `${x}` : `${i % 2 ? '−' : '+'} ${x}`)).join(' ');
      steps.push({ op: '', expr: `${terms} = ${fmt(s)}`, note: 'from the units: +, −, +, …' });
      if (s < 0) {
        const k = Math.ceil(-s / 11);
        steps.push({ op: '', expr: `${fmt(s)} + ${11 * k} = ${s + 11 * k}`, note: 'add 11s until not negative' });
        r = s + 11 * k;
      } else {
        r = takeOff(steps, s, 11);
      }
      break;
    }
    default: {
      // 7 and 13: right group of three minus the left group.
      const hi = Math.floor(n / 1000), lo = n % 1000;
      let v = lo - hi;
      steps.push({ op: '', expr: `${lo} − ${hi} = ${fmt(v)}`, note: 'right group − left group' });
      if (v < 0) {
        steps.push({ op: '', expr: `${fmt(v)} + 1,001 = ${v + 1001}`, note: 'below 0, so add 1,001' });
        v += 1001;
      }
      r = takeOff(steps, v, d);
    }
  }
  steps.push({ expr: String(r), note: last });
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

const DIVISORS: Record<Level, number[]> = {
  1: [2, 3, 5, 9],
  2: [3, 4, 5, 9],
  3: [6, 8, 11],
  4: [7, 13],
  5: [12, 15, 18],
  6: [24, 36, 45],
};

const levels = {
  1: { label: '2–3-digit mod 2, 3, 5, 9', bounds: { n: [10, 999], d: [2, 9] } },
  2: { label: '3–5-digit mod 3, 4, 5, 9', bounds: { n: [100, 99999], d: [3, 9] } },
  3: { label: '4–6-digit mod 6, 8, 11', bounds: { n: [1000, 999999], d: [6, 11] } },
  4: { label: '6-digit mod 7, 13', bounds: { n: [100000, 999999], d: [7, 13] } },
  5: { label: '5–6-digit mod 12, 15, 18', bounds: { n: [10000, 999999], d: [12, 18] } },
  6: { label: '6-digit mod 24, 36, 45', bounds: { n: [100000, 999999], d: [24, 45] } },
} as const satisfies Levels;

/** Number of digits a level's numbers have. */
const LENGTHS: Record<Level, readonly [number, number]> = { 1: [2, 3], 2: [3, 5], 3: [4, 6], 4: [6, 6], 5: [5, 6], 6: [6, 6] };

function graphic(): string {
  // 384,621 mod 7: groups 384 | 621, then 621 − 384 = 237, then 237 − 231 = 6.
  let body = '';
  body += rect(80, 22, 84, 38, 'f-raised s-ink', 4);
  body += rect(176, 22, 84, 38, 'f-raised s-ink', 4);
  body += text(122, 41, '384', 't t-xl');
  body += text(218, 41, '621', 't t-xl');
  body += text(122, 74, 'left', 't t-sm t-dim');
  body += text(218, 74, 'right', 't t-sm t-dim');
  body += line(122, 84, 160, 106, 's-accent') + arrowHead(160, 106, 38, 22);
  body += line(218, 84, 180, 106, 's-accent') + arrowHead(180, 106, -38, 22);
  body += text(170, 124, '621 − 384 = 237', 't');
  body += line(170, 140, 170, 158, 's-accent') + arrowHead(170, 162, 0, 1);
  body += text(170, 180, '237 − 231 = 6', 't');
  body += text(170, 200, '231 is 7 × 33', 't t-sm t-dim');
  body += rect(140, 214, 60, 34, 'f-soft s-accent', 4);
  body += text(170, 231, '6', 't t-xl t-accent t-b');
  return svg(
    340,
    256,
    body,
    'Remainder of 384,621 divided by 7: 1, split it into groups of three, 384 and 621; 2, take the left group from the right, 621 minus 384 is 237; 3, take off 231, which is 7 times 33, leaving remainder 6',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Divisibility tests',
    category: 'div',
    tier: 'Foundation',
    order: 30,
    idea: 'Shrink the number to a small one with the same remainder, then take off the nearest multiple.',
  },
  card: {
    prose: [
      'Shrink it: last digit for 2 and 5, last two for 4, last three for 8; add the digits for 3 and 9.',
      'For 11 add and subtract digits in turn from the units. For 6 use the 3 rule, then match odd or even.',
      'For 7 and 13 take the left group of three from the right one. Then take off the nearest multiple.',
    ],
    example: make(384621, 7, 4),
    graphic,
    caption: 'Split into groups of three, subtract left from right, then take off multiples of 7.',
  },
  levels,
  generate(rng, level) {
    const d = rng.pick(DIVISORS[level]);
    const [a, b] = LENGTHS[level];
    for (;;) {
      const len = rng.int(a, b);
      const n = nonRound(rng, 10 ** (len - 1), 10 ** len - 1);
      // Equal groups make the 7 and 13 test land on 0 straight away.
      if (level === 4 && Math.floor(n / 1000) === n % 1000) continue;
      return make(n, d, level);
    }
  },
  steps(p) {
    return work(p.data.n, p.data.d).steps;
  },
});
