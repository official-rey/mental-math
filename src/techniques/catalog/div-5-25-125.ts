import { defineTechnique } from '../define';
import { line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, nonRound, scaled } from '../util';

const ID = 'div-5-25-125';

/** d → [multiplier, power of ten]: 5 = 10/2, 25 = 100/4, 125 = 1000/8. */
const RULE: Record<number, [number, number]> = { 5: [2, 1], 25: [4, 2], 125: [8, 3] };

function make(n: number, d: number, level: Level): Problem {
  const [k, places] = RULE[d];
  return { technique: ID, level, text: `${fmt(n)} ÷ ${d}`, answer: scaled(n * k, places), data: { n, d } };
}

const levels = {
  1: { label: '2–3-digit ÷ 5', bounds: { n: [11, 999], d: [5, 5] } },
  2: { label: '2–3-digit ÷ 25', bounds: { n: [11, 999], d: [25, 25] } },
  3: { label: '3–4-digit ÷ 25 or 125', bounds: { n: [101, 9999], d: [25, 125] } },
} as const satisfies Levels;

const POINT = ['', 'point 1 left', 'point 2 left', 'point 3 left'];

/** A square split into k × k cells with the top-left `s × s` block shaded. */
function grid(x: number, y: number, size: number, k: number, s: number): string {
  const c = size / k;
  let body = rect(x, y, size, size, 'f-raised');
  body += rect(x, y, c * s, c * s, 'f-accent');
  for (let i = 1; i < k; i++) {
    body += line(x + i * c, y, x + i * c, y + size, 's-rule s-thin');
    body += line(x, y + i * c, x + size, y + i * c, 's-rule s-thin');
  }
  body += rect(x, y, size, size, 'f-none s-ink');
  return body;
}

function graphic(): string {
  let body = '';
  body += grid(30, 16, 110, 5, 1);
  body += grid(200, 16, 110, 10, 2);
  body += text(170, 71, '=', 't t-xl');
  body += text(85, 144, '1/25', 't t-b');
  body += text(255, 144, '4/100', 't t-b');
  body += text(170, 180, '37 ÷ 25 = 37 × 4 ÷ 100 = 1.48', 't t-accent');
  return svg(
    340,
    196,
    body,
    'A square cut into 25 cells next to the same square cut into 100 cells: one twenty-fifth covers four hundredths, so 37 divided by 25 is 148 hundredths, 1.48',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Dividing by 5, 25 and 125',
    category: 'div',
    tier: 'Foundation',
    order: 20,
    idea: 'Dividing by 5, 25 or 125 is multiplying by 2, 4 or 8 and shifting the point.',
  },
  card: {
    prose: [
      '5 = 10/2, 25 = 100/4 and 125 = 1,000/8, so each division turns into a small multiplication.',
      '÷5: double, then ÷10. ÷25: double twice, then ÷100. ÷125: double three times, then ÷1,000.',
    ],
    example: make(37, 25, 2),
    graphic,
    caption: 'One cell of 25 is the same area as four cells of 100, so dividing by 25 counts hundredths, four at a time.',
  },
  levels,
  generate(rng, level) {
    const { n } = levels[level].bounds;
    const d = level === 1 ? 5 : level === 2 ? 25 : rng.chance(0.7) ? 125 : 25;
    return make(nonRound(rng, n[0], n[1]), d, level);
  },
  steps(p) {
    const { n, d } = p.data;
    const [k, places] = RULE[d];
    const pow = 10 ** places;
    const steps: Step[] = [{ op: '', expr: `${fmt(n)} ÷ ${d}` }];
    steps.push({ expr: `${fmt(n)} × ${k} ÷ ${fmt(pow)}`, note: `÷${d} = ×${k} ÷${fmt(pow)}` });
    let v = n;
    for (let i = 0; i < Math.log2(k); i++) {
      steps.push({ op: '→', expr: `${fmt(v)} × 2 = ${fmt(v * 2)}`, note: i === 0 ? 'double' : 'double again' });
      v *= 2;
    }
    steps.push({ expr: `${fmt(v)} ÷ ${fmt(pow)}` });
    steps.push({ expr: fmt(scaled(v, places)), note: POINT[places] });
    return steps;
  },
});
