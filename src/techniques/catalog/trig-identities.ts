import { defineTechnique } from '../define';
import { path, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'trig-identities';

/** Right triangles with whole sides: short leg, long leg, hypotenuse. */
const TRI = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]] as const;

/** Rounds to the nearest whole number, halves away from zero. */
const round = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

interface Sum {
  text: string;
  deg: number;
  f: 0 | 1 | 2;
  /** Answer in thousandths. */
  v: number;
  lines: Step[];
}

const PLUS: Step[] = [
  { op: '', expr: '2.449 + 1.414 = 3.863', note: '√6 ≈ 2.449, √2 ≈ 1.414' },
  { op: '', expr: '3.863 ÷ 4' },
];
const MINUS: Step[] = [
  { op: '', expr: '2.449 − 1.414 = 1.035', note: '√6 ≈ 2.449, √2 ≈ 1.414' },
  { op: '', expr: '1.035 ÷ 4' },
];
const SIN_SUM = 'sin(a ± b): sin a cos b ± cos a sin b';
const COS_SUM = 'cos(a ± b): cos a cos b ∓ sin a sin b';
const TOP_PLUS: Step = { op: '', expr: '(√6 + √2) ÷ 4', note: '√2/2 × √3/2 = √6/4, √2/2 × 1/2 = √2/4' };
const TOP_MINUS: Step = { op: '', expr: '(√6 − √2) ÷ 4', note: '√2/2 × √3/2 = √6/4, √2/2 × 1/2 = √2/4' };

/** Angles that split into two you know. */
const SUMS: Sum[] = [
  { text: 'sin 75°', deg: 75, f: 0, v: 966, lines: [{ op: '', expr: 'sin 75° = sin(45° + 30°)', note: 'split into angles you know' }, { op: '', expr: 'sin 45° cos 30° + cos 45° sin 30°', note: SIN_SUM }, TOP_PLUS, ...PLUS] },
  { text: 'cos 15°', deg: 15, f: 1, v: 966, lines: [{ op: '', expr: 'cos 15° = cos(45° − 30°)', note: 'split into angles you know' }, { op: '', expr: 'cos 45° cos 30° + sin 45° sin 30°', note: COS_SUM }, TOP_PLUS, ...PLUS] },
  { text: 'sin 105°', deg: 105, f: 0, v: 966, lines: [{ op: '', expr: 'sin 105° = sin(60° + 45°)', note: 'split into angles you know' }, { op: '', expr: 'sin 60° cos 45° + cos 60° sin 45°', note: SIN_SUM }, TOP_PLUS, ...PLUS] },
  { text: 'cos 75°', deg: 75, f: 1, v: 259, lines: [{ op: '', expr: 'cos 75° = cos(45° + 30°)', note: 'split into angles you know' }, { op: '', expr: 'cos 45° cos 30° − sin 45° sin 30°', note: COS_SUM }, TOP_MINUS, ...MINUS] },
  { text: 'sin 15°', deg: 15, f: 0, v: 259, lines: [{ op: '', expr: 'sin 15° = sin(45° − 30°)', note: 'split into angles you know' }, { op: '', expr: 'sin 45° cos 30° − cos 45° sin 30°', note: SIN_SUM }, TOP_MINUS, ...MINUS] },
  {
    text: 'cos 105°',
    deg: 105,
    f: 1,
    v: -259,
    lines: [
      { op: '', expr: 'cos 105° = cos(60° + 45°)', note: 'split into angles you know' },
      { op: '', expr: 'cos 60° cos 45° − sin 60° sin 45°', note: COS_SUM },
      { op: '', expr: '(√2 − √6) ÷ 4', note: '1/2 × √2/2 = √2/4, √3/2 × √2/2 = √6/4' },
      { op: '', expr: '1.414 − 2.449 = −1.035', note: '√6 ≈ 2.449, √2 ≈ 1.414' },
      { op: '', expr: '−1.035 ÷ 4' },
    ],
  },
  {
    text: 'tan 75°',
    deg: 75,
    f: 2,
    v: 3732,
    lines: [
      { op: '', expr: 'tan 75° = sin 75° ÷ cos 75°', note: 'tan = sin ÷ cos' },
      { op: '', expr: '(√6 + √2) ÷ (√6 − √2) = 2 + √3', note: 'the 4s cancel; the ratio comes to 2 + √3' },
      { op: '', expr: '2 + 1.732 = 3.732', note: '√3 ≈ 1.732' },
    ],
  },
  {
    text: 'tan 15°',
    deg: 15,
    f: 2,
    v: 268,
    lines: [
      { op: '', expr: 'tan 15° = sin 15° ÷ cos 15°', note: 'tan = sin ÷ cos' },
      { op: '', expr: '(√6 − √2) ÷ (√6 + √2) = 2 − √3', note: 'the 4s cancel; the ratio comes to 2 − √3' },
      { op: '', expr: '2 − 1.732 = 0.268', note: '√3 ≈ 1.732' },
    ],
  },
];

