import { defineTechnique } from '../define';
import { circle, line, path, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, gcd, scaled } from '../util';

const ID = 'trig-special';
const FN = ['sin', 'cos', 'tan'] as const;
const QUARTER = ['', '1st', '2nd', '3rd', '4th'];
const ONLY_POSITIVE = ['', 'all', 'sin', 'tan', 'cos'];

/** Values in thousandths at the angles worth knowing. */
const SIN: Record<number, number> = { 0: 0, 30: 500, 45: 707, 60: 866, 90: 1000 };
const TAN: Record<number, number> = { 0: 0, 30: 577, 45: 1000, 60: 1732 };
const IRRATIONAL = new Set([707, 866, 577, 1732]);

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const refAngle = (a: number) => (a <= 90 ? a : a <= 180 ? 180 - a : a <= 270 ? a - 180 : 360 - a);

/** Signed value in thousandths: the reference angle's value with the quarter's sign. */
function value(f: number, deg: number): number {
  const a = norm(deg), r = refAngle(a);
  const sinSign = a > 180 ? -1 : 1;
  const cosSign = a > 90 && a < 270 ? -1 : 1;
  if (f === 0) return sinSign * SIN[r];
  if (f === 1) return cosSign * SIN[90 - r];
  return sinSign * cosSign * TAN[r];
}

function angleText(deg: number, rad: number): string {
  if (!rad) return deg < 0 ? `−${-deg}°` : `${deg}°`;
  const g = gcd(deg, 180), num = deg / g, den = 180 / g;
  const top = num === 1 ? 'π' : `${num}π`;
  return den === 1 ? top : `${top}/${den}`;
}

function make(f: number, deg: number, rad: number, level: Level): Problem {
  const v = value(f, deg);
  const irr = IRRATIONAL.has(Math.abs(v));
  const angle = angleText(deg, rad);
  return {
    technique: ID,
    level,
    text: rad || deg < 0 ? `${FN[f]}(${angle})` : `${FN[f]} ${angle}`,
    answer: scaled(v, 3),
    data: { f, deg, rad },
    tolerance: irr ? 0.001 : undefined,
    hint: irr ? '3 decimals' : undefined,
  };
}

const levels = {
  1: { label: 'answers 0, ½ or 1', bounds: { f: [0, 2], deg: [0, 90], rad: [0, 0] } },
  2: { label: 'sin and cos, 0° to 90°', bounds: { f: [0, 1], deg: [0, 90], rad: [0, 0] } },
  3: { label: 'sin, cos, tan, 0° to 90°', bounds: { f: [0, 2], deg: [0, 90], rad: [0, 0] } },
  4: { label: 'past 90°, with signs', bounds: { f: [0, 2], deg: [120, 360], rad: [0, 0] } },
  5: { label: 'radians', bounds: { f: [0, 2], deg: [30, 360], rad: [1, 1] } },
  6: { label: 'negative angles and more than a turn', bounds: { f: [0, 2], deg: [-360, 719], rad: [0, 0] } },
} as const satisfies Levels;

