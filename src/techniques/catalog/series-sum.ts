import { defineTechnique } from '../define';
import { path, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt } from '../util';

const ID = 'series-sum';

/** a + (a + d) + … with c terms. */
function make(a: number, d: number, c: number, level: Level): Problem {
  const last = a + (c - 1) * d;
  return {
    technique: ID,
    level,
    text: `${fmt(a)} + ${fmt(a + d)} + … + ${fmt(last)}`,
    answer: String((c * (a + last)) / 2),
    data: { a, d, c },
  };
}

const levels = {
  1: { label: '1 up to 10–30', bounds: { a: [1, 1], d: [1, 1], c: [10, 30] } },
  2: { label: '1 up to 31–200', bounds: { a: [1, 1], d: [1, 1], c: [31, 200] } },
  3: { label: 'a run of whole numbers', bounds: { a: [11, 99], d: [1, 1], c: [10, 200] } },
  4: { label: 'odd or even numbers', bounds: { a: [1, 20], d: [2, 2], c: [10, 100] } },
  5: { label: 'steps of 3 to 9', bounds: { a: [1, 50], d: [3, 9], c: [10, 40] } },
  6: { label: '3-digit start, steps of 3 to 12', bounds: { a: [100, 999], d: [3, 12], c: [20, 100] } },
} as const satisfies Levels;

/** 1 + 2 + … + 100: the outside pairs all make 101. */
function graphic(): string {
  const xs: [number, string][] = [[30, '1'], [62, '2'], [94, '3'], [170, '…'], [246, '98'], [278, '99'], [310, '100']];
  let b = '';
  for (const [x, v] of xs) b += text(x, 130, v, v === '…' ? 't t-dim' : 't');
  // Outer pair highest; each label sits just above the top of its arc.
  const arcs: [number, number, number][] = [[30, 310, -14], [62, 278, 40], [94, 246, 94]];
  for (const [x1, x2, cy] of arcs) {
    b += path(`M${x1},118 Q170,${cy} ${x2},118`, 's-accent f-none');
    b += text(170, (118 + cy) / 2 - 8, '101', 't t-sm t-accent');
  }
  b += text(170, 162, '50 pairs × 101 = 5,050', 't t-accent t-b');
  return svg(340, 176, b, '1 plus 2 up to 100: 1 and 100, 2 and 99, 3 and 98 each make 101, and there are 50 pairs, so 5,050');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Adding a run of numbers',
    category: 'higher',
    tier: 'Core',
    order: 90,
    idea: 'Pair the first with the last: every pair from the outside in makes the same total.',
  },
  card: {
    prose: [
      'Count the numbers: last minus first, divided by the step, plus one.',
      'Add the first and the last. Pairs from the outside in all make that same total.',
      'Multiply half the count by that total, or the whole count by half of it.',
    ],
    example: make(1, 1, 100, 2),
    graphic,
    caption: '1 with 100, 2 with 99, 3 with 98: fifty pairs of 101.',
  },
  levels,
  generate(rng, level) {
    const { a: [a0, a1], d: [d0, d1], c: [c0, c1] } = levels[level].bounds;
    return make(rng.int(a0, a1), rng.int(d0, d1), rng.int(c0, c1), level);
  },
  steps(p) {
    const { a, d, c } = p.data;
    const last = a + (c - 1) * d;
    const pair = a + last;
    const sum = (c * pair) / 2;
    const s: Step[] = [{ op: '', expr: p.text }];
    if (a === 1 && d === 1) s.push({ op: '', expr: `${fmt(c)} numbers`, note: `1 up to ${fmt(c)}` });
    else {
      s.push({ op: '', expr: `${fmt(last)} − ${fmt(a)} = ${fmt(last - a)}`, note: 'last − first' });
      if (d > 1) s.push({ op: '', expr: `${fmt(last - a)} ÷ ${d} = ${c - 1}`, note: `÷ the step, ${d}` });
      s.push({ op: '', expr: `${c - 1} + 1 = ${c}`, note: 'one more: the count' });
    }
    s.push({ op: '', expr: `${fmt(a)} + ${fmt(last)} = ${fmt(pair)}`, note: 'first + last' });
    s.push(
      c % 2 === 0
        ? { op: '', expr: `${c / 2} × ${fmt(pair)} = ${fmt(sum)}`, note: `${c / 2} pairs` }
        : { op: '', expr: `${c} × ${fmt(pair / 2)} = ${fmt(sum)}`, note: `${c} numbers, ${fmt(pair / 2)} on average` },
    );
    s.push({ expr: fmt(sum) });
    return s;
  },
  reference(p) {
    let total = 0;
    for (let i = 0; i < p.data.c; i++) total += p.data.a + i * p.data.d;
    return total;
  },
});