/** Sides of the triangle for x: opposite, adjacent, hypotenuse. s = 1 puts the long leg opposite x. */
function sides(t: number, s: number): [number, number, number] {
  const [a, b, c] = TRI[t];
  return s ? [b, a, c] : [a, b, c];
}

/** "0.6" when the fraction ends neatly (hypotenuse 5 or 25), "5/13" otherwise. */
const ratio = (n: number, c: number) => (c === 5 || c === 25 ? scaled((n * 100) / c, 2) : `${n}/${c}`);

/** Fraction n/d (n may be negative) as the answer: exact if it ends within 3 decimals. */
function fraction(n: number, d: number): { v: number; exact: boolean } {
  const exact = (n * 1000) % d === 0;
  return { v: exact ? (n * 1000) / d : round((n * 1000) / d), exact };
}

/** sin/cos of 30° and 60° in thousandths. */
const COS_Y: Record<number, number> = { 30: 866, 60: 500 };
const SIN_Y: Record<number, number> = { 30: 500, 60: 866 };

/** Value in hundred-thousandths for q = 5 (x plus 30° or 60°), from the 3-decimal values. */
function shifted(sin100: number, cos100: number, y: number, fn: number): { p1: number; p2: number; sum: number } {
  const p1 = fn ? cos100 * COS_Y[y] : sin100 * COS_Y[y];
  const p2 = fn ? sin100 * SIN_Y[y] : cos100 * SIN_Y[y];
  return { p1, p2, sum: fn ? p1 - p2 : p1 + p2 };
}

function make(level: Level, d: { t: number; g: number; s: number; q: number; k?: number; y?: number; fn?: number }): Problem {
  const base = { technique: ID, level };
  if (d.q === 4) {
    const e = SUMS[d.k!];
    return { ...base, text: e.text, answer: scaled(e.v, 3), data: { t: 0, g: 0, s: 0, q: 4, k: d.k! }, tolerance: 0.002, hint: '3 decimals' };
  }
  const [o, a, c] = sides(d.t, d.s);
  const given = d.g ? `cos x = ${ratio(a, c)}` : `sin x = ${ratio(o, c)}`;
  const data: Record<string, number> = { t: d.t, g: d.g, s: d.s, q: d.q };
  if (d.q === 5) {
    const { sum } = shifted((o * 100) / c, (a * 100) / c, d.y!, d.fn!);
    const v = round(sum / 100);
    const exact = sum % 100 === 0;
    return {
      ...base,
      text: `${d.fn ? 'cos' : 'sin'}(x + ${d.y}°) if ${given}`,
      answer: scaled(v, 3),
      data: { ...data, y: d.y!, fn: d.fn! },
      tolerance: 0.002,
      hint: exact ? 'x acute' : 'x acute · 3 decimals',
    };
  }
  const [n, den] = [[d.g ? o : a, c], [o, a], [2 * o * a, c * c], [a * a - o * o, c * c]][d.q];
  const { v, exact } = fraction(n, den);
  const ask = ['', 'tan x', 'sin 2x', 'cos 2x'][d.q] || (d.g ? 'sin x' : 'cos x');
  return {
    ...base,
    text: `${ask} if ${given}`,
    answer: scaled(v, 3),
    data,
    tolerance: exact ? undefined : 0.001,
    hint: exact ? 'x acute' : 'x acute · 3 decimals',
  };
}

const levels = {
  1: { label: '3-4-5: the other one, or tan', bounds: { t: [0, 0], q: [0, 1] } },
  2: { label: '3-4-5 and 7-24-25', bounds: { t: [0, 3], q: [0, 1] } },
  3: { label: '5-12-13, 8-15-17, 20-21-29', bounds: { t: [1, 4], q: [0, 1] } },
  4: { label: 'double angles', bounds: { t: [0, 3], q: [2, 3] } },
  5: { label: '15°, 75°, 105° from 30°, 45°, 60°', bounds: { q: [4, 4], k: [0, 7] } },
  6: { label: 'x plus 30° or 60°', bounds: { t: [0, 3], q: [5, 5], y: [30, 60], fn: [0, 1] } },
} as const satisfies Levels;

