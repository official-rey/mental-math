import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, scaled, sup } from '../util';

const ID = 'logs';

/** log 2, log 3, log 5 and log 7 in thousandths: the only values to remember (log 5 = 1 − log 2). */
const LOG: Record<number, number> = { 2: 301, 3: 477, 5: 699, 7: 845 };
const PRIMES = [2, 3, 5, 7] as const;

/** N = 2^a × 3^b × 5^c × 7^d × 10^e, written as a plain number. */
function numberText(f: Record<string, number>): string {
  const m = 2 ** f.a * 3 ** f.b * 5 ** f.c * 7 ** f.d;
  return f.e >= 0 ? String(m * 10 ** f.e) : scaled(m, -f.e);
}

function thousandths(f: Record<string, number>): number {
  return LOG[2] * f.a + LOG[3] * f.b + LOG[5] * f.c + LOG[7] * f.d + 1000 * f.e;
}

function make(f: Record<string, number>, level: Level): Problem {
  return {
    technique: ID,
    level,
    text: `log ${fmt(numberText(f))}`,
    answer: scaled(thousandths(f), 3),
    data: f,
    tolerance: 0.003,
    hint: '3 decimals',
  };
}

const levels = {
  1: { label: '2, 3, 5 and a few more', bounds: { a: [0, 3], b: [0, 2], c: [0, 1], d: [0, 0], e: [0, 1] } },
  2: { label: 'made of 2s, 3s and 5s', bounds: { a: [0, 5], b: [0, 3], c: [0, 2], d: [0, 0], e: [0, 1] } },
  3: { label: 'with 7s', bounds: { a: [0, 3], b: [0, 2], c: [0, 1], d: [1, 2], e: [0, 1] } },
  4: { label: 'thousands and millions', bounds: { a: [0, 4], b: [0, 3], c: [0, 2], d: [0, 1], e: [1, 4] } },
  5: { label: 'decimals below 1', bounds: { a: [0, 3], b: [0, 2], c: [0, 2], d: [0, 1], e: [-4, -1] } },
  6: { label: 'four kinds of factor', bounds: { a: [0, 6], b: [0, 4], c: [0, 3], d: [0, 2], e: [-2, 3] } },
} as const satisfies Levels;

function pick(rng: Rng, level: Level): Record<string, number> {
  const B: Record<string, readonly [number, number]> = levels[level].bounds;
  const draw = (k: string) => rng.int(B[k][0], B[k][1]);
  for (;;) {
    const f = { a: draw('a'), b: draw('b'), c: draw('c'), d: draw('d'), e: draw('e') };
    // 2 × 5 is a 10: keep only one of them.
    if (f.a && f.c) continue;
    const kinds = [f.a, f.b, f.c, f.d].filter(Boolean).length;
    const m = 2 ** f.a * 3 ** f.b * 5 ** f.c * 7 ** f.d;
    if (m === 1) continue;
    if (level === 1 && (kinds > 2 || m > 100)) continue;
    if (level === 2 && (kinds < 2 || m > 1000)) continue;
    if (level === 3 && m > 1000) continue;
    if (level === 4 && m * 10 ** f.e > 1_000_000) continue;
    if (level === 5 && m >= 10 ** -f.e) continue;
    if (level === 6 && (kinds < 3 || m > 100_000)) continue;
    return f;
  }
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Logarithms',
    category: 'higher',
    tier: 'Advanced',
    order: 30,
    idea: 'Know log 2, log 3 and log 7; every other log is a sum of those and whole numbers.',
    signed: true,
  },
  card: {
    prose: [
      'Remember three numbers: log 2 ≈ 0.301, log 3 ≈ 0.477, log 7 ≈ 0.845. Then log 5 = 1 − 0.301 = 0.699.',
      'Break the number into 2s, 3s, 5s, 7s and 10s. Multiplying adds the logs; a power multiplies its log.',
      'Each factor of 10 adds 1, and each division by 10 takes 1 away.',
    ],
    example: make({ a: 3, b: 2, c: 0, d: 0, e: 0 }, 2),
    graphic: () =>
      chain({
        start: 'log 72',
        moves: [
          { op: '72 = 8 × 9', value: '3 log 2 + 2 log 3' },
          { op: '0.903 + 0.954', value: '1.857' },
        ],
        label: 'log 72: 72 is 8 times 9, so 3 log 2 plus 2 log 3, which is 0.903 plus 0.954, 1.857',
      }),
    caption: '72 = 2³ × 3²: three log 2s and two log 3s.',
  },
  levels,
  generate(rng, level) {
    return make(pick(rng, level), level);
  },
  steps(p) {
    const f = p.data;
    const exps: Record<number, number> = { 2: f.a, 3: f.b, 5: f.c, 7: f.d };
    const used = PRIMES.filter((q) => exps[q] > 0);
    const N = fmt(numberText(f));
    const parts = used.map((q) => `${exps[q] > 1 ? `${exps[q]} ` : ''}log ${q}`);
    if (f.e) parts.push(String(Math.abs(f.e)));
    const split = parts.map((x, i) => (i === 0 ? x : i === parts.length - 1 && f.e < 0 ? `− ${x}` : `+ ${x}`)).join(' ');
    const factors = used.map((q) => `${q}${exps[q] > 1 ? sup(exps[q]) : ''}`);
    if (f.e) factors.push(f.e > 0 ? `10${f.e > 1 ? sup(f.e) : ''}` : `÷ 10${f.e < -1 ? sup(-f.e) : ''}`);
    const s: Step[] = [{ op: '', expr: p.text }];
    // A bare log 2, 3, 5 or 7 needs no splitting.
    if (parts.length > 1 || exps[used[0]] > 1) s.push({ op: '', expr: `log ${N} = ${split}`, note: `${N} = ${factors.join(' × ').replace('× ÷', '÷')}` });
    const terms: string[] = [];
    for (const q of used) {
      const v = LOG[q] * exps[q];
      if (exps[q] > 1) s.push({ op: '', expr: `${exps[q]} × ${scaled(LOG[q], 3)} = ${scaled(v, 3)}`, note: `log ${q}${q === 5 ? ' = 1 − log 2' : ''}` });
      terms.push(scaled(v, 3));
    }
    const total = thousandths(f);
    const sumText = terms.join(' + ') + (f.e > 0 ? ` + ${f.e}` : f.e < 0 ? ` − ${-f.e}` : '');
    if (terms.length > 1 || f.e) s.push({ op: '', expr: `${sumText} = ${fmt(scaled(total, 3))}`, note: f.e ? 'add the logs, then the 10s' : 'add the logs' });
    else if (exps[used[0]] === 1) s.push({ op: '', expr: `log ${used[0]} = ${scaled(total, 3)}`, note: used[0] === 5 ? '1 − log 2' : 'one to remember' });
    s.push({ expr: fmt(scaled(total, 3)) });
    return s;
  },
  reference(p) {
    const f = p.data;
    return Math.log10(2 ** f.a * 3 ** f.b * 5 ** f.c * 7 ** f.d) + f.e;
  },
});
