import { defineTechnique } from '../define';
import { chain } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'rule-72';

/** Question kinds. */
const DOUBLE = 0, DOUBLE_ODD = 1, RATE = 2, QUAD = 3, EIGHT = 4, RATE_QUAD = 5;

const DIVIDES = [2, 3, 4, 6, 8, 9, 12] as const;
const OTHER = [5, 7, 10, 11, 14, 15, 16, 18] as const;
const YEARS = [4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 36] as const;
const EASY = [2, 4, 6, 8, 9, 12] as const;
/** Rates that divide 216, for growing ×8. */
const DIVIDES_216 = [3, 4, 6, 8, 9, 12, 18] as const;
/** Years to quadruple, for the rate question. */
const QUAD_YEARS = [8, 9, 10, 12, 15, 16, 18, 20, 24, 30, 36] as const;
const HALF_RATES = [1.5, 2.5, 3.5, 4.5, 7.5] as const;
const AMOUNTS = [100, 200, 250, 300, 400, 500, 600, 800, 1500, 2500] as const;

/** Numerator of the rule: 72 per doubling. */
const numer = (kind: number) => (kind === EIGHT ? 216 : kind === QUAD || kind === RATE_QUAD ? 144 : 72);
/** How many times the money grows. */
const growth = (kind: number) => (kind === EIGHT ? 8 : kind === QUAD || kind === RATE_QUAD ? 4 : 2);
const isRate = (kind: number) => kind === RATE || kind === RATE_QUAD;

/** Rule-of-72 answer in tenths (dp = 1) or whole units (dp = 0). */
function ruleValue(kind: number, x: number, dp: number): number {
  return dp ? Math.round((numer(kind) * 10) / x) : Math.round(numer(kind) / x);
}

/** True compound-interest value: years for ×2, ×4 or ×8 at x%, or the rate that doubles (or quadruples) in x years. */
function truth(kind: number, x: number): number {
  if (isRate(kind)) return (growth(kind) ** (1 / x) - 1) * 100;
  return Math.log(growth(kind)) / Math.log(1 + x / 100);
}

function make(kind: number, x: number, dp: number, amt: number, level: Level): Problem {
  const v = ruleValue(kind, x, dp);
  const answer = dp ? scaled(v, 1) : String(v);
  const ref = truth(kind, x);
  // Fair to the rule (and to 70 or 69.3 in place of 72), strict enough to reject guesses.
  const tolerance = Math.ceil(Math.max(Math.abs(Number(answer) - ref), 0.06 * ref) * 2) / 2;
  const mult = growth(kind);
  let t: string;
  if (isRate(kind)) {
    t = amt
      ? `$${fmt(amt)} → $${fmt(amt * mult)} in ${x} years`
      : `${kind === RATE_QUAD ? 'Quadruple' : 'Double'} in ${x} years`;
  } else if (amt) t = `$${fmt(amt)} → $${fmt(amt * mult)} at ${x}%`;
  else t = `${kind === EIGHT ? 'Grow ×8' : kind === QUAD ? 'Quadruple' : 'Double'} at ${x}% a year`;
  const hint = isRate(kind)
    ? dp ? '% a year, 1 decimal' : '% a year'
    : kind === DOUBLE_ODD && !dp ? 'nearest year' : dp ? 'years, 1 decimal' : 'years';
  return { technique: ID, level, text: t, answer, tolerance, hint, data: { kind, x, dp, amt } };
}

