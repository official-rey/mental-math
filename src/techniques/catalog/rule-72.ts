import { defineTechnique } from '../define';
import { circle, line, path, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'rule-72';

/** Question kinds. */
const DOUBLE = 0, DOUBLE_ODD = 1, RATE = 2, QUAD = 3;

const DIVIDES = [2, 3, 4, 6, 8, 9, 12] as const;
const OTHER = [5, 7, 10, 11, 14, 15, 16, 18] as const;
const YEARS = [4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 36] as const;
const AMOUNTS = [100, 200, 250, 300, 400, 500, 600, 800, 1500, 2500] as const;

/** Numerator of the rule: 72 per doubling. */
const numer = (kind: number) => (kind === QUAD ? 144 : 72);

/** Rule-of-72 answer in tenths (dp = 1) or whole units (dp = 0). */
function ruleValue(kind: number, x: number, dp: number): number {
  return dp ? Math.round((numer(kind) * 10) / x) : Math.round(numer(kind) / x);
}

/** True compound-interest value: years for ×2 or ×4 at x%, or the rate that doubles in x years. */
function truth(kind: number, x: number): number {
  if (kind === RATE) return (2 ** (1 / x) - 1) * 100;
  return Math.log(kind === QUAD ? 4 : 2) / Math.log(1 + x / 100);
}

function make(kind: number, x: number, dp: number, amt: number, level: Level): Problem {
  const v = ruleValue(kind, x, dp);
  const answer = dp ? scaled(v, 1) : String(v);
  const ref = truth(kind, x);
  // Fair to the rule (and to 70 or 69.3 in place of 72), strict enough to reject guesses.
  const tolerance = Math.ceil(Math.max(Math.abs(Number(answer) - ref), 0.06 * ref) * 2) / 2;
  const mult = kind === QUAD ? 4 : 2;
  let t: string;
  if (kind === RATE) t = amt ? `$${fmt(amt)} → $${fmt(amt * 2)} in ${x} years` : `Double in ${x} years`;
  else if (amt) t = `$${fmt(amt)} → $${fmt(amt * mult)} at ${x}%`;
  else t = `${kind === QUAD ? 'Quadruple' : 'Double'} at ${x}% a year`;
  const hint =
    kind === RATE
      ? dp ? '% a year, 1 decimal' : '% a year'
      : kind === DOUBLE_ODD && !dp ? 'nearest year' : dp ? 'years, 1 decimal' : 'years';
  return { technique: ID, level, text: t, answer, tolerance, hint, data: { kind, x, dp, amt } };
}

const levels = {
  1: { label: 'rates that divide 72', bounds: { kind: [0, 0], x: [2, 12], dp: [0, 0] } },
  2: { label: 'other rates', bounds: { kind: [1, 1], x: [5, 18], dp: [0, 1] } },
  3: { label: 'rate to double, ×4', bounds: { kind: [2, 3], x: [2, 36], dp: [0, 1] } },
} as const satisfies Levels;

/** Growth at 6% a year: the curve passes ×2, ×4, ×8 at equal 12-year steps. */
function diagram(): string {
  const X0 = 44, X1 = 316, Y0 = 168, Y1 = 30;
  const X = (t: number) => X0 + (t / 36) * (X1 - X0);
  const Y = (v: number) => Y0 - ((v - 1) / 7) * (Y0 - Y1);
  let b = line(X0, Y0, X1 + 6, Y0, 's-ink') + line(X0, Y0, X0, Y1 - 8, 's-ink');
  let d = '';
  for (let t = 0; t <= 36; t += 1) d += `${t ? 'L' : 'M'}${X(t).toFixed(1)},${Y(2 ** (t / 12)).toFixed(1)} `;
  [12, 24, 36].forEach((t, i) => {
    const v = 2 ** (i + 1);
    b += line(X(t), Y0, X(t), Y(v), 's-dim s-dash');
    b += line(X0, Y(v), X(t), Y(v), 's-dim s-dash');
    b += text(X0 - 8, Y(v), `×${v}`, 't t-sm t-accent t-end');
    b += text(X(t), Y0 + 14, String(t), 't t-sm');
  });
  b += text(X0 - 8, Y0, '×1', 't t-sm t-dim t-end');
  b += text(X0, Y0 + 14, '0', 't t-sm t-dim');
  b += path(d, 's-accent s-thick f-none');
  [12, 24, 36].forEach((t, i) => (b += circle(X(t), Y(2 ** (i + 1)), 3.5, 'f-accent s-accent')));
  [6, 18, 30].forEach((t) => (b += text(X(t), Y0 + 14, '12 y', 't t-sm t-dim')));
  b += text(X1 + 6, Y0 + 30, 'years at 6%', 't t-sm t-dim t-end');
  return svg(340, 210, b, 'Exponential growth at 6% a year: the amount doubles at 12, 24 and 36 years, equally spaced');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Rule of 72',
    category: 'est',
    tier: 'Foundation',
    order: 40,
    idea: 'At r% a year, money doubles in about 72 ÷ r years.',
  },
  card: {
    prose: [
      'Doubling takes ln 2 ÷ ln(1 + r/100) ≈ 69.3 ÷ r years; 72 is used for its many divisors.',
      'Read it backwards for the rate: doubling in n years needs about 72 ÷ n percent.',
      'Doublings stack: ×4 takes twice as long, ×8 three times.',
    ],
    example: make(DOUBLE, 6, 0, 0, 1),
    graphic: diagram,
    caption: 'At 6% the curve reaches ×2, ×4 and ×8 at equal steps of 72 ÷ 6 = 12 years.',
  },
  levels,
  generate(rng, level) {
    const amt = rng.chance(0.4) ? rng.pick(AMOUNTS) : 0;
    if (level === 1) return make(DOUBLE, rng.pick(DIVIDES), 0, amt, level);
    if (level === 2) {
      const x = rng.pick(OTHER);
      return make(DOUBLE_ODD, x, 72 % x === 0 ? 0 : rng.chance(0.5) ? 1 : 0, amt, level);
    }
    if (rng.chance(0.5)) {
      const n = rng.pick(YEARS);
      return make(RATE, n, 72 % n === 0 ? 0 : 1, amt, level);
    }
    const x = rng.pick([...DIVIDES, ...OTHER]);
    return make(QUAD, x, 144 % x === 0 ? 0 : 1, amt, level);
  },
  steps(p) {
    const { kind, x, dp } = p.data;
    const s: Step[] = [{ op: '', expr: p.text }];
    const exact = numer(kind) % x === 0;
    if (kind === QUAD) {
      s.push({ expr: `2 × 72 ÷ ${x}`, note: 'two doublings' });
      s.push({ expr: `144 ÷ ${x}` });
    } else {
      s.push({ expr: `72 ÷ ${x}`, note: kind === RATE ? 'rule of 72, reversed' : 'rule of 72' });
    }
    if (exact) {
      s.push({ expr: String(numer(kind) / x) });
      return s;
    }
    const tenths = ruleValue(kind, x, 1);
    const t1 = scaled(tenths, 1);
    const back = x * tenths;
    if (back === numer(kind) * 10) s.push({ expr: t1 });
    else s.push({ op: '≈', expr: t1, note: `${x} × ${t1} = ${scaled(back, 1)}` });
    if (!dp) s.push({ op: '≈', expr: String(ruleValue(kind, x, 0)), note: 'nearest year' });
    return s;
  },
  reference: (p) => truth(p.data.kind, p.data.x),
});
