import { defineTechnique } from '../define';
import { arrowHead, circle, line, path, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt } from '../util';

const ID = 'decimal-patterns';
const CYCLE = '142857';

const pad2 = (k: number) => String(k).padStart(2, '0');
/** The first `len` characters of `block` repeated. */
const repeat = (block: string, len: number) => block.repeat(Math.ceil(len / block.length)).slice(0, len);
/** The sevenths cycle read from the digit c. */
const rotate = (c: number) => {
  const i = CYCLE.indexOf(String(c));
  return CYCLE.slice(i) + CYCLE.slice(0, i);
};

/** Decimal digits of n/d (n < d) by the pattern for that denominator. */
function patternDecimals(n: number, d: number, places: number): string {
  if (d === 9) return repeat(String(n), places);
  if (d === 11) return repeat(pad2(9 * n), places);
  if (d === 99) return repeat(pad2(n), places);
  return repeat(rotate(Math.floor((10 * n) / 7)), places);
}

/** Truncated decimal answer: whole part split off first, then the pattern. */
function solve(n: number, d: number, places: number): string {
  const whole = Math.floor(n / d);
  return `${whole}.${patternDecimals(n - whole * d, d, places)}`;
}

function make(n: number, d: number, places: number, level: Level): Problem {
  return {
    technique: ID,
    level,
    text: `${n}/${d}`,
    answer: solve(n, d, places),
    data: { n, d, places },
    hint: `first ${places} decimals`,
  };
}

const levels = {
  1: { label: 'n/9', bounds: { n: [1, 8], d: [9, 9], places: [4, 4] } },
  2: { label: 'n/9 and n/11', bounds: { n: [1, 10], d: [9, 11], places: [4, 6] } },
  3: { label: 'n/7, n = 1–6', bounds: { n: [1, 6], d: [7, 7], places: [6, 8] } },
  4: { label: 'improper n/7 and n/99', bounds: { n: [1, 98], d: [7, 99], places: [6, 6] } },
  5: { label: '3-digit top over 7 or 11', bounds: { n: [100, 399], d: [7, 11], places: [6, 8] } },
  6: { label: '3-digit top over 7, 11 or 99', bounds: { n: [400, 999], d: [7, 99], places: [8, 8] } },
} as const satisfies Levels;

/** A top in [lo, hi] that is not a whole number of d (and, over 99, not a plain repeated digit). */
function top(rng: Rng, lo: number, hi: number, d: number): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (n % d === 0) continue;
    if (d === 99 && (n % 99) % 11 === 0) continue;
    return n;
  }
}

/** A circled stage number. */
const badge = (x: number, y: number, i: number) => circle(x, y, 9, 'f-paper s-accent') + text(x, y, i, 't t-sm t-accent');

