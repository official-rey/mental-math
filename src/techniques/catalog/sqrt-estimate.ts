import { defineTechnique } from '../define';
import { rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'sqrt-estimate';

interface Plan {
  a: number;
  d: number;
  /** |d| ÷ 2a in hundredths. */
  qh: number;
  /** a ± q in hundredths. */
  sh: number;
  /** Answer in tenths. */
  at: number;
}

function plan(N: number): Plan {
  const a = Math.round(Math.sqrt(N));
  const d = N - a * a;
  const qh = Math.round((Math.abs(d) * 100) / (2 * a));
  const sh = a * 100 + Math.sign(d) * qh;
  return { a, d, qh, sh, at: Math.round(sh / 10) };
}

function make(N: number, level: Level): Problem {
  const { a, at } = plan(N);
  return {
    technique: ID,
    level,
    text: `√${fmt(N)}`,
    answer: scaled(at, 1),
    data: { N, a },
    tolerance: 0.1,
    hint: '1 decimal place',
  };
}

const levels = {
  1: { label: '√ of 10–99', bounds: { N: [10, 99], a: [3, 10] } },
  2: { label: '√ of 100–999', bounds: { N: [101, 999], a: [10, 32] } },
  3: { label: '√ of 1,000–9,999', bounds: { N: [1000, 9999], a: [32, 100] } },
} as const satisfies Levels;

const RANGE: Record<Level, [number, number]> = { 1: [10, 99], 2: [101, 999], 3: [1000, 9999] };

/** Square of side 7 plus two strips of width x (exaggerated) and the dropped corner. */
function diagram(): string {
  const x0 = 24, y0 = 26, S = 120, w = 14;
  let b = '';
  b += rect(x0, y0, S, S, 'f-raised s-ink');
  b += rect(x0 + S, y0, w, S, 'f-soft s-accent');
  b += rect(x0, y0 + S, S, w, 'f-soft s-accent');
  b += rect(x0 + S, y0 + S, w, w, 'f-none s-dim s-dash');
  b += text(x0 + S / 2, y0 + S / 2, '49', 't t-lg');
  b += text(x0 + S / 2, y0 - 12, '7', 't t-sm t-dim');
  b += text(x0 + S + w / 2, y0 - 12, 'x', 't t-sm t-accent');
  b += text(x0 + S + w + 6, y0 + S / 2, '7x', 't t-sm t-accent t-start');
  b += text(x0 + S / 2, y0 + S + w + 12, '7x', 't t-sm t-accent');
  const tx = 196;
  b += text(tx, 40, '53 = 49 + 4', 't t-sm t-start');
  b += text(tx, 64, '2 × 7x ≈ 4', 't t-sm t-start');
  b += text(tx, 88, 'x ≈ 4 ÷ 14 ≈ 0.29', 't t-sm t-accent t-start');
  b += text(tx, 112, '√53 ≈ 7.29', 't t-sm t-start');
  b += text(tx, 136, 'corner x² dropped', 't t-sm t-dim t-start');
  return svg(340, 184, b, 'A 7 by 7 square of area 49 with two strips of width x along two sides; together they make 53, ignoring the tiny corner');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Estimating square roots',
    category: 'est',
    tier: 'Core',
    order: 30,
    idea: 'From the nearest square a², add the leftover divided by 2a.',
  },
  card: {
    prose: [
      'Find the perfect square a² nearest to N and the leftover d = N − a².',
      'Then √N ≈ a + d ÷ 2a; d may be negative.',
      'The estimate runs slightly high, by about d² ÷ 8a³.',
    ],
    example: make(53, 1),
    graphic: diagram,
    caption: 'Growing a 7 × 7 square by x on two sides adds about 14x, so 14x = 4 and the corner is negligible.',
  },
  levels,
  generate(rng, level) {
    const [lo, hi] = RANGE[level];
    for (;;) {
      const N = rng.int(lo, hi);
      const { a, at } = plan(N);
      if (a * a === N) continue;
      // The linear estimate plus rounding must stay within 0.1 of the true root.
      if (Math.abs(at / 10 - Math.sqrt(N)) > 0.1 - 1e-9) continue;
      return make(N, level);
    }
  },
  steps(p) {
    const N = p.data.N;
    const { a, d, qh, sh, at } = plan(N);
    const sign = d > 0 ? '+' : '−';
    const q = scaled(qh, 2);
    const s: Step[] = [
      { op: '', expr: `√${fmt(N)}` },
      { op: '→', expr: `${a}² = ${fmt(a * a)}`, note: 'nearest square' },
      { op: '→', expr: `d = ${fmt(N)} − ${fmt(a * a)} = ${d < 0 ? '−' : ''}${Math.abs(d)}`, note: 'leftover' },
      { op: '≈', expr: `${a} ${sign} ${Math.abs(d)} ÷ ${2 * a}`, note: 'a + d ÷ 2a' },
      { op: '≈', expr: `${a} ${sign} ${q}`, note: '2 decimals' },
      { expr: scaled(sh, 2) },
    ];
    if (sh !== at * 10) s.push({ op: '≈', expr: `${Math.floor(at / 10)}.${at % 10}`, note: '1 decimal place' });
    return s;
  },
  reference: (p) => Math.sqrt(p.data.N),
});
