import { defineTechnique } from '../define';
import { arrowHead, line, svg, text } from '../svg';
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

function diagram(): string {
  const xn = 100, xd = 220, r1 = 70, r2 = 112;
  let body = text(160, 12, 'base 100', 't t-sm t-dim');
  body += text(xn, 38, 'number', 't t-sm t-dim');
  body += text(xd, 38, 'deficit', 't t-sm t-dim');
  body += text(xn, r1, '97', 't t-lg');
  body += text(xd, r1, '−3', 't t-lg');
  body += text(xn, r2, '94', 't t-lg');
  body += text(xd, r2, '−6', 't t-lg');
  body += line(124, r1 + 6, 194, r2 - 8, 's-accent');
  body += arrowHead(198, r2 - 6, 70, r2 - 14 - r1, 'f-accent');
  body += text(258, (r1 + r2) / 2, '×', 't t-dim');
  body += line(60, 136, 260, 136, 's-rule');
  body += text(xn, 162, '91', 't t-lg t-accent t-b');
  body += text(160, 162, '|', 't t-lg t-dim');
  body += text(xd, 162, '18', 't t-lg t-b');
  body += text(xn, 192, '97 − 6', 't t-sm t-dim');
  body += text(xd, 192, '3 × 6', 't t-sm t-dim');
  return svg(320, 206, body, 'Nikhilam layout for 97 times 94: deficits 3 and 6, left part 97 minus 6 is 91, right part 3 times 6 is 18, answer 9118');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Nikhilam: numbers near a base',
    category: 'mul',
    tier: 'Core',
    order: 120,
    idea: '(B − x)(B − y) = B(B − x − y) + xy: cross-subtract a deficit, then multiply the deficits.',
  },
  card: {
    prose: [
      'Write each number’s distance from the base: below is a deficit, above is a surplus.',
      'Left part: either number plus the other’s signed distance. Right part: the product of the distances.',
      'The right part fills as many digits as the base has zeros; a negative one borrows from the left.',
    ],
    example: make(97, 94, 100, 1),
    graphic: diagram,
    caption: 'Deficits 3 and 6 sit beside 97 and 94; 97 − 6 gives the hundreds, 3 × 6 the last two digits.',
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
    const dev = (n: number, d: number): Step =>
      d < 0
        ? { op: '→', expr: `${B} − ${fmt(n)} = ${-d}`, note: `${fmt(n)} is ${-d} below` }
        : { op: '→', expr: `${fmt(n)} − ${B} = ${d}`, note: `${fmt(n)} is ${d} above` };
    const steps: Step[] = [{ op: '', expr: `${fmt(x)} × ${fmt(y)}` }, dev(x, dx), dev(y, dy)];
    steps.push(
      dy < 0
        ? { op: '→', expr: `${fmt(x)} − ${-dy} = ${fmt(left)}`, note: 'left: cross-subtract' }
        : { op: '→', expr: `${fmt(x)} + ${dy} = ${fmt(left)}`, note: 'left: cross-add' },
    );
    const mag = Math.abs(right);
    if (right >= 0) {
      steps.push({ op: '→', expr: `${Math.abs(dx)} × ${Math.abs(dy)} = ${mag}`, note: 'right: product' });
      steps.push({ op: '→', expr: `${fmt(left)} | ${pad(mag)}`, note: 'left | right' });
    } else {
      steps.push({ op: '→', expr: `${Math.abs(dx)} × ${Math.abs(dy)} = ${mag}`, note: `signs differ: −${mag}` });
      steps.push({ op: '→', expr: `${fmt(left)} | −${pad(mag)}`, note: 'left | right' });
      steps.push({ op: '→', expr: `${fmt(left - 1)} | ${pad(base - mag)}`, note: `borrow: ${B} − ${mag}` });
    }
    steps.push({ expr: fmt(value), note: 'join the parts' });
    return steps;
  },
});