const side = (rng: Rng) => ({ g: rng.int(0, 1), s: rng.int(0, 1) });

/** cos x from sin x = 0.6: the 3-4-5 triangle. */
function graphic(): string {
  const A: [number, number] = [36, 170], B: [number, number] = [196, 170], C: [number, number] = [196, 50];
  let b = path(`M${A[0]},${A[1]} L${B[0]},${B[1]} L${C[0]},${C[1]} Z`, 's-ink f-raised');
  b += path(`M${B[0] - 12},${B[1]} L${B[0] - 12},${B[1] - 12} L${B[0]},${B[1] - 12}`, 's-ink f-none');
  b += path(`M${A[0] + 30},${A[1]} A30,30 0 0 0 ${A[0] + 24},${A[1] - 18}`, 's-accent f-none');
  b += text(A[0] + 44, A[1] - 10, 'x', 't t-accent t-b');
  b += text((A[0] + B[0]) / 2, A[1] + 15, '4', 't t-accent t-b');
  b += text(B[0] + 12, (B[1] + C[1]) / 2, '3', 't t-start');
  b += text((A[0] + C[0]) / 2 - 12, (A[1] + C[1]) / 2 - 12, '5', 't');
  const x = 222;
  b += text(x, 58, 'sin x = 3/5', 't t-sm t-start');
  b += text(x, 80, '5² − 3² = 16', 't t-sm t-start');
  b += text(x, 102, 'third side 4', 't t-sm t-start');
  b += text(x, 136, 'cos x = 4/5', 't t-accent t-b t-start');
  b += text(x, 160, '= 0.8', 't t-lg t-accent t-b t-start');
  return svg(340, 192, b, 'sin x = 0.6 is 3 over 5: opposite 3, hypotenuse 5. The third side is 4, since 25 minus 9 is 16, so cos x is 4 over 5, 0.8');
}

