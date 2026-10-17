import { defineTechnique } from '../define';
import { arrowHead, circle, line, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'casting-elevens';
const M = 11;
const HINT = 'remainder 0–10';

const mod = (v: number) => ((v % M) + M) % M;

/** Bring v into 0–10 by adding or taking away 11s. */
function settle(steps: Step[], v: number): number {
  const r = mod(v);
  if (v < 0) steps.push({ op: '', expr: `${fmt(v)} + ${r - v} = ${r}`, note: r - v > M ? 'below 0: add 11s' : 'below 0: add 11' });
  else if (v > 10) steps.push({ op: '', expr: `${v} − ${v - r} = ${r}`, note: v - r > M ? 'take away 11s' : 'take away 11' });
  return r;
}

/** Add the digits in the ones, hundreds, … spots; add the others; subtract; settle into 0–10. */
function figure(steps: Step[], n: number, head: string): number {
  const ds = digits(n).reverse();
  const plus = ds.filter((_, i) => i % 2 === 0);
  const minus = ds.filter((_, i) => i % 2 === 1);
  const sp = plus.reduce((x, y) => x + y, 0);
  const sm = minus.reduce((x, y) => x + y, 0);
  if (plus.length > 1) steps.push({ op: '', expr: `${plus.join(' + ')} = ${sp}`, note: `${head}ones, hundreds…` });
  if (minus.length > 1) steps.push({ op: '', expr: `${minus.join(' + ')} = ${sm}`, note: 'tens, thousands…' });
  const diff = sp - sm;
  steps.push({ op: '', expr: `${sp} − ${sm} = ${fmt(diff)}`, note: 'first total minus second' });
  return settle(steps, diff);
}

/** What each level asks for: one number, a sum of three, a product of two, or a product of three. */
type Kind = 'num' | 'sum' | 'prod' | 'prod3';
const KIND: Record<Level, Kind> = { 1: 'num', 2: 'num', 3: 'sum', 4: 'prod', 5: 'prod', 6: 'prod3' };

function solve(p: Problem): Step[] {
  const steps: Step[] = [{ op: '', expr: p.text }];
  const kind = KIND[p.level];
  if (kind === 'num') {
    const r = figure(steps, p.data.N, '');
    steps.push({ expr: String(r), note: 'the remainder' });
    return steps;
  }
  const ops = kind === 'prod' ? [p.data.a, p.data.b] : [p.data.a, p.data.b, p.data.c];
  const figs = ops.map((n) => figure(steps, n, `${fmt(n)}: `));
  let r: number;
  if (kind === 'sum') {
    const s = figs.reduce((x, y) => x + y, 0);
    steps.push({ op: '', expr: `${figs.join(' + ')} = ${s}`, note: 'add the three figures' });
    r = settle(steps, s);
  } else if (kind === 'prod') {
    const s = figs[0] * figs[1];
    steps.push({ op: '', expr: `${figs[0]} × ${figs[1]} = ${s}`, note: 'multiply the figures' });
    r = settle(steps, s);
  } else {
    // Three figures: multiply two, shrink, then bring in the third.
    const s = figs[0] * figs[1];
    steps.push({ op: '', expr: `${figs[0]} × ${figs[1]} = ${s}`, note: 'multiply the first two figures' });
    const r1 = settle(steps, s);
    const t = r1 * figs[2];
    steps.push({ op: '', expr: `${r1} × ${figs[2]} = ${t}`, note: 'times the third figure' });
    r = settle(steps, t);
  }
  steps.push({ expr: String(r), note: 'the remainder' });
  return steps;
}

function make(level: Level, data: Record<string, number>): Problem {
  const kind = KIND[level];
  const text =
    kind === 'num'
      ? `${fmt(data.N)} mod ${M}`
      : kind === 'sum'
        ? `(${fmt(data.a)} + ${fmt(data.b)} + ${fmt(data.c)}) mod ${M}`
        : kind === 'prod'
          ? `${fmt(data.a)} × ${fmt(data.b)} mod ${M}`
          : `${fmt(data.a)} × ${fmt(data.b)} × ${fmt(data.c)} mod ${M}`;
  const p: Problem = { technique: ID, level, text, answer: '', data, hint: HINT };
  const steps = solve(p);
  p.answer = steps[steps.length - 1].expr;
  return p;
}

const levels = {
  1: { label: '3-digit number', bounds: { N: [100, 999] } },
  2: { label: '4–6-digit number', bounds: { N: [1000, 999999] } },
  3: { label: 'sum of three 3–4-digit numbers', bounds: { a: [100, 9999], b: [100, 9999], c: [100, 9999] } },
  4: { label: 'product of 3–4-digit numbers', bounds: { a: [100, 9999], b: [100, 9999] } },
  5: { label: 'product of 5–6-digit numbers', bounds: { a: [10000, 999999], b: [10000, 999999] } },
  6: { label: 'product of three 4–5-digit numbers', bounds: { a: [1000, 99999], b: [1000, 99999], c: [1000, 99999] } },
} as const satisfies Levels;

/** An operand with `lo` or `lo + 1` digits, either length equally likely. */
const operand = (rng: Rng, lo = 3) =>
  rng.chance(0.5) ? nonRound(rng, 10 ** (lo - 1), 10 ** lo - 1) : nonRound(rng, 10 ** lo, 10 ** (lo + 1) - 1);

/** A circled stage number. */
const stage = (x: number, y: number, n: number) => circle(x, y, 8, 'f-paper s-accent') + text(x, y, n, 't t-sm t-accent');

/** 58,436: add every other digit from the ones, add the rest, subtract. */
function diagram(): string {
  const ds = [5, 8, 4, 3, 6];
  const x = (i: number) => 110 + i * 42;
  let body = '';
  ds.forEach((d, i) => {
    const plus = (ds.length - 1 - i) % 2 === 0;
    body += text(x(i), 30, plus ? '+' : '−', plus ? 't t-accent t-b' : 't t-dim t-b');
    body += text(x(i), 60, d, plus ? 't t-lg t-b' : 't t-lg t-dim');
  });
  body += line(x(4) + 12, 86, x(0) - 12, 86, 's-dim');
  body += arrowHead(x(0) - 16, 86, -1, 0, 'f-dim');
  body += text(x(4) + 18, 86, 'start', 't t-sm t-dim t-start');
  body += stage(28, 124, 1) + text(56, 124, '6 + 4 + 5 = 15', 't t-start');
  body += stage(28, 160, 2) + text(56, 160, '3 + 8 = 11', 't t-start');
  body += stage(28, 196, 3) + text(56, 196, '15 − 11 = 4', 't t-start');
  body += text(250, 196, 'remainder 4', 't t-accent t-b');
  return svg(340, 220, body, '58,436: from the ones digit, add every other digit, 6 plus 4 plus 5 is 15; add the skipped digits, 3 plus 8 is 11; 15 minus 11 leaves remainder 4');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Casting out elevens',
    category: 'check',
    tier: 'Core',
    order: 20,
    idea: 'Add every other digit from the ones, add the skipped digits, subtract, then fix with 11s.',
  },
  card: {
    prose: [
      'Starting at the ones digit, add every other digit. Then add the digits you skipped.',
      'Take the second total from the first.',
      'Add or take away 11s until the result is between 0 and 10. That is the remainder.',
    ],
    example: make(2, { N: 58436 }),
    graphic: diagram,
    caption: 'Add the marked digits, add the others, then subtract the second total from the first.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) return make(level, { N: nonRound(rng, 100, 999) });
    if (level === 2) {
      const len = rng.int(4, 6);
      return make(level, { N: nonRound(rng, 10 ** (len - 1), 10 ** len - 1) });
    }
    if (level === 3) return make(level, { a: operand(rng), b: operand(rng), c: operand(rng) });
    if (level === 4) return make(level, { a: operand(rng), b: operand(rng) });
    if (level === 5) return make(level, { a: operand(rng, 5), b: operand(rng, 5) });
    return make(level, { a: operand(rng, 4), b: operand(rng, 4), c: operand(rng, 4) });
  },
  steps: solve,
});
