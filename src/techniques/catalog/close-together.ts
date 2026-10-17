import { defineTechnique } from '../define';
import { arrowHead, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'close-together';

function make(z: number, a: number, b: number, level: Level): Problem {
  const x = z + a, y = z + b;
  return {
    technique: ID,
    level,
    text: `${x} × ${y}`,
    answer: String(z * (x + b) + a * b),
    data: { x, y, z, a, b },
  };
}

const levels = {
  1: { label: '2-digit, same decade', bounds: { x: [11, 99], y: [11, 99], z: [10, 90], a: [1, 9], b: [1, 9] } },
  2: {
    label: 'just above 100, or same decade',
    bounds: { x: [11, 115], y: [11, 115], z: [10, 100], a: [1, 15], b: [1, 15] },
  },
  3: {
    label: 'just above a hundred, 200–900',
    bounds: { x: [201, 925], y: [201, 925], z: [200, 900], a: [1, 25], b: [1, 25] },
  },
} as const satisfies Levels;

/** One offset is 1-digit, the other may be larger; order is random. */
function offsets(rng: Rng, maxBig: number): [number, number] {
  const small = rng.int(1, 9);
  const big = rng.chance(0.5) ? rng.int(1, 9) : nonRound(rng, 1, maxBig);
  return rng.chance(0.5) ? [small, big] : [big, small];
}

/** 43 × 48: the bottom 8-strip moves to the side, giving 40 × 51 plus the 3 × 8 corner. */
function diagram(): string {
  const Z = 90, A = 20, B = 30, x0 = 34, y0 = 34;
  let s = rect(x0, y0, Z, Z, 'f-raised s-ink');
  s += rect(x0 + Z, y0, A, Z, 'f-soft s-ink');
  s += rect(x0, y0 + Z, Z, B, 'f-soft s-accent');
  s += rect(x0 + Z, y0 + Z, A, B, 'f-none s-dim s-dash');
  s += text(x0 + Z / 2, y0 + Z / 2, '40 × 40', 't t-sm');
  s += text(x0 + Z / 2, y0 + Z + B / 2, '40 × 8', 't t-sm t-accent');
  s += text(x0 + Z + A / 2, y0 + Z + B / 2, '24', 't t-sm t-dim');
  s += text(x0 + Z / 2, y0 - 14, '40', 't t-dim');
  s += text(x0 + Z + A / 2, y0 - 14, '3', 't t-dim');
  s += text(x0 - 8, y0 + Z / 2, '40', 't t-dim t-end');
  s += text(x0 - 8, y0 + Z + B / 2, '8', 't t-accent t-end');
  s += text(x0 + (Z + A) / 2, y0 + Z + B + 22, '43 × 48', 't t-sm');

  const ay = y0 + Z + B / 2;
  s += line(x0 + Z + A + 8, ay, x0 + Z + A + 30, ay, 's-accent');
  s += arrowHead(x0 + Z + A + 34, ay, 1, 0);

  const x1 = 194;
  s += rect(x1, y0, Z, Z, 'f-raised s-ink');
  s += rect(x1 + Z, y0, A, Z, 'f-soft s-ink');
  s += rect(x1 + Z + A, y0, B, Z, 'f-soft s-accent');
  s += rect(x1 + Z, y0 + Z, A, B, 'f-none s-dim s-dash');
  s += text(x1 + Z / 2, y0 + Z / 2, '40 × 40', 't t-sm');
  s += text(x1 + Z + A / 2, y0 + Z + B / 2, '24', 't t-sm t-dim');
  s += text(x1 + (Z + A + B) / 2, y0 - 14, '51', 't t-accent t-b');
  s += text(x1 - 8, y0 + Z / 2, '40', 't t-dim t-end');
  s += text(x1 + (Z + A + B) / 2, y0 + Z + B + 22, '40 × 51 + 3 × 8', 't t-sm');
  return svg(348, 192, s, '43 by 48 rearranged into a 40 by 51 rectangle plus a 3 by 8 corner');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Close-together method',
    category: 'mul',
    tier: 'Core',
    order: 80,
    idea: '(z + a)(z + b) = z(z + a + b) + ab, with z a round number just below both factors.',
  },
  card: {
    prose: [
      'Pick a round z just below both factors; a and b are the overshoots.',
      'Add one overshoot to the other factor and multiply by z; z + a + b is just x + b.',
      'Then add the small product ab.',
    ],
    example: make(40, 3, 8, 1),
    graphic: diagram,
    caption: 'The 40 × 8 strip under 43 × 48 moves to the side, making 40 × 51, with the 3 × 8 corner left over.',
  },
  levels,
  generate(rng, level) {
    if (level === 1 || (level === 2 && rng.chance(0.4))) {
      return make(10 * rng.int(1, 9), rng.int(1, 9), rng.int(1, 9), level);
    }
    if (level === 2) return make(100, ...offsets(rng, 15), level);
    return make(100 * rng.int(2, 9), ...offsets(rng, 25), level);
  },
  steps(p) {
    const { x, y, z, a, b } = p.data;
    const s = x + b;
    const scale = z >= 100 ? 100 : 10;
    const lead = z / scale;
    const zeros = scale === 100 ? '00' : '0';
    const prodNote = lead === 1 ? `append ${zeros}, ${a}×${b}` : `${lead}×${s} = ${fmt(lead * s)}, ${a}×${b}`;
    return [
      { op: '', expr: `${x} × ${y}` },
      { expr: `${z} × ${s} + ${a} × ${b}`, note: `${x} + ${b} = ${s}` },
      { expr: `${fmt(z * s)} + ${a * b}`, note: prodNote },
      { expr: fmt(z * s + a * b) },
    ];
  },
});
