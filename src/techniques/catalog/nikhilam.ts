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
    label: 'both 95–99, base 100',
    bounds: { x: [95, 99], y: [95, 99], base: [100, 100], dx: [-5, -1], dy: [-5, -1] },
  },
  2: {
    label: 'both 91–99, base 100',
    bounds: { x: [91, 99], y: [91, 99], base: [100, 100], dx: [-9, -1], dy: [-9, -1] },
  },
  3: {
    label: 'near 100, above or both sides',
    bounds: { x: [88, 112], y: [88, 112], base: [100, 100], dx: [-12, 12], dy: [-12, 12] },
  },
  4: {
    label: 'both just below 1,000',
    bounds: { x: [960, 998], y: [960, 998], base: [1000, 1000], dx: [-40, -2], dy: [-40, -2] },
  },
  5: {
    label: 'near 1,000, above or both sides',
    bounds: { x: [951, 1049], y: [951, 1049], base: [1000, 1000], dx: [-49, 49], dy: [-49, 49] },
  },
  6: {
    label: 'both 925–989, right part carries',
    bounds: { x: [925, 989], y: [925, 989], base: [1000, 1000], dx: [-75, -11], dy: [-75, -11] },
  },
} as const satisfies Levels;

function level3(rng: Rng): [number, number] {
  for (;;) {
    const p = rng.int(1, 12), q = rng.int(1, 12);
    if (p * q > 99) continue;
    const mixed = rng.chance(0.6);
    let dx = p, dy = mixed ? -q : q;
    if (rng.chance(0.5)) [dx, dy] = [dy, dx];
    return [100 + dx, 100 + dy];
  }
}

function level1(rng: Rng): [number, number] {
  for (;;) {
    const x = rng.int(95, 99), y = rng.int(95, 99);
    if (x !== y) return [x, y];
  }
}

/** Within 49 of 1,000, often one above and one below; the right part stays under 1,000. */
function level5(rng: Rng): [number, number] {
  for (;;) {
    const p = rng.int(2, 49), q = rng.int(2, 49);
    if (p === q || p * q > 999 || p % 10 === 0 || q % 10 === 0) continue;
    const mixed = rng.chance(0.6);
    let dx = p, dy = mixed ? -q : q;
    if (!mixed && rng.chance(0.5)) [dx, dy] = [-dx, -dy];
    if (rng.chance(0.5)) [dx, dy] = [dy, dx];
    return [1000 + dx, 1000 + dy];
  }
}

/** Both 11–75 below 1,000, with a right part of four digits that carries into the left. */
function level6(rng: Rng): [number, number] {
  for (;;) {
    const p = rng.int(11, 75), q = rng.int(11, 75);
    if (p !== q && p * q >= 1000 && p % 10 !== 0 && q % 10 !== 0) return [1000 - p, 1000 - q];
  }
}

function level4(rng: Rng): [number, number] {
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
    example: make(97, 94, 100, 2),
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
    if (level === 1) {
      const [x, y] = level1(rng);
      return make(x, y, 100, level);
    }
    if (level === 2) return make(rng.int(91, 99), rng.int(91, 99), 100, level);
    if (level === 3) {
      const [x, y] = level3(rng);
      return make(x, y, 100, level);
    }
    const [x, y] = level === 4 ? level4(rng) : level === 5 ? level5(rng) : level6(rng);
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
    if (right >= base) {
      const carry = Math.floor(right / base), rest = right % base;
      steps.push({ op: '', expr: `${Math.abs(dx)} × ${Math.abs(dy)} = ${fmt(right)}`, note: `right: keep ${pad(rest)}, carry ${carry}` });
      steps.push({ op: '', expr: `${fmt(left)} + ${carry} = ${fmt(left + carry)}`, note: 'add the carry to the left' });
      steps.push({ expr: fmt(value), note: `${fmt(left + carry)} then ${pad(rest)}` });
    } else if (right >= 0) {
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
