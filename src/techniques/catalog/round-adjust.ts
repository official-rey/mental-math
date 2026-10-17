import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'round-adjust';

/** a ± b with b = r − d just below the round number r. sub = 1 for subtraction. */
function make(a: number, r: number, d: number, sub: boolean, level: Level): Problem {
  const b = r - d;
  // The technique: move by the round number, then undo the overshoot.
  const answer = sub ? a - r + d : a + r - d;
  return {
    technique: ID,
    level,
    text: `${fmt(a)} ${sub ? '−' : '+'} ${fmt(b)}`,
    answer: String(answer),
    data: { a, b, r, d, sub: sub ? 1 : 0 },
  };
}

const levels = {
  1: { label: '2-digit ± 2-digit ending 9', bounds: { a: [21, 99], b: [19, 89], d: [1, 1] } },
  2: { label: '2-digit ± 2-digit ending 7–9', bounds: { a: [21, 99], b: [17, 89], d: [1, 3] } },
  3: { label: '3-digit ± 2-digit near a ten', bounds: { a: [101, 999], b: [17, 99], d: [1, 3] } },
  4: { label: '3–4-digit ± near a hundred', bounds: { a: [101, 9999], b: [196, 999], d: [1, 4] } },
  5: { label: '4-digit ± 5–12 below a hundred', bounds: { a: [1001, 9999], b: [288, 995], d: [5, 12] } },
  6: { label: '5-digit ± 5–35 below a thousand', bounds: { a: [10001, 99999], b: [1965, 9995], d: [5, 35] } },
} as const satisfies Levels;

/** Pick the first operand; for subtraction it must exceed the round number. */
function operand(rng: Rng, lo: number, hi: number, r: number, sub: boolean): number | null {
  const min = sub ? Math.max(lo, r + 1) : lo;
  return min + 1 > hi ? null : nonRound(rng, min, hi);
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Round and adjust',
    category: 'addsub',
    tier: 'Foundation',
    order: 30,
    idea: 'Round the second number up, add or take the round number, then fix by how much you rounded.',
  },
  card: {
    prose: [
      'Round the second number up to the next ten or hundred and note how much you added: 297 is 3 short of 300.',
      'Add (or take away) the round number.',
      'Fix it: after adding, take that small amount back; after taking away, give it back.',
    ],
    example: make(538, 300, 3, false, 4),
    graphic: () =>
      chain({
        start: '538',
        moves: [
          { op: '+ 300', value: '838' },
          { op: '− 3', value: '835' },
        ],
        label: '538 plus 297: 297 is 3 short of 300, so add 300 to get 838, then take back 3 to get 835',
      }),
    caption: 'For 538 + 297: add 300, then take back the 3 you rounded up by.',
  },
  levels,
  generate(rng, level) {
    for (;;) {
      const sub = rng.chance(0.5);
      if (level === 4) {
        const r = rng.int(2, 10) * 100;
        const d = rng.int(1, 4);
        const a = rng.chance(0.5) ? operand(rng, 1001, 9999, r, sub) : operand(rng, 101, 999, r, sub);
        if (a !== null) return make(a, r, d, sub, level);
        continue;
      }
      if (level === 5) {
        const r = rng.int(3, 10) * 100;
        const a = operand(rng, 1001, 9999, r, sub);
        if (a !== null) return make(a, r, rng.int(5, 12), sub, level);
        continue;
      }
      if (level === 6) {
        const r = rng.int(2, 10) * 1000;
        const a = operand(rng, 10001, 99999, r, sub);
        if (a !== null) return make(a, r, rng.int(5, 35), sub, level);
        continue;
      }
      const tens = level <= 2 ? rng.int(1, 8) : rng.int(1, 9);
      const b = tens * 10 + (level === 1 ? 9 : rng.pick([7, 8, 9]));
      const r = tens * 10 + 10;
      const a = level <= 2 ? operand(rng, 21, 99, r, sub) : operand(rng, 101, 999, r, sub);
      if (a !== null) return make(a, r, r - b, sub, level);
    }
  },
  steps(p) {
    const { a, b, r, d, sub } = p.data;
    const mid = sub ? a - r : a + r;
    const end = sub ? mid + d : mid - d;
    const steps: Step[] = [
      { op: '', expr: `${fmt(a)} ${sub ? '−' : '+'} ${fmt(b)}` },
      { op: '', expr: `${fmt(b)} + ${d} = ${fmt(r)}`, note: `round up: ${d} short` },
      sub
        ? { op: '', expr: `${fmt(a)} − ${fmt(r)} = ${fmt(mid)}`, note: `take ${fmt(r)}` }
        : { op: '', expr: `${fmt(a)} + ${fmt(r)} = ${fmt(mid)}`, note: `add ${fmt(r)}` },
      sub
        ? { op: '', expr: `${fmt(mid)} + ${d} = ${fmt(end)}`, note: `took ${d} too many: give back` }
        : { op: '', expr: `${fmt(mid)} − ${d} = ${fmt(end)}`, note: `added ${d} too many: take back` },
      { expr: fmt(end), note: 'the fixed total' },
    ];
    return steps;
  },
});
