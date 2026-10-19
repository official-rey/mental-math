import { defineTechnique } from '../define';
import { circle, line, path, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'casting-nines';
const M = 9;
const HINT = 'remainder 0–8';

/** Cast out 9s, 0s and digit pairs that make 9; return what is dropped and what is left. */
function castOut(n: number): { dropped: string[]; kept: number[] } {
  const ds = digits(n);
  const used = ds.map(() => false);
  const dropped: string[] = [];
  ds.forEach((d, i) => {
    if (used[i]) return;
    if (d === 0 || d === 9) {
      used[i] = true;
      dropped.push(String(d));
      return;
    }
    const j = ds.findIndex((e, k) => k > i && !used[k] && e === M - d);
    if (j >= 0) {
      used[i] = used[j] = true;
      dropped.push(`${d}+${ds[j]}`);
    }
  });
  return { dropped, kept: ds.filter((_, i) => !used[i]) };
}

/** Shrink a total below 9 by adding its digits; a 9 counts as 0. Returns the remainder. */
function reduce(steps: Step[], v: number): number {
  while (v > 9) {
    const ds = digits(v);
    const s = ds.reduce((x, y) => x + y, 0);
    steps.push({ op: '', expr: `${ds.join(' + ')} = ${s}`, note: `add the digits of ${v}` });
    v = s;
  }
  if (v === 9) {
    steps.push({ op: '', expr: '9 − 9 = 0', note: 'a 9 counts as 0' });
    v = 0;
  }
  return v;
}

/** Check figure of one operand: add its digits (skipping 9s and 0s), then shrink. */
function figure(steps: Step[], n: number): number {
  const ds = digits(n);
  const kept = ds.filter((d) => d !== 0 && d !== 9);
  const skip = kept.length < ds.length ? ', skip 9s/0s' : '';
  if (kept.length === 0) {
    steps.push({ op: '', expr: '0', note: `${fmt(n)}: all 9s and 0s` });
    return 0;
  }
  if (kept.length === 1) {
    steps.push({ op: '', expr: String(kept[0]), note: `${fmt(n)}: one digit left` });
    return kept[0];
  }
  const s = kept.reduce((x, y) => x + y, 0);
  steps.push({ op: '', expr: `${kept.join(' + ')} = ${s}`, note: `digits of ${fmt(n)}${skip}` });
  return reduce(steps, s);
}

/** What each level asks for: one number, a sum of three, a product of two, or a product of three. */
type Kind = 'num' | 'sum' | 'prod' | 'prod3';
const KIND: Record<Level, Kind> = { 1: 'num', 2: 'num', 3: 'sum', 4: 'prod', 5: 'prod', 6: 'prod3' };

function solve(p: Problem): Step[] {
  const steps: Step[] = [{ op: '', expr: p.text }];
  const kind = KIND[p.level];
  if (kind === 'num') {
    const { dropped, kept } = castOut(p.data.N);
    const nines = dropped.filter((d) => d === '9').length;
    if (nines) steps.push({ op: '', expr: '9', note: nines > 1 ? 'cross out the 9s' : 'a 9: cross it out' });
    for (const d of dropped) {
      if (d.includes('+')) steps.push({ op: '', expr: `${d.replace('+', ' + ')} = 9`, note: 'makes 9: cross both out' });
    }
    let r: number;
    if (kept.length === 0) r = 0;
    else if (kept.length === 1) r = kept[0];
    else {
      const s = kept.reduce((x, y) => x + y, 0);
      steps.push({ op: '', expr: `${kept.join(' + ')} = ${s}`, note: 'add what is left' });
      r = reduce(steps, s);
    }
    steps.push({ expr: String(r), note: kept.length > 1 ? 'the remainder' : kept.length ? 'only digit left' : 'nothing left' });
    return steps;
  }
  const ops = kind === 'prod' ? [p.data.a, p.data.b] : [p.data.a, p.data.b, p.data.c];
  const figs = ops.map((n) => figure(steps, n));
  let r: number;
  if (kind === 'sum') {
    const s = figs.reduce((x, y) => x + y, 0);
    steps.push({ op: '', expr: `${figs.join(' + ')} = ${s}`, note: 'add the three figures' });
    r = reduce(steps, s);
  } else if (kind === 'prod') {
    const s = figs[0] * figs[1];
    steps.push({ op: '', expr: `${figs[0]} × ${figs[1]} = ${s}`, note: 'multiply the figures' });
    r = reduce(steps, s);
  } else {
    // Three figures: multiply two, shrink, then bring in the third.
    const s = figs[0] * figs[1];
    steps.push({ op: '', expr: `${figs[0]} × ${figs[1]} = ${s}`, note: 'multiply the first two figures' });
    const r1 = reduce(steps, s);
    const t = r1 * figs[2];
    steps.push({ op: '', expr: `${r1} × ${figs[2]} = ${t}`, note: 'times the third figure' });
    r = reduce(steps, t);
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

/** 538,264: cross out the pairs that make 9, add what is left, shrink it. */
function diagram(): string {
  const ds = [5, 3, 8, 2, 6, 4];
  const keep = [false, false, true, true, false, false];
  const x = (i: number) => 90 + i * 36;
  const y = 96;
  let body = '';
  // Stage 1: pairs that make 9, joined by arcs and struck through.
  body += stage(28, y, 1);
  body += path(`M${x(0)},${y - 16} Q${(x(0) + x(5)) / 2},${y - 86} ${x(5)},${y - 16}`, 's-dim f-none');
  body += text((x(0) + x(5)) / 2, y - 60, '9', 't t-sm t-dim');
  body += path(`M${x(1)},${y - 16} Q${(x(1) + x(4)) / 2},${y - 46} ${x(4)},${y - 16}`, 's-dim f-none');
  body += text((x(1) + x(4)) / 2, y - 38, '9', 't t-sm t-dim');
  ds.forEach((d, i) => {
    body += text(x(i), y, d, keep[i] ? 't t-lg t-b' : 't t-lg t-dim');
    if (!keep[i]) body += line(x(i) - 9, y + 9, x(i) + 9, y - 9, 's-dim');
  });
  // Stage 2: add what is left. Stage 3: add its digits.
  body += stage(28, 146, 2) + text(56, 146, '8 + 2 = 10', 't t-start');
  body += stage(28, 186, 3) + text(56, 186, '1 + 0 = 1', 't t-start');
  body += text(250, 186, 'remainder 1', 't t-accent t-b');
  return svg(340, 210, body, '538,264: cross out 5 and 4, and 3 and 6, since each pair makes 9; add the leftover 8 and 2 to get 10; add 1 and 0 to get remainder 1');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Casting out nines',
    category: 'est',
    tier: 'Foundation',
    order: 50,
    idea: 'Cross out 9s and digits that make 9, add the rest, and keep adding digits until one is left.',
  },
  card: {
    prose: [
      'Cross out every 9, every 0, and any two digits that add up to 9.',
      'Add the digits that are left. If the total has two digits, add those; a final 9 counts as 0.',
      'To check a sum or product, do this to each number, then add or multiply the results and shrink again.',
    ],
    example: make(2, { N: 538264 }),
    graphic: diagram,
    caption: 'Cross out the pairs that make 9, add what is left, then shrink it to one digit.',
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
