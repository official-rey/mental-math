import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt } from '../util';

const ID = 'square-5';

function make(n: number, level: Level): Problem {
  const a = (n - 5) / 10;
  return { technique: ID, level, text: `${n}²`, answer: String(100 * a * (a + 1) + 25), data: { n, a } };
}

const levels = {
  1: { label: '15² to 95²', bounds: { n: [15, 95], a: [1, 9] } },
  2: { label: '105² to 195²', bounds: { n: [105, 195], a: [10, 19] } },
  3: { label: '3-digit ending in 5', bounds: { n: [205, 995], a: [20, 99] } },
} as const satisfies Levels;

/** 65² rearranged: move the bottom 5-strip to the side to get 60 × 70, plus the 5 × 5 corner. */
function diagram(): string {
  const A = 100, F = 24, x0 = 34, y0 = 34;
  let b = rect(x0, y0, A, A, 'f-raised s-ink');
  b += rect(x0 + A, y0, F, A, 'f-soft s-ink');
  b += rect(x0, y0 + A, A, F, 'f-soft s-accent');
  b += rect(x0 + A, y0 + A, F, F, 'f-none s-dim s-dash');
  b += text(x0 + A / 2, y0 + A / 2, '60 × 60', 't t-sm');
  b += text(x0 + A / 2, y0 + A + F / 2, '60 × 5', 't t-sm t-accent');
  b += text(x0 + A + F / 2, y0 + A + F / 2, '25', 't t-sm t-dim');
  b += text(x0 + A / 2, y0 - 14, '60', 't t-dim');
  b += text(x0 + A + F / 2, y0 - 14, '5', 't t-dim');
  b += text(x0 - 8, y0 + A / 2, '60', 't t-dim t-end');
  b += text(x0 - 8, y0 + A + F / 2, '5', 't t-dim t-end');
  b += text(x0 + (A + F) / 2, y0 + A + F + 26, '65²', 't t-sm');

  const ay = y0 + A + F / 2;
  b += line(x0 + A + F + 8, ay, x0 + A + F + 30, ay, 's-accent');
  b += arrowHead(x0 + A + F + 34, ay, 1, 0);

  const x1 = 200;
  b += rect(x1, y0, A, A, 'f-raised s-ink');
  b += rect(x1 + A, y0, F, A, 'f-soft s-ink');
  b += rect(x1 + A + F, y0, F, A, 'f-soft s-accent');
  b += rect(x1, y0 + A + 8, F, F, 'f-none s-dim s-dash');
  b += text(x1 + A / 2, y0 + A / 2, '60 × 60', 't t-sm');
  b += text(x1 + F / 2, y0 + A + 8 + F / 2, '25', 't t-sm t-dim');
  b += text(x1 + A / 2 + F, y0 - 14, '70', 't t-accent t-b');
  b += text(x1 + (A + 2 * F) / 2, y0 + A + F + 26, '60 × 70 + 25', 't t-sm');
  return svg(356, 196, b, '65 squared rearranged into a 60 by 70 rectangle plus a 5 by 5 square');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Squaring numbers ending in 5',
    category: 'mul',
    tier: 'Foundation',
    order: 50,
    idea: '(10a + 5)² = 100 · a(a + 1) + 25: multiply a by its successor and append 25.',
  },
  card: {
    prose: [
      'Strip the final 5 to get a; multiply a by a + 1.',
      'Write 25 after that product.',
      'For 3-digit numbers, a is 2-digit and a(a + 1) is the only real work.',
    ],
    example: make(65, 1),
    graphic: diagram,
    caption: 'Moving the 60 × 5 strip from the bottom to the side turns 65² into 60 × 70 plus a 5 × 5 corner.',
  },
  levels,
  generate(rng, level) {
    const { a } = levels[level].bounds;
    return make(10 * rng.int(a[0], a[1]) + 5, level);
  },
  steps(p) {
    const { n, a } = p.data;
    const b = a + 1, prod = a * b;
    const steps: Step[] = [
      { op: '', expr: `${n}²` },
      { expr: `100 × ${a} × ${b} + 25`, note: `${a}, and ${a} + 1 = ${b}` },
    ];
    if (a <= 9) {
      steps.push({ expr: `100 × ${prod} + 25`, note: `${a}×${b}` });
    } else {
      const t = b - (b % 10), u = b % 10;
      if (u === 0) {
        steps.push({ op: '→', expr: `${a} × ${b} = ${fmt(prod)}`, note: `${a}×${b / 10}, then ×10` });
      } else {
        steps.push({ op: '→', expr: `${a} × ${b} = ${fmt(a * t)} + ${fmt(a * u)}`, note: `${a}×${t}, ${a}×${u}` });
        steps.push({ op: '→', expr: `${fmt(a * t)} + ${fmt(a * u)} = ${fmt(prod)}` });
      }
      steps.push({ expr: `100 × ${fmt(prod)} + 25` });
    }
    steps.push({ expr: fmt(100 * prod + 25), note: 'append 25' });
    return steps;
  },
});