function graphic(): string {
  // 5/7: 50 ÷ 7 = 7 r 1, so read 142857 starting at the 7.
  const x0 = 70, w = 38, y = 112;
  const hot = CYCLE.indexOf('7');
  let body = '';
  body += badge(40, 30, 1);
  body += text(60, 30, '50 ÷ 7 = 7 r 1', 't t-start');
  body += text(60, 52, 'first decimal is 7', 't t-sm t-dim t-start');
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * w;
    body += rect(x, y - 17, w, 34, i === hot ? 'f-soft s-accent' : 'f-raised s-ink');
    body += text(x + w / 2, y, CYCLE[i], i === hot ? 't t-lg t-accent t-b' : 't t-lg');
  }
  const hx = x0 + hot * w + w / 2;
  body += badge(40, y, 2);
  body += line(hx, 62, hx, y - 24, 's-accent') + arrowHead(hx, y - 19, 0, 1);
  body += text(hx - 6, 76, 'start here', 't t-sm t-accent t-end');
  // Wrap from the end of the row back to its start.
  const xe = x0 + 6 * w, ys = y + 17;
  body += path(`M${hx},${ys} Q${hx},${ys + 30} ${(xe + x0) / 2},${ys + 30} T${x0 + w / 2},${ys + 4}`, 's-accent f-none s-dash');
  body += arrowHead(x0 + w / 2, ys + 2, -2, -6, 'f-accent', 6);
  body += text((xe + x0) / 2, ys + 44, 'then wrap round', 't t-sm t-dim');
  body += badge(40, 214, 3);
  body += text(60, 214, '5/7 = 0.714285…', 't t-lg t-accent t-b t-start');
  return svg(
    320,
    236,
    body,
    'Five sevenths: 1, 50 divided by 7 is 7 remainder 1, so the first decimal is 7; 2, find 7 in the row 1 4 2 8 5 7 and read from there, wrapping back to the start; 3, 5/7 is 0.714285 repeating',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Decimal patterns: 1/7, n/9, n/11',
    category: 'div',
    tier: 'Core',
    order: 40,
    idea: 'Ninths repeat the top number, elevenths repeat 9 times it, and sevenths read 142857 from a new start.',
  },
  card: {
    prose: [
      'Over 9, repeat the top digit. Over 99, repeat the top as two digits. Over 11, times it by 9 and repeat that.',
      'Over 7, add a 0 to the top and divide by 7 for the first decimal, then read 142857 on from that digit.',
      'If the top is bigger than the bottom, take off whole ones first and write them before the point.',
    ],
    example: make(5, 7, 6, 3),
    graphic,
    caption: 'Find the first decimal, then read the 142857 row from there, wrapping round.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(rng.int(1, 8), 9, 4, level);
    if (level === 2) {
      return rng.chance(0.45) ? make(rng.int(1, 8), 9, 4, level) : make(rng.int(1, 10), 11, 6, level);
    }
    if (level === 3) return make(rng.int(1, 6), 7, rng.pick([6, 8]), level);
    if (level === 5) {
      const d = rng.chance(0.6) ? 7 : 11;
      return make(top(rng, 100, 399, d), d, rng.pick([6, 8]), level);
    }
    if (level === 6) {
      const d = rng.pick([7, 7, 11, 99]);
      return make(top(rng, 400, 999, d), d, 8, level);
    }
    if (rng.chance(0.55)) {
      for (;;) {
        const n = rng.int(8, 69);
        if (n % 7 !== 0) return make(n, 7, 6, level);
      }
    }
    for (;;) {
      const n = rng.int(1, 98);
      if (n % 11 !== 0) return make(n, 99, 6, level);
    }
  },
  steps(p) {
    const { n, d, places } = p.data;
    const steps: Step[] = [{ op: '', expr: `${n}/${d}` }];
    const whole = Math.floor(n / d);
    const k = n - whole * d;
    if (n >= 100) {
      steps.push({ op: '', expr: `${n} ÷ ${d} = ${whole} r ${k}`, note: `${whole} whole, ${k}/${d} left` });
    } else if (whole > 0) {
      steps.push({ op: '', expr: `${n} − ${whole * d} = ${k}`, note: `${whole} whole, ${k}/${d} left` });
    }
    const dec = patternDecimals(k, d, places);
    let how: string;
    if (d === 9) how = `repeat ${k}`;
    else if (d === 99) how = `repeat ${pad2(k)}`;
    else if (d === 11) {
      steps.push({ op: '', expr: `${k} × 9 = ${9 * k}`, note: 9 * k < 10 ? 'times 9, write as 09' : 'times 9' });
      how = `repeat ${pad2(9 * k)}`;
    } else {
      const first = Math.floor((10 * k) / 7);
      steps.push({ op: '', expr: `${10 * k} ÷ 7 = ${first} r ${10 * k - 7 * first}`, note: `first decimal ${first}` });
      steps.push({ op: '', expr: rotate(first), note: `142857 read from the ${first}` });
      how = places > 6 ? 'wrap round again' : 'six digits';
    }
    steps.push({ expr: fmt(`${whole}.${dec}`), note: whole > 0 ? `${whole}, point, ${how}` : how });
    return steps;
  },
  reference(p) {
    const { n, d, places } = p.data;
    const f = 10 ** places;
    return Math.floor((n * f) / d) / f;
  },
});
