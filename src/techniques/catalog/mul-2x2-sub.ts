import { defineTechnique } from '../define';
import { line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'mul-2x2-sub';

function make(a: number, b: number, level: Level): Problem {
  const up = Math.ceil(b / 10) * 10, d = up - b;
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * up - a * d), data: { a, b, up, d } };
}

/** How a × T is found for a round T: one digit product, then a shift. */
function tensNote(a: number, t: number): string {
  if (t === 10 || t === 100) return `${a} × ${t}`;
  return `${a}×${t / 10} = ${fmt((a * t) / 10)}, ×10`;
}

const levels = {
  1: { label: '2-digit × 2-digit ending 9', bounds: { a: [12, 99], b: [19, 99], d: [1, 1] } },
  2: { label: '2-digit × 2-digit ending 8–9', bounds: { a: [12, 99], b: [18, 99], d: [1, 2] } },
  3: { label: '51–99 × 2-digit ending 7–9', bounds: { a: [51, 99], b: [17, 99], d: [1, 3] } },
} as const satisfies Levels;

/** Diagonal hatching clipped to a box. */
function hatch(x: number, y: number, w: number, h: number, gap: number, cls: string): string {
  let out = '';
  for (let s = gap; s < w + h; s += gap) {
    const u0 = Math.max(0, s - h), u1 = Math.min(w, s);
    out += line(x + u0, y + h - (s - u0), x + u1, y + h - (s - u1), cls);
  }
  return out;
}

function diagram(): string {
  const x0 = 56, y0 = 36, kw = 200, sw = 44, h = 110;
  let body = text(x0 + (kw + sw) / 2, 16, '47 × 40 = 1,880', 't t-sm t-dim');
  body += rect(x0, y0, kw, h, 'f-raised s-ink');
  body += text(x0 + kw / 2, y0 + h / 2 - 12, '47 × 39', 't t-sm t-dim');
  body += text(x0 + kw / 2, y0 + h / 2 + 10, '1,833', 't t-accent t-b');
  body += hatch(x0 + kw, y0, sw, h, 10, 's-bad s-thin');
  body += rect(x0 + kw, y0, sw, h, 'f-none s-bad s-dash');
  body += rect(x0 + kw + sw / 2 - 15, y0 + h / 2 - 10, 30, 20, 'f-paper');
  body += text(x0 + kw + sw / 2, y0 + h / 2, '−47', 't t-sm t-bad t-b');
  body += text(x0 - 8, y0 + h / 2, '47', 't t-dim t-end');
  body += text(x0 + kw / 2, y0 + h + 16, '39', 't t-dim');
  body += text(x0 + kw + sw / 2, y0 + h + 16, '1', 't t-bad');
  return svg(320, y0 + h + 30, body, 'A 47 by 40 rectangle of 1,880 with a hatched 47 by 1 strip removed, leaving 47 by 39');
}

function pick(rng: Rng, level: Level): number {
  const ending = level === 1 ? 9 : level === 2 ? rng.int(8, 9) : rng.int(7, 9);
  return rng.int(1, 9) * 10 + ending;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: '2-digit × 2-digit, subtraction method',
    category: 'mul',
    tier: 'Core',
    order: 110,
    idea: 'Round a factor ending in 7, 8 or 9 up to the next ten, multiply, then remove the excess.',
  },
  card: {
    prose: [
      'Round the factor that ends in 7, 8 or 9 up to its next multiple of ten.',
      'Multiply by the round number, then subtract 1, 2 or 3 copies of the other factor.',
      'A small subtraction replaces a multiplication by a large digit.',
    ],
    example: make(47, 39, 1),
    graphic: diagram,
    caption: 'Take the full 47 × 40 rectangle, 1,880, and cut away one 47 × 1 strip.',
  },
  levels,
  generate(rng, level) {
    const { a } = levels[level].bounds;
    return make(nonRound(rng, a[0], a[1]), pick(rng, level), level);
  },
  steps(p) {
    const { a, b, up, d } = p.data;
    const big = a * up, small = a * d;
    const steps: Step[] = [{ op: '', expr: `${a} × ${b}` }];
    if (d === 1) {
      steps.push({ expr: `${a} × ${up} − ${a}`, note: `${b} = ${up} − 1` });
      steps.push({ expr: `${fmt(big)} − ${a}`, note: tensNote(a, up) });
    } else {
      steps.push({ expr: `${a} × ${up} − ${a} × ${d}`, note: `${b} = ${up} − ${d}` });
      steps.push({ expr: `${fmt(big)} − ${a} × ${d}`, note: tensNote(a, up) });
      steps.push({ expr: `${fmt(big)} − ${small}`, note: `${a} × ${d}` });
    }
    steps.push({ expr: fmt(big - small) });
    return steps;
  },
});
