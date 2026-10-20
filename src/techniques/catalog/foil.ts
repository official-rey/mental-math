import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Rng } from '../types';
import { fmt } from '../util';

const ID = 'foil';

function make(a: number, b: number, level: Level): Problem {
  return { technique: ID, level, text: `${a} × ${b}`, answer: String(a * b), data: { a, b } };
}

const levels = {
  1: { label: 'digits 1–3', bounds: { a: [11, 33], b: [11, 33] } },
  2: { label: 'digits 1–5', bounds: { a: [11, 55], b: [11, 55] } },
  3: { label: 'any 2-digit', bounds: { a: [12, 99], b: [12, 99] } },
  4: { label: 'tens 4–9', bounds: { a: [41, 99], b: [41, 99] } },
  5: { label: 'both 61–89', bounds: { a: [61, 89], b: [61, 89] } },
  6: { label: 'big ones digits, 51–98', bounds: { a: [56, 98], b: [56, 98] } },
} as const satisfies Levels;

/** A 2-digit number from tens and ones in the given digit ranges. */
const two = (rng: Rng, tens: [number, number], ones: [number, number]) => 10 * rng.int(tens[0], tens[1]) + rng.int(ones[0], ones[1]);

const DIGITS: Record<Level, { tens: [number, number]; ones: [number, number] }> = {
  1: { tens: [1, 3], ones: [1, 3] },
  2: { tens: [1, 5], ones: [1, 5] },
  3: { tens: [1, 9], ones: [1, 9] },
  4: { tens: [4, 9], ones: [1, 9] },
  5: { tens: [6, 8], ones: [1, 9] },
  6: { tens: [5, 9], ones: [6, 8] },
};

export default defineTechnique({
  meta: {
    id: ID,
    name: 'FOIL: first, cross, last',
    category: 'mul',
    tier: 'Core',
    order: 105,
    idea: 'Tens × tens, then the two cross products, then ones × ones; add them left to right as hundreds, tens and ones.',
  },
  card: {
    prose: [
      'First: tens × tens gives the hundreds. 47 × 36: 4 × 3 = 12, so 1,200.',
      'Cross: tens × ones both ways, added, gives the tens. 4 × 6 + 7 × 3 = 45, so 450.',
      'Last: ones × ones, 7 × 6 = 42. Add left to right: 1,200 + 450 + 42 = 1,692.',
    ],
    example: make(47, 36, 3),
    graphic: () =>
      pieces({
        input: '47 × 36',
        ops: [
          { text: '4 × 3', out: '12' },
          { text: '4×6 + 7×3', out: '45' },
          { text: '7 × 6', out: '42' },
        ],
        answer: [
          { text: '1,200', from: 0 },
          { text: '+450', from: 1 },
          { text: '+42', from: 2 },
        ],
        result: '1,692',
        label: '47 times 36: first 4 times 3 is 12 hundreds; cross 4 times 6 plus 7 times 3 is 45 tens; last 7 times 6 is 42; 1,200 plus 450 plus 42 is 1,692',
      }),
    caption: 'First, cross, last: hundreds, tens, ones, added from the left.',
  },
  levels,
  generate(rng, level) {
    const { tens, ones } = DIGITS[level];
    for (;;) {
      const a = two(rng, tens, ones), b = two(rng, tens, ones);
      // Leave × 11, × 25 and numbers near 100 to their own tricks; no squares or round tens.
      if (a === b || a % 10 === 0 || b % 10 === 0 || [a, b].some((x) => x === 11 || x === 25) || (a >= 90 && b >= 90)) continue;
      // Level I: no carries anywhere.
      if (level === 1 && ((a % 10) * (b % 10) > 9 || Math.floor(a / 10) * (b % 10) + (a % 10) * Math.floor(b / 10) > 9)) continue;
      return make(a, b, level);
    }
  },
  steps(p) {
    const { a, b } = p.data;
    const [t1, u1, t2, u2] = [Math.floor(a / 10), a % 10, Math.floor(b / 10), b % 10];
    const first = t1 * t2, cross = t1 * u2 + u1 * t2, last = u1 * u2;
    const h = first * 100, t = cross * 10, sofar = h + t;
    return [
      { op: '', expr: p.text },
      { op: '', expr: `${t1} × ${t2} = ${first}`, note: `first: tens × tens, so ${fmt(h)}` },
      { op: '', expr: `${t1 * u2} + ${u1 * t2} = ${cross}`, note: `cross: ${t1}×${u2} and ${u1}×${t2}, so ${fmt(t)}` },
      { op: '', expr: `${u1} × ${u2} = ${last}`, note: 'last: ones × ones' },
      { op: '', expr: `${fmt(h)} + ${fmt(t)} = ${fmt(sofar)}`, note: 'hundreds + tens' },
      { op: '', expr: `${fmt(sofar)} + ${last} = ${fmt(a * b)}`, note: '+ ones' },
      { expr: fmt(a * b) },
    ];
  },
});
