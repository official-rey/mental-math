import { defineTechnique } from '../define';
import { path, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'casting-nines';
const M = 9;
const HINT = 'remainder 0–8';

/** Check figure of n from its digit sum, with the working as a short note. */
function check(n: number): { r: number; note: string } {
  const ds = digits(n);
  const s = ds.reduce((x, y) => x + y, 0);
  const r = s % M;
  return { r, note: `${ds.join('+')} = ${s}${s >= M ? ` → ${r}` : ''}` };
}

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

/** Reduce a total to its remainder: one line if it is already below 9, else two. */
function finish(steps: Step[], v: number, note: string): void {
  const r = v % M;
  if (v === r) {
    steps.push({ expr: String(r), note });
    return;
  }
  steps.push({ expr: `${v} mod ${M}`, note });
  steps.push({ expr: String(r), note: `${v} − ${v - r}` });
}

function solve(p: Problem): Step[] {
  const steps: Step[] = [{ op: '', expr: p.text }];
  if (p.level === 1) {
    const { dropped, kept } = castOut(p.data.N);
    const note = dropped.length ? `drop ${dropped.join(', ')}` : 'digit sum';
    if (kept.length <= 1) {
      steps.push({ expr: String(kept.length ? kept[0] : 0), note });
      return steps;
    }
    steps.push({ expr: `(${kept.join(' + ')}) mod ${M}`, note });
    finish(steps, kept.reduce((x, y) => x + y, 0), 'add');
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

/** 538,264: 5+4 and 3+6 drop out, 8 + 2 is left. */
function diagram(): string {
  const ds = [5, 3, 8, 2, 6, 4];
  const keep = [false, false, true, true, false, false];
  const x = (i: number) => 70 + i * 40;
  const y = 100;
  let body = '';
  body += path(`M${x(0)},${y - 16} Q${(x(0) + x(5)) / 2},${y - 90} ${x(5)},${y - 16}`, 's-dim f-none');
  body += text((x(0) + x(5)) / 2, y - 64, '9', 't t-sm t-dim');
  body += path(`M${x(1)},${y - 16} Q${(x(1) + x(4)) / 2},${y - 48} ${x(4)},${y - 16}`, 's-dim f-none');
  body += text((x(1) + x(4)) / 2, y - 42, '9', 't t-sm t-dim');
  ds.forEach((d, i) => (body += text(x(i), y, d, keep[i] ? 't t-lg t-accent t-b' : 't t-lg t-dim')));
  body += text(170, 145, '8 + 2 = 10 → 1', 't t-accent t-b');
  body += text(170, 180, '10 ≡ 1 (mod 9): each digit counts once', 't t-sm t-dim');
  return svg(340, 200, body, 'Digits of 538,264: 5 and 4 pair to 9, 3 and 6 pair to 9, leaving 8 plus 2, which is 10, remainder 1');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Casting out nines',
    category: 'check',
    tier: 'Foundation',
    order: 10,
    idea: 'A number and its digit sum leave the same remainder on division by 9.',
  },
  card: {
    prose: [
      'Since 10 ≡ 1 (mod 9), a number is congruent to its digit sum; drop 9s and digits that pair to 9.',
      'Remainders respect + and ×, so a sum or product is checked from the operands’ check figures.',
      'Matching check figures are necessary for a correct answer, not sufficient.',
    ],
    example: make(1, { N: 538264 }),
    graphic: diagram,
    caption: '5+4 and 3+6 make 9 and drop out; 8 + 2 = 10 leaves 1, so 538,264 leaves 1.',
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