const levels = {
  1: { label: 'easy rates, no amounts', bounds: { kind: [0, 0], x: [2, 12], dp: [0, 0], amt: [0, 0] } },
  2: { label: 'rates that divide 72', bounds: { kind: [0, 0], x: [2, 12], dp: [0, 0], amt: [0, 2500] } },
  3: { label: 'other rates', bounds: { kind: [1, 1], x: [5, 18], dp: [0, 1], amt: [0, 2500] } },
  4: { label: 'rate to double, ×4', bounds: { kind: [2, 3], x: [2, 36], dp: [0, 1], amt: [0, 2500] } },
  5: { label: '×8, rate to ×4', bounds: { kind: [4, 5], x: [3, 36], dp: [0, 1], amt: [0, 2500] } },
  6: { label: 'half-percent rates, ×8 at any rate', bounds: { kind: [0, 4], x: [1.5, 18], dp: [0, 1], amt: [0, 2500] } },
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
    example: make(DOUBLE, 6, 0, 0, 2),
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
    /** Whole answer when the rule divides evenly, otherwise 1 decimal. */
    const dpFor = (kind: number, x: number) => (numer(kind) % x === 0 ? 0 : 1);
    if (level === 1) return make(DOUBLE, rng.pick(EASY), 0, 0, level);
    if (level === 2) return make(DOUBLE, rng.pick(DIVIDES), 0, amt, level);
    if (level === 3) {
      const x = rng.pick(OTHER);
      return make(DOUBLE_ODD, x, 72 % x === 0 ? 0 : rng.chance(0.5) ? 1 : 0, amt, level);
    }
    if (level === 4) {
      if (rng.chance(0.5)) {
        const n = rng.pick(YEARS);
        return make(RATE, n, dpFor(RATE, n), amt, level);
      }
      const x = rng.pick([...DIVIDES, ...OTHER]);
      return make(QUAD, x, dpFor(QUAD, x), amt, level);
    }
    if (level === 5) {
      if (rng.chance(0.5)) return make(EIGHT, rng.pick(DIVIDES_216), 0, amt, level);
      const n = rng.pick(QUAD_YEARS);
      return make(RATE_QUAD, n, dpFor(RATE_QUAD, n), amt, level);
    }
    if (rng.chance(0.4)) {
      const x = rng.pick(OTHER);
      return make(EIGHT, x, dpFor(EIGHT, x), amt, level);
    }
    const kind = rng.chance(0.5) ? QUAD : DOUBLE;
    const x = rng.pick(HALF_RATES);
    const dp = dpFor(kind, x);
    return make(kind === DOUBLE && dp ? DOUBLE_ODD : kind, x, dp, amt, level);
  },
  steps(p) {
    const { kind, x, dp } = p.data;
    const s: Step[] = [{ op: '', expr: p.text }];
    let top = numer(kind);
    let by = isRate(kind) ? `divide ${top} by the years` : 'divide by the rate';
    const what = isRate(kind)
      ? '% a year'
      : kind === EIGHT ? 'years to grow ×8' : kind === QUAD ? 'years to quadruple' : 'years to double';
    if (kind === QUAD || kind === RATE_QUAD) s.push({ op: '', expr: '72 × 2 = 144', note: 'two doublings' });
    if (kind === EIGHT) s.push({ op: '', expr: '72 × 3 = 216', note: 'three doublings' });
    // Half-percent rates: double both numbers so the divisor is whole (72 ÷ 4.5 = 144 ÷ 9).
    let d = x;
    if (!Number.isInteger(x)) {
      s.push({ op: '', expr: `${top} ÷ ${x} = ${top * 2} ÷ ${x * 2}`, note: 'double both: no decimal' });
      top *= 2;
      d = x * 2;
      by = 'now divide';
    }
    if (top % d === 0) {
      s.push({ op: '', expr: `${top} ÷ ${d} = ${top / d}`, note: by });
      s.push({ expr: String(top / d), note: what });
      return s;
    }
    const tenths = ruleValue(kind, x, 1);
    const t1 = scaled(tenths, 1);
    const back = d * tenths;
    if (back === top * 10) {
      s.push({ op: '', expr: `${top} ÷ ${d} = ${t1}`, note: by });
    } else {
      s.push({ op: '', expr: `${top} ÷ ${d}`, note: by });
      const guess = dp ? tenths : ruleValue(kind, x, 0);
      const g = dp ? t1 : String(guess);
      s.push({ op: '', expr: `${d} × ${g} = ${dp ? scaled(back, 1) : d * guess}`, note: `try ${g}: close to ${top}` });
    }
    const exactTenths = back === top * 10;
    if (dp) s.push(exactTenths ? { expr: t1, note: what } : { op: '≈', expr: t1, note: what });
    else s.push({ op: '≈', expr: String(ruleValue(kind, x, 0)), note: `${what}, rounded` });
    return s;
  },
  reference: (p) => truth(p.data.kind, p.data.x),
});