/** The lines for n ÷ d: exact, or rounded to 3 decimals. */
function divide(n: number, d: number, answer: string): Step[] {
  const exact = (n * 1000) % d === 0;
  return exact ? [{ op: '', expr: `${fmt(n)} ÷ ${d} = ${fmt(answer)}` }, { expr: fmt(answer) }] : [{ op: '', expr: `${fmt(n)} ÷ ${fmt(d)}` }, { op: '≈', expr: fmt(answer), note: 'to 3 decimals' }];
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Trig from one value',
    category: 'trig',
    tier: 'Advanced',
    order: 30,
    idea: 'Turn the value you know into a right triangle, find the third side, and read every other value off it.',
    signed: true,
  },
  card: {
    prose: [
      'sin x = 0.6 is 3/5: opposite 3, hypotenuse 5. Square, subtract and take the root for the third side, 4.',
      'Read the rest off the triangle: cos x = 4/5, tan x = 3/4; sin 2x = 2 sin x cos x, cos 2x = cos² x − sin² x.',
      'For 15°, 75° or 105°, split into 30°, 45°, 60° and use sin(a + b) = sin a cos b + cos a sin b.',
    ],
    example: make(1, { t: 0, g: 0, s: 0, q: 0 }),
    graphic,
    caption: 'From sin x = 3/5, the third side is 4, so cos x = 4/5.',
  },
  levels,
  generate(rng, level) {
    switch (level) {
      case 1:
        return make(level, { t: 0, q: rng.int(0, 1), ...side(rng) });
      case 2:
        return make(level, { t: rng.pick([0, 3]), q: rng.int(0, 1), ...side(rng) });
      case 3:
        return make(level, { t: rng.pick([1, 2, 4]), q: rng.int(0, 1), ...side(rng) });
      case 4:
        return make(level, { t: rng.pick([0, 1, 3]), q: rng.int(2, 3), ...side(rng) });
      case 5:
        return make(level, { t: 0, g: 0, s: 0, q: 4, k: rng.int(0, SUMS.length - 1) });
      default:
        return make(level, { t: rng.pick([0, 3]), q: 5, y: rng.pick([30, 60]), fn: rng.int(0, 1), ...side(rng) });
    }
  },
  steps(p) {
    const { t, g, s: sd, q, k, y, fn } = p.data;
    const head: Step = { op: '', expr: p.text };
    if (q === 4) {
      const e = SUMS[k];
      const last = e.lines[e.lines.length - 1].expr;
      return [head, ...e.lines, last.includes(' = ') ? { expr: fmt(p.answer) } : { op: '≈', expr: fmt(p.answer), note: 'to 3 decimals' }];
    }
    const [o, a, c] = sides(t, sd);
    const known = g ? a : o, other = g ? o : a;
    const s: Step[] = [
      head,
      { op: '', expr: g ? `cos x = ${a}/${c}` : `sin x = ${o}/${c}`, note: g ? `adjacent ${a}, hypotenuse ${c}` : `opposite ${o}, hypotenuse ${c}` },
      { op: '', expr: `${c}² − ${known}² = ${other * other}`, note: 'the third side, squared' },
      { op: '', expr: `√${other * other} = ${other}`, note: g ? 'the opposite side' : 'the adjacent side' },
    ];
    if (q === 5) {
      const sin100 = (o * 100) / c, cos100 = (a * 100) / c;
      const { p1, p2, sum } = shifted(sin100, cos100, y, fn);
      const sx = scaled(sin100, 2), cx = scaled(cos100, 2), cy = scaled(COS_Y[y], 3), sy = scaled(SIN_Y[y], 3);
      s.push({ op: '', expr: g ? `sin x = ${sx}` : `cos x = ${cx}`, note: g ? `${o} ÷ ${c}` : `${a} ÷ ${c}` });
      s.push(
        fn
          ? { op: '', expr: `cos x cos ${y}° − sin x sin ${y}°`, note: 'cos(a + b): cos a cos b − sin a sin b' }
          : { op: '', expr: `sin x cos ${y}° + cos x sin ${y}°`, note: 'sin(a + b): sin a cos b + cos a sin b' },
      );
      s.push({ op: '', expr: `${fn ? cx : sx} × ${cy} = ${scaled(p1, 5)}`, note: `cos ${y}° ≈ ${cy}` });
      s.push({ op: '', expr: `${fn ? sx : cx} × ${sy} = ${scaled(p2, 5)}`, note: `sin ${y}° ≈ ${sy}` });
      s.push({ op: '', expr: `${scaled(p1, 5)} ${fn ? '−' : '+'} ${scaled(p2, 5)} = ${fmt(scaled(sum, 5))}` });
      s.push(sum % 100 === 0 ? { expr: fmt(p.answer) } : { op: '≈', expr: fmt(p.answer), note: 'to 3 decimals' });
      return s;
    }
    if (q === 0) {
      s.push({ op: '', expr: g ? `sin x = ${o}/${c}` : `cos x = ${a}/${c}`, note: g ? 'opposite ÷ hypotenuse' : 'adjacent ÷ hypotenuse' });
      return [...s, ...divide(g ? o : a, c, p.answer)];
    }
    if (q === 1) {
      s.push({ op: '', expr: `tan x = ${o}/${a}`, note: 'opposite ÷ adjacent' });
      return [...s, ...divide(o, a, p.answer)];
    }
    if (q === 2) {
      s.push({ op: '', expr: 'sin 2x = 2 sin x cos x', note: 'double angle' });
      s.push({ op: '', expr: `2 × ${o} × ${a} = ${2 * o * a}`, note: 'top: 2 × opposite × adjacent' });
      s.push({ op: '', expr: `${c} × ${c} = ${c * c}`, note: 'bottom: hypotenuse squared' });
      return [...s, ...divide(2 * o * a, c * c, p.answer)];
    }
    s.push({ op: '', expr: 'cos 2x = cos² x − sin² x', note: 'double angle' });
    s.push({ op: '', expr: `${a}² − ${o}² = ${fmt(a * a - o * o)}`, note: 'top: adjacent² − opposite²' });
    s.push({ op: '', expr: `${c} × ${c} = ${c * c}`, note: 'bottom: hypotenuse squared' });
    return [...s, ...divide(a * a - o * o, c * c, p.answer)];
  },
  reference(p) {
    const { t, g, s, q, k, y, fn } = p.data;
    if (q === 4) {
      const e = SUMS[k];
      return [Math.sin, Math.cos, Math.tan][e.f]((e.deg * Math.PI) / 180);
    }
    const [o, a, c] = sides(t, s);
    const x = g ? Math.acos(a / c) : Math.asin(o / c);
    if (q === 5) return (fn ? Math.cos : Math.sin)(x + (y * Math.PI) / 180);
    return [g ? Math.sin(x) : Math.cos(x), Math.tan(x), Math.sin(2 * x), Math.cos(2 * x)][q];
  },
});
