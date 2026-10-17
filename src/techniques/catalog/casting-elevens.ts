import { defineTechnique } from '../define';
import { arrowHead, line, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'casting-elevens';
const M = 11;
const HINT = 'remainder 0–10';

const mod = (v: number) => ((v % M) + M) % M;

/** Digits from the units up, with alternating signs: 58436 → "6 − 3 + 4 − 8 + 5" and its value. */
function alternate(n: number, sep: string): { terms: string; sum: number } {
  const ds = digits(n).reverse();
  let terms = '', sum = 0;
  ds.forEach((d, i) => {
    const plus = i % 2 === 0;
    sum += plus ? d : -d;
    terms += i === 0 ? String(d) : `${sep}${plus ? '+' : '−'}${sep}${d}`;
  });
  return { terms, sum };
}

/** Check figure of n with its working as a short note. */
function check(n: number): { r: number; note: string } {
  const { terms, sum } = alternate(n, '');
  const r = mod(sum);
  return { r, note: `${terms} = ${fmt(sum)}${r !== sum ? ` → ${r}` : ''}` };
}

/** Reduce a total to its remainder: one line if it is already in 0–10, else two. */
function finish(steps: Step[], v: number, note: string): void {
  const r = mod(v);
  if (v === r) {
    steps.push({ expr: String(r), note });
    return;
  }
  steps.push({ expr: `${fmt(v)} mod ${M}`, note });
  steps.push({ expr: String(r), note: v < 0 ? `${fmt(v)} + ${r - v}` : `${v} − ${v - r}` });
}

function solve(p: Problem): Step[] {
  const steps: Step[] = [{ op: '', expr: p.text }];
  if (p.level === 1) {
    const { terms, sum } = alternate(p.data.N, ' ');
    steps.push({ expr: `(${terms}) mod ${M}`, note: 'alternate from right' });
    finish(steps, sum, 'add');
    return steps;
  }
  const ops = p.level === 2 ? [p.data.a, p.data.b, p.data.c] : [p.data.a, p.data.b];
  const figs = ops.map((n) => {
    const c = check(n);
    steps.push({ op: '→', expr: `${fmt(n)} ≡ ${c.r}`, note: c.note });
    return c.r;
  });
  if (p.level === 2) {
    steps.push({ expr: `(${figs.join(' + ')}) mod ${M}`, note: 'check figures' });
    finish(steps, figs.reduce((x, y) => x + y, 0), 'add');
  } else {
    steps.push({ expr: `(${figs.join(' × ')}) mod ${M}`, note: 'check figures' });
    finish(steps, figs[0] * figs[1], 'multiply');
  }
  return steps;
}

function make(level: Level, data: Record<string, number>): Problem {
  const text =
    level === 1
      ? `${fmt(data.N)} mod ${M}`
      : level === 2
        ? `(${fmt(data.a)} + ${fmt(data.b)} + ${fmt(data.c)}) mod ${M}`
        : `${fmt(data.a)} × ${fmt(data.b)} mod ${M}`;
  const p: Problem = { technique: ID, level, text, answer: '', data, hint: HINT };
  const steps = solve(p);
  p.answer = steps[steps.length - 1].expr;
  return p;
}

const levels = {
  1: { label: '4–6-digit number', bounds: { N: [1000, 999999] } },
  2: { label: 'sum of three 3–4-digit numbers', bounds: { a: [100, 9999], b: [100, 9999], c: [100, 9999] } },
  3: { label: 'product of 3–4-digit numbers', bounds: { a: [100, 9999], b: [100, 9999] } },
} as const satisfies Levels;

/** A 3- or 4-digit operand. */
const operand = (rng: Rng) => (rng.chance(0.5) ? nonRound(rng, 100, 999) : nonRound(rng, 1000, 9999));

/** 58,436 with its alternating signs from the right. */
function diagram(): string {
  const ds = [5, 8, 4, 3, 6];
  const x = (i: number) => 74 + i * 48;
  let body = '';
  ds.forEach((d, i) => {
    const plus = (ds.length - 1 - i) % 2 === 0;
    body += text(x(i), 34, plus ? '+' : '−', plus ? 't t-accent t-b' : 't t-dim t-b');
    body += text(x(i), 66, d, 't t-lg');
  });
  body += line(x(4) + 14, 92, x(0) - 14, 92, 's-dim');
  body += arrowHead(x(0) - 18, 92, -1, 0, 'f-dim');
  body += text(x(4) + 22, 92, 'start', 't t-sm t-dim t-start');
  body += text(170, 128, '6 − 3 + 4 − 8 + 5 = 4', 't t-accent t-b');
  body += text(170, 166, '10 ≡ −1 (mod 11), so place values', 't t-sm t-dim');
  body += text(170, 184, 'alternate +1, −1 from the units', 't t-sm t-dim');
  return svg(340, 200, body, 'Digits of 58,436 signed alternately from the right: 6 minus 3 plus 4 minus 8 plus 5 equals 4');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Casting out elevens',
    category: 'check',
    tier: 'Core',
    order: 20,
    idea: 'The alternating digit sum, taken from the units, gives the remainder on division by 11.',
  },
  card: {
    prose: [
      'Since 10 ≡ −1 (mod 11), place values alternate +1, −1, starting at the units.',
      'Add and subtract the digits from the right; if the total is negative or above 10, adjust by 11s.',
      'It catches swapped adjacent digits, which casting out nines cannot see.',
    ],
    example: make(1, { N: 58436 }),
    graphic: diagram,
    caption: 'From the right, 6 − 3 + 4 − 8 + 5 = 4, so 58,436 leaves remainder 4.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      const len = rng.int(4, 6);
      return make(level, { N: nonRound(rng, 10 ** (len - 1), 10 ** len - 1) });
    }
    if (level === 2) return make(level, { a: operand(rng), b: operand(rng), c: operand(rng) });
    return make(level, { a: operand(rng), b: operand(rng) });
  },
  steps: solve,
});
