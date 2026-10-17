import { defineTechnique } from '../define';
import { chain } from '../svg';
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

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Rule of 72',
    category: 'est',
    tier: 'Foundation',
    order: 40,
    idea: 'Divide 72 by the yearly rate to get the years it takes to double.',
  },
  card: {
    prose: [
      'Divide 72 by the yearly rate: the result is the years until the money doubles.',
      'Asked for the rate that doubles it in so many years? Divide 72 by the years instead.',
      'To quadruple, double 72 to 144 first, then divide.',
    ],
    example: make(DOUBLE, 6, 0, 0, 1),
    graphic: () =>
      chain({
        start: '72',
        moves: [
          { op: '÷ 6, the rate', value: '12' },
          { op: '× 2, for ×4', value: '24' },
        ],
        label: 'Rule of 72 at 6% a year: 72 divided by 6 is 12 years to double; twice that, 24 years, to quadruple',
      }),
    caption: 'Divide 72 by the rate for the years to double; twice as long gets you ×4.',
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
    const top = numer(kind);
    const by = kind === RATE ? 'divide 72 by the years' : 'divide by the rate';
    const what = kind === RATE ? '% a year' : kind === QUAD ? 'years to quadruple' : 'years to double';
    if (kind === QUAD) s.push({ op: '', expr: '72 × 2 = 144', note: 'two doublings' });
    if (top % x === 0) {
      s.push({ op: '', expr: `${top} ÷ ${x} = ${top / x}`, note: by });
      s.push({ expr: String(top / x), note: what });
      return s;
    }
    const tenths = ruleValue(kind, x, 1);
    const t1 = scaled(tenths, 1);
    const back = x * tenths;
    if (back === top * 10) {
      s.push({ op: '', expr: `${top} ÷ ${x} = ${t1}`, note: by });
    } else {
      s.push({ op: '', expr: `${top} ÷ ${x}`, note: by });
      const guess = dp ? tenths : ruleValue(kind, x, 0);
      const g = dp ? t1 : String(guess);
      s.push({ op: '', expr: `${x} × ${g} = ${dp ? scaled(back, 1) : x * guess}`, note: `try ${g}: close to ${top}` });
    }
    const exactTenths = back === top * 10;
    if (dp) s.push(exactTenths ? { expr: t1, note: what } : { op: '≈', expr: t1, note: what });
    else s.push({ op: '≈', expr: String(ruleValue(kind, x, 0)), note: `${what}, rounded` });
    return s;
  },
  reference: (p) => truth(p.data.kind, p.data.x),
});
