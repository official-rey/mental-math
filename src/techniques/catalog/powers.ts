import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, sup } from '../util';

const ID = 'powers';

function make(a: number, n: number, level: Level): Problem {
  return { technique: ID, level, text: `${a}${sup(n)}`, answer: String(a ** n), data: { a, n } };
}

const levels = {
  1: { label: '2⁶ to 2¹⁰', bounds: { a: [2, 2], n: [6, 10] } },
  2: { label: 'powers of 3, 4, 5 up to 15,625', bounds: { a: [3, 5], n: [3, 8] } },
  3: { label: 'fourth powers of 6–15', bounds: { a: [6, 15], n: [4, 4] } },
  4: { label: '2¹¹ to 2¹⁹', bounds: { a: [2, 2], n: [11, 19] } },
  5: { label: 'powers of 6–9 up to 200,000', bounds: { a: [6, 9], n: [3, 6] } },
  6: { label: 'cubes and fourth powers of 11–19', bounds: { a: [11, 19], n: [3, 4] } },
} as const satisfies Levels;

/** Exponents met on the way up to n: halve when even, take one off when odd. [3, 6, 7] for 7. */
function ladder(n: number): number[] {
  const out: number[] = [];
  for (let e = n; e > 1; e = e % 2 === 0 ? e / 2 : e - 1) out.unshift(e);
  return out;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Powers by squaring',
    category: 'pow',
    tier: 'Core',
    order: 78,
    idea: 'Squaring doubles the exponent and one more multiplication adds one; 2¹⁰ = 1,024 anchors the powers of 2.',
  },
  card: {
    prose: [
      'Squaring doubles the exponent: 3⁴ is 3² squared, 9 × 9 = 81.',
      'For an odd exponent, get to one below it, then multiply by the base once more.',
      'For big powers of 2, start from 2¹⁰ = 1,024 and multiply by the small power left over.',
    ],
    example: make(3, 7, 2),
    graphic: () =>
      chain({
        start: '3² = 9',
        moves: [
          { op: '× 3 → 3³', value: '27' },
          { op: 'square → 3⁶', value: '729' },
          { op: '× 3 → 3⁷', value: '2,187' },
        ],
        label: '3 to the 7th: 3 squared is 9, times 3 is 27, squared is 729, times 3 is 2,187',
      }),
    caption: 'Square to double the exponent; multiply once to add one.',
  },
  levels,
  generate(rng, level) {
    const { a: [a0, a1], n: [n0, n1] } = levels[level].bounds;
    const cap = level === 2 ? 15625 : level === 5 ? 200000 : Infinity;
    for (;;) {
      const a = rng.int(a0, a1), n = rng.int(n0, n1);
      if (a ** n <= cap) return make(a, n, level);
    }
  },
  steps(p) {
    const { a, n } = p.data;
    const s: Step[] = [{ op: '', expr: p.text }];
    if (a === 2 && n > 10) {
      const v = 2 ** (n - 10);
      s.push({ op: '', expr: '2¹⁰ = 1,024', note: 'worth knowing by heart' });
      s.push({ op: '', expr: `2${sup(n - 10)} = ${v}`, note: 'the small power left over' });
      s.push({ op: '', expr: `1,024 × ${v} = ${fmt(1024 * v)}`, note: `1,000 × ${v} + 24 × ${v}` });
    } else {
      for (const e of ladder(n)) {
        const prev = e % 2 === 0 ? e / 2 : e - 1;
        const v = a ** prev;
        s.push(
          e % 2 === 0
            ? { op: '', expr: `${fmt(v)}² = ${fmt(v * v)}`, note: `${a}${sup(e)}: squaring doubles the exponent` }
            : { op: '', expr: `${fmt(v)} × ${a} = ${fmt(v * a)}`, note: `${a}${sup(e)}: one more ${a}` },
        );
      }
    }
    s.push({ expr: fmt(a ** n) });
    return s;
  },
  reference: (p) => Math.pow(p.data.a, p.data.n),
});
