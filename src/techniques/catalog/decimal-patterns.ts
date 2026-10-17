import { defineTechnique } from '../define';
import { arrowHead, circle, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';

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
  1: { label: 'n/9 and n/11', bounds: { n: [1, 10], d: [9, 11], places: [4, 6] } },
  2: { label: 'n/7, n = 1–6', bounds: { n: [1, 6], d: [7, 7], places: [6, 8] } },
  3: { label: 'improper n/7 and n/99', bounds: { n: [1, 98], d: [7, 99], places: [6, 6] } },
} as const satisfies Levels;

function graphic(): string {
  const cx = 170, cy = 100, R = 58, L = 88;
  // Fraction whose decimal starts at each cycle digit.
  const starts = ['1/7', '3/7', '2/7', '6/7', '4/7', '5/7'];
  let body = circle(cx, cy, R, 'f-none s-rule');
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + 60 * i + 30) * Math.PI) / 180;
    body += arrowHead(cx + R * Math.cos(a), cy + R * Math.sin(a), -Math.sin(a), Math.cos(a), 'f-dim', 6);
  }
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    const hot = starts[i] === '5/7';
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    body += circle(x, y, 14, hot ? 'f-paper s-accent s-thick' : 'f-paper s-ink');
    body += text(x, y, CYCLE[i], hot ? 't t-b t-accent' : 't');
    body += text(cx + L * Math.cos(a), cy + L * Math.sin(a), starts[i], hot ? 't t-sm t-accent t-b' : 't t-sm t-dim');
  }
  body += text(cx, cy, '÷ 7', 't t-sm t-dim');
  body += text(cx, 208, '5/7 = 0.714285…', 't t-accent');
  return svg(
    340,
    222,
    body,
    'The digits 1 4 2 8 5 7 around a circle. Each seventh starts at a different digit: 1/7 at 1, 2/7 at 2, 3/7 at 4, 4/7 at 5, 5/7 at 7, 6/7 at 8. Reading from 7 gives 5/7 = 0.714285',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Decimal patterns: 1/7, n/9, n/11',
    category: 'div',
    tier: 'Core',
    order: 40,
    idea: 'n/9 repeats n, n/11 repeats 9n, and every seventh is the 142857 cycle from a different start.',
  },
  card: {
    prose: [
      'n/9 = n × 0.111… repeats n; n/11 = 9n/99 repeats the two digits of 9n; n/99 repeats n itself.',
      'Each proper seventh reads 142857 cyclically, starting at its first decimal: 10n ÷ 7, rounded down.',
      'For a larger numerator split off the whole part first: 23/7 = 3 + 2/7.',
    ],
    example: make(5, 7, 6, 2),
    graphic,
    caption: 'All six sevenths share one cycle; 50 ÷ 7 = 7 r 1 says 5/7 begins at the 7.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      return rng.chance(0.45) ? make(rng.int(1, 8), 9, 4, level) : make(rng.int(1, 10), 11, 6, level);
    }
    if (level === 2) return make(rng.int(1, 6), 7, rng.pick([6, 8]), level);
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
    if (whole > 0) {
      steps.push({ op: '→', expr: `${n} = ${d} × ${whole} + ${k}`, note: `whole part ${whole}` });
      steps.push({ expr: `${whole} + ${k}/${d}` });
    }
    const dec = patternDecimals(k, d, places);
    if (d === 9) {
      steps.push({ op: '→', expr: '1/9 = 0.111…', note: 'n/9 = n × 1/9' });
      steps.push({ op: '→', expr: `${k} × 0.111… = 0.${repeat(String(k), 3)}…`, note: `repeat ${k}` });
    } else if (d === 11) {
      steps.push({ op: '→', expr: `${k}/11 = ${9 * k}/99`, note: 'times 9/9' });
      steps.push({ op: '→', expr: `${9 * k}/99 = 0.${repeat(pad2(9 * k), 4)}…`, note: `repeat ${pad2(9 * k)}` });
    } else if (d === 99) {
      steps.push({ op: '→', expr: '1/99 = 0.0101…', note: 'n/99 = n × 1/99' });
      steps.push({ op: '→', expr: `${k}/99 = 0.${repeat(pad2(k), 4)}…`, note: `repeat ${pad2(k)}` });
    } else {
      const first = Math.floor((10 * k) / 7);
      steps.push({ op: '→', expr: `${10 * k} ÷ 7 = ${first} r ${10 * k - 7 * first}`, note: `first decimal ${first}` });
      steps.push({ op: '→', expr: `${k}/7 = 0.${rotate(first)}…`, note: `142857 from the ${first}` });
      if (places > 6) steps.push({ op: '→', expr: `${rotate(first)} ${dec.slice(6)}`, note: 'wrap around' });
    }
    steps.push({ op: '≈', expr: `${whole}.${dec}`, note: `first ${places} decimals` });
    return steps;
  },
  reference(p) {
    const { n, d, places } = p.data;
    const f = 10 ** places;
    return Math.floor((n * f) / d) / f;
  },
});
