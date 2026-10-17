import { defineTechnique } from '../define';
import { pieces } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt } from '../util';

const ID = 'nikhilam';

/** Left part, signed right part, and the final value, found the Nikhilam way. */
function solve(x: number, y: number, base: number) {
  const dx = x - base, dy = y - base;
  const left = x + dy;
  const right = dx * dy;
  return { dx, dy, left, right, value: left * base + right };
}

function make(x: number, y: number, base: number, level: Level): Problem {
  const s = solve(x, y, base);
  return {
    technique: ID,
    level,
    text: `${fmt(x)} × ${fmt(y)}`,
    answer: String(s.value),
    data: { x, y, base, dx: s.dx, dy: s.dy },
    hint: `base ${fmt(base)}`,
  };
}

const levels = {
  1: {
    label: 'both 91–99, base 100',
    bounds: { x: [91, 99], y: [91, 99], base: [100, 100], dx: [-9, -1], dy: [-9, -1] },
  },
  2: {
    label: 'near 100, above or both sides',
    bounds: { x: [88, 112], y: [88, 112], base: [100, 100], dx: [-12, 12], dy: [-12, 12] },
  },
  3: {
    label: 'both just below 1,000',
    bounds: { x: [960, 998], y: [960, 998], base: [1000, 1000], dx: [-40, -2], dy: [-40, -2] },
  },
} as const satisfies Levels;

function level2(rng: Rng): [number, number] {
  for (;;) {
    const p = rng.int(1, 12), q = rng.int(1, 12);
    if (p * q > 99) continue;
    const mixed = rng.chance(0.6);
    let dx = p, dy = mixed ? -q : q;
    if (rng.chance(0.5)) [dx, dy] = [dy, dx];
    return [100 + dx, 100 + dy];
  }
}

function level3(rng: Rng): [number, number] {
  for (;;) {
    const p = rng.int(2, 40), q = rng.int(2, 40);
    if (p * q <= 999 && p % 10 !== 0 && q % 10 !== 0) return [1000 - p, 1000 - q];
  }
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Nikhilam: numbers near a base',
    category: 'mul',
    tier: 'Core',
    order: 120,
    idea: 'Find each distance from the base. Left part: cross-subtract a distance. Right part: multiply the distances.',
  },
  card: {
    prose: [
      'Find how far each number is from the base, 100 or 1,000.',
      'Left part: take one number and subtract the other one’s distance (add it if that one is above).',
      'Right part: multiply the distances, padded to two digits (three for 1,000). One above, one below: borrow.',
    ],
    example: make(97, 94, 100, 1),
    graphic: () =>
      pieces({
        input: '97 × 94',
        ops: [
          { text: '100−97', out: '3' },
          { text: '100−94', out: '6' },
          { text: '97−6', out: '91' },
          { text: '3×6', out: '18' },
        ],
        answer: [
          { text: '91', from: 2 },
          { text: '18', from: 3 },
        ],
        result: '9,118',
        label: '97 times 94: distances 3 and 6 from 100, 97 minus 6 gives 91, 3 times 6 gives 18, so 9,118',
      }),
    caption: 'Get both distances, then build the left part and the right part from them.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(rng.int(91, 99), rng.int(91, 99), 100, level);
    if (level === 2) {
      const [x, y] = level2(rng);
      return make(x, y, 100, level);
    }
    const [x, y] = level3(rng);
    return make(x, y, 1000, level);
  },
  steps(p) {
    const { x, y, base } = p.data;
    const { dx, dy, left, right, value } = solve(x, y, base);
    const width = String(base).length - 1;
    const pad = (n: number) => String(n).padStart(width, '0');
    const B = fmt(base);
    const dist = (n: number, d: number): Step =>
      d < 0
        ? { op: '', expr: `${B} − ${fmt(n)} = ${-d}`, note: `${fmt(n)} is ${-d} below` }
        : { op: '', expr: `${fmt(n)} − ${B} = ${d}`, note: `${fmt(n)} is ${d} above` };
    const steps: Step[] = [{ op: '', expr: `${fmt(x)} × ${fmt(y)}` }, dist(x, dx), dist(y, dy)];
    steps.push(
      dy < 0
        ? { op: '', expr: `${fmt(x)} − ${-dy} = ${fmt(left)}`, note: 'left: cross-subtract' }
        : { op: '', expr: `${fmt(x)} + ${dy} = ${fmt(left)}`, note: 'left: cross-add' },
    );
    const mag = Math.abs(right);
    if (right >= 0) {
      steps.push({ op: '', expr: `${Math.abs(dx)} × ${Math.abs(dy)} = ${mag}`, note: pad(mag) === String(mag) ? 'right: multiply distances' : `right: write ${pad(mag)}` });
      steps.push({ expr: fmt(value), note: `${fmt(left)} then ${pad(mag)}` });
    } else {
      steps.push({ op: '', expr: `${Math.abs(dx)} × ${Math.abs(dy)} = ${mag}`, note: 'one above, one below' });
      steps.push({ op: '', expr: `${fmt(left)} − 1 = ${fmt(left - 1)}`, note: 'borrow 1 from the left' });
      steps.push({ op: '', expr: `${B} − ${mag} = ${base - mag}`, note: pad(base - mag) === String(base - mag) ? 'right part' : `right: write ${pad(base - mag)}` });
      steps.push({ expr: fmt(value), note: `${fmt(left - 1)} then ${pad(base - mag)}` });
    }
    return steps;
  },
});