const EASY: [number, number][] = [[0, 0], [0, 30], [0, 90], [1, 0], [1, 60], [1, 90], [2, 0], [2, 45]];
const FIRST = [0, 30, 45, 60, 90];
const PAST = [120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
const TURN = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

/** tan at 90° and 270° does not exist. */
const ok = (f: number, deg: number) => !(f === 2 && norm(deg) % 180 === 90);

function pickAngle(rng: Rng, level: Level): [number, number] {
  switch (level) {
    case 1:
      return rng.pick(EASY);
    case 2:
      return [rng.int(0, 1), rng.chance(0.75) ? rng.pick([30, 45, 60]) : rng.pick(FIRST)];
    case 3:
      return [rng.int(0, 2), rng.chance(0.8) ? rng.pick([30, 45, 60]) : rng.pick(FIRST)];
    case 4:
      return [rng.int(0, 2), rng.pick(PAST)];
    case 5:
      return [rng.int(0, 2), rng.pick([...FIRST.slice(1), ...PAST])];
    default: {
      const turn = rng.chance(0.5) ? 360 : -360;
      const base = rng.pick(TURN.slice(1));
      return [rng.int(0, 2), base + turn];
    }
  }
}

const point = (n: number) => (n < 0 ? `−${-n}` : String(n));

/** The worked value at a reference angle between 30° and 60°. */
function atReference(f: number, r: number): Step[] {
  const sinLine = (x: number): Step =>
    x === 30
      ? { op: '', expr: '1 ÷ 2 = 0.5', note: 'sin 30° = √1/2' }
      : x === 45
        ? { op: '', expr: '1.414 ÷ 2 = 0.707', note: 'sin 45° = √2/2' }
        : { op: '', expr: '1.732 ÷ 2 = 0.866', note: 'sin 60° = √3/2' };
  if (f === 0) return [sinLine(r)];
  if (f === 1) return [{ op: '', expr: `cos ${r}° = sin ${90 - r}°`, note: 'cos reads the list backwards' }, sinLine(90 - r)];
  if (r === 30) return [{ op: '', expr: '1.732 ÷ 3 = 0.577', note: 'tan 30° = 1/√3 = √3/3' }];
  if (r === 45) return [{ op: '', expr: 'tan 45° = 1', note: 'sin and cos are equal' }];
  return [{ op: '', expr: '√3 = 1.732', note: 'tan 60° = √3' }];
}

/** cos 120°: the point sits left of centre by the same 0.5 that cos 60° sits right of it. */
function graphic(): string {
  const O: [number, number] = [160, 150], R = 110;
  const P: [number, number] = [O[0] - 55, O[1] - 95.26], Q: [number, number] = [O[0] + 55, O[1] - 95.26];
  let b = path(`M${O[0] - R},${O[1]} A${R},${R} 0 0 1 ${O[0] + R},${O[1]}`, 's-rule f-none');
  b += line(30, O[1], 290, O[1], 's-ink') + line(O[0], 34, O[0], O[1] + 6, 's-rule');
  b += line(Q[0], Q[1], Q[0], O[1], 's-rule s-dash');
  b += line(P[0], P[1], P[0], O[1], 's-dim s-dash') + line(...O, ...P, 's-accent s-thick');
  b += line(O[0], O[1], P[0], O[1], 's-accent s-thick');
  b += circle(...P, 4, 'f-accent s-accent') + circle(...Q, 3.5, 'f-paper s-dim');
  b += path(`M${O[0] + 22},${O[1]} A22,22 0 0 0 ${O[0] - 11},${O[1] - 19.05}`, 's-accent f-none');
  b += text(O[0] + 18, O[1] - 31, '120°', 't t-sm t-accent');
  b += path(`M${O[0] - 30},${O[1]} A30,30 0 0 1 ${O[0] - 15},${O[1] - 25.98}`, 's-dim f-none');
  b += text(O[0] - 40, O[1] - 22, '60°', 't t-sm t-dim');
  b += text((O[0] + P[0]) / 2, O[1] + 16, '−0.5', 't t-accent t-b');
  b += text((O[0] + Q[0]) / 2, O[1] + 16, '0.5', 't t-dim');
  b += text(160, 188, 'cos is the across: left of centre is negative', 't t-sm t-dim');
  return svg(320, 198, b, 'cos 120°: the angle is 60° from the horizontal, so the across is 0.5 as for 60°, but to the left: −0.5');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Special angles',
    category: 'trig',
    tier: 'Core',
    order: 20,
    idea: 'Sine at 0°, 30°, 45°, 60°, 90° is √0, √1, √2, √3, √4 over 2; cosine reads the same list backwards.',
    signed: true,
  },
  card: {
    prose: [
      'Sine at 0°, 30°, 45°, 60°, 90° is √0/2, √1/2, √2/2, √3/2, √4/2. Cosine is the same list backwards.',
      'With √2 ≈ 1.414 and √3 ≈ 1.732 those are 0.707 and 0.866. tan is sin ÷ cos: 0.577, 1, 1.732.',
      'Past 90°, use the angle to the horizontal, then the sign: in the 2nd quarter only sin is positive, the 3rd only tan, the 4th only cos.',
    ],
    example: make(1, 120, 0, 4),
    graphic,
    caption: '120° is 60° short of the left side: the same 0.5 across, but negative.',
  },
  levels,
  generate(rng, level) {
    for (;;) {
      const [f, deg] = pickAngle(rng, level);
      if (ok(f, deg)) return make(f, deg, level === 5 ? 1 : 0, level);
    }
  },
  steps(p) {
    const { f, deg, rad } = p.data;
    const answer = fmt(p.answer);
    const s: Step[] = [{ op: '', expr: p.text }];
    if (rad) {
      const g = gcd(deg, 180), num = deg / g, den = 180 / g;
      const expr = deg === 180 ? '180°' : `180°${num > 1 ? ` × ${num}` : ''}${den > 1 ? ` ÷ ${den}` : ''} = ${deg}°`;
      s.push({ op: '', expr, note: 'π is 180°' });
    }
    let a = deg;
    for (; a < 0; a += 360) s.push({ op: '', expr: `−${-a}° + 360° = ${a + 360}°`, note: 'add a full turn' });
    for (; a >= 360 && deg !== 360; a -= 360) s.push({ op: '', expr: `${a}° − 360° = ${a - 360}°`, note: 'take off a full turn' });
    if (a % 90 === 0) {
      const [x, y] = [[1, 0], [0, 1], [-1, 0], [0, -1]][(a / 90) % 4];
      s.push({ op: '', expr: `${a}° is the point (${point(x)}, ${point(y)})`, note: 'unit circle: cos across, sin up' });
      s.push({ expr: answer, note: f === 0 ? 'sin: how far up' : f === 1 ? 'cos: how far across' : 'tan = sin ÷ cos' });
      return s;
    }
    const r = refAngle(a);
    const q = a < 90 ? 1 : a < 180 ? 2 : a < 270 ? 3 : 4;
    if (q > 1) {
      const expr = q === 2 ? `180° − ${a}° = ${r}°` : q === 3 ? `${a}° − 180° = ${r}°` : `360° − ${a}° = ${r}°`;
      s.push({ op: '', expr, note: 'the angle to the horizontal' });
    }
    s.push(...atReference(f, r));
    s.push(q === 1 ? { expr: answer } : { expr: answer, note: `${QUARTER[q]} quarter: only ${ONLY_POSITIVE[q]} is positive` });
    return s;
  },
  reference(p) {
    const x = (p.data.deg * Math.PI) / 180;
    return [Math.sin, Math.cos, Math.tan][p.data.f](x);
  },
});
