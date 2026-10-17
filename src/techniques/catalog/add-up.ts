import { defineTechnique } from '../define';
import { circle, numberLine, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'add-up';

/** The round stopping point: the next multiple of the largest power of ten that stays ≤ a. */
function stopPoint(a: number, b: number): number {
  for (let k = String(a).length - 1; k >= 1; k--) {
    const unit = 10 ** k;
    const s = Math.ceil((b + 1) / unit) * unit;
    if (s <= a) return s;
  }
  return a;
}

function make(a: number, b: number, level: Level): Problem {
  const stop = stopPoint(a, b);
  // The technique: the difference is the sum of the two hops.
  const answer = (stop - b) + (a - stop);
  return { technique: ID, level, text: `${fmt(a)} − ${fmt(b)}`, answer: String(answer), data: { a, b, gap: a - b } };
}

const levels = {
  1: { label: '2-digit, close together', bounds: { a: [21, 99], b: [12, 96], gap: [3, 19] } },
  2: { label: '2-digit, with a borrow', bounds: { a: [21, 99], b: [12, 98] } },
  3: { label: '3-digit, with borrows', bounds: { a: [201, 999], b: [101, 998] } },
  4: { label: '4-digit across a thousand', bounds: { a: [2001, 9999], b: [1001, 9998] } },
  5: { label: '5-digit across ten thousand', bounds: { a: [20001, 99999], b: [10001, 99998] } },
  6: { label: '6-digit across a hundred thousand', bounds: { a: [200001, 999999], b: [100001, 999998] } },
} as const satisfies Levels;

/** True when column subtraction of a − b would need a borrow somewhere. */
function hasBorrow(a: number, b: number): boolean {
  for (; b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    if (a % 10 < b % 10) return true;
  }
  return false;
}

/** a − b with b on the far side of a round number of size `unit`, borrowing in column subtraction. */
function pair(rng: Rng, lo: number, hi: number, gap: number, unit: number, bMin: number): [number, number] {
  for (;;) {
    const a = nonRound(rng, lo, hi);
    const b = a - rng.int(12, gap);
    if (b < bMin || b % 10 === 0) continue;
    if (Math.floor(a / unit) > Math.floor(b / unit) && hasBorrow(a, b)) return [a, b];
  }
}

/** A circled stage number. */
const stage = (x: number, y: number, n: number) => circle(x, y, 8, 'f-paper s-accent') + text(x, y, n, 't t-sm t-accent');

/** 625 − 386 as two hops up from 386, numbered, with the hops added at the bottom. */
function diagram(): string {
  const line = numberLine({
    // Schematic spacing so the short first hop stays readable.
    from: 0,
    to: 100,
    height: 160,
    marks: [
      { at: 0, label: '386' },
      { at: 22, label: '400' },
      { at: 100, label: '625' },
    ],
    hops: [
      { from: 0, to: 22, label: '+14' },
      { from: 22, to: 100, label: '+225' },
    ],
    label: 'From 386 hop up 14 to 400, then hop up 225 to 625, then add the hops: 14 plus 225 is 239',
  });
  // Hop label positions follow numberLine's layout (width 340, line at 60% height).
  const extra = stage(34, 64, 1) + stage(172, 52, 2) + stage(100, 142, 3) + text(176, 142, '14 + 225 = 239', 't t-accent t-b');
  return line.replace('</svg>', extra + '</svg>');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Subtracting by adding up',
    category: 'addsub',
    tier: 'Core',
    order: 40,
    idea: 'Count up from the smaller number to a round number, then on to the bigger one, and add the hops.',
  },
  card: {
    prose: [
      'Start at the number you take away and count up to the next round number.',
      'Count up from that round number to the bigger number.',
      'Add the two hops together. That total is the answer.',
    ],
    example: make(625, 386, 3),
    graphic: diagram,
    caption: 'Hop from 386 up to 400, hop on to 625, then add the two hops.',
  },
  levels,
  generate(rng, level) {
    if (level <= 2) {
      for (;;) {
        const a = nonRound(rng, 21, 99);
        // Level 1 keeps the numbers close, so both hops are short.
        const b = level === 1 ? a - rng.int(3, 19) : nonRound(rng, 12, a - 1);
        if (b >= 12 && b % 10 !== 0 && a % 10 < b % 10) return make(a, b, level);
      }
    }
    const [a, b] =
      level === 3
        ? pair(rng, 201, 999, 600, 100, 101)
        : level === 4
          ? pair(rng, 2001, 9999, 2500, 1000, 1001)
          : level === 5
            ? pair(rng, 20001, 99999, 30000, 10000, 10001)
            : pair(rng, 200001, 999999, 300000, 100000, 100001);
    return make(a, b, level);
  },
  steps(p) {
    const { a, b } = p.data;
    const stop = stopPoint(a, b);
    const h1 = stop - b, h2 = a - stop;
    const steps: Step[] = [
      { op: '', expr: `${fmt(a)} − ${fmt(b)}` },
      { op: '', expr: `${fmt(b)} + ${fmt(h1)} = ${fmt(stop)}`, note: `hop up to ${fmt(stop)}` },
      { op: '', expr: `${fmt(stop)} + ${fmt(h2)} = ${fmt(a)}`, note: `hop on to ${fmt(a)}` },
      { op: '', expr: `${fmt(h1)} + ${fmt(h2)} = ${fmt(h1 + h2)}`, note: 'add the two hops' },
      { expr: fmt(h1 + h2), note: 'the total of the hops' },
    ];
    return steps;
  },
});
