import { defineTechnique } from '../define';
import { line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { fmt, scaled } from '../util';

const ID = 'percentages';

/** Values are held as integers in millionths, so every percentage of a 2-decimal amount is exact. */
const UNIT = 1_000_000;
const toU = (x: number) => Math.round(x * UNIT);
/** r% of v, with r given in tenths of a percent (175 = 17.5%). */
const pctU = (v: number, r10: number) => (v * r10) / 1000;
const show = (u: number) => fmt(scaled(Math.round(u), 6));

/** Amount as displayed: bills with cents keep two decimals (47.50). */
const money = (y: number) => (Number.isInteger(y) ? fmt(y) : fmt(y.toFixed(2)));

function make(r: number, y: number, level: Level, swap = 0): Problem {
  const ans = pctU(toU(y), Math.round(r * 10));
  return {
    technique: ID,
    level,
    text: `${r}% of ${money(y)}`,
    expr: `${r} × ${y} ÷ 100`,
    answer: scaled(Math.round(ans), 6),
    data: { r, y, swap },
  };
}

/** True when r% of y has at most two decimals. */
const clean = (r: number, y: number) => Number.isInteger(pctU(toU(y), Math.round(r * 10)) / 10_000);

const levels = {
  1: { label: '10, 20, 5, 50, 25%', bounds: { r: [5, 50], y: [12, 999], swap: [0, 0] } },
  2: { label: 'tips: 15, 18, 20%', bounds: { r: [15, 20], y: [12, 150.8], swap: [0, 0] } },
  3: { label: 'awkward rates, swaps', bounds: { r: [3, 96], y: [12, 480], swap: [0, 1] } },
} as const satisfies Levels;

/** Bar of ten 10% blocks for 84, with one block and a half picked out. */
function diagram(): string {
  const x0 = 20, w = 30, y = 52, h = 34;
  let b = '';
  for (let i = 0; i < 10; i++) b += rect(x0 + i * w, y, w, h, i === 0 ? 'f-soft s-accent' : 'f-raised s-ink');
  b += rect(x0 + w, y, w / 2, h, 'f-soft s-accent');
  b += text(x0, y - 28, '10% = 8.4', 't t-sm t-accent t-start');
  b += text(x0 + w, y - 12, '5% = 4.2', 't t-sm t-accent t-start');
  b += text(x0 + 10 * w, y - 12, '84', 't t-sm t-dim');
  b += text(x0 + 5.5 * w, y + h + 13, 'each block 8.4', 't t-sm t-dim');
  b += line(x0, y + h + 30, x0 + 1.5 * w, y + h + 30, 's-accent s-thick');
  b += text(x0, y + h + 50, '15% = 8.4 + 4.2 = 12.6', 't t-accent t-start');
  return svg(340, 154, b, 'A bar for 84 split into ten blocks of 8.4; one block plus half a block is 15%, which is 12.6');
}

/** Lines that build r% of y from 10% (or 1%), ending on the answer. */
function build(r: number, y: number, swap: number): Step[] {
  const v = toU(y);
  const P = (r10: number) => show(pctU(v, r10));
  const Y = money(y);
  const ans = P(Math.round(r * 10));
  const s: Step[] = [{ op: '', expr: `${r}% of ${Y}` }];
  const ten = { op: '→', expr: `10% = ${P(100)}`, note: 'shift the point' };
  const one = { op: '→', expr: `1% = ${P(10)}`, note: 'shift two places' };
  if (swap) {
    s.push({ expr: `${Y}% of ${r}`, note: 'x% of y = y% of x' });
    const d = y === 25 ? 4 : y === 50 ? 2 : 5;
    const what = y === 25 ? 'a quarter' : y === 50 ? 'a half' : 'a fifth';
    s.push({ expr: `${r} ÷ ${d}`, note: `${Y}% is ${what}` });
  } else if (r === 10) {
    s.push({ expr: `${Y} ÷ 10`, note: 'shift the point' });
  } else if (r === 20) {
    s.push(ten, { expr: `2 × ${P(100)}`, note: '20% = 2 × 10%' });
  } else if (r === 5) {
    s.push(ten, { expr: `${P(100)} ÷ 2`, note: 'half of 10%' });
  } else if (r === 50) {
    s.push({ expr: `${Y} ÷ 2`, note: '50% is half' });
  } else if (r === 25) {
    s.push({ op: '→', expr: `50% = ${P(500)}`, note: 'half' }, { expr: `${P(500)} ÷ 2`, note: 'half again' });
  } else if (r === 15) {
    s.push(ten, { op: '→', expr: `5% = ${P(50)}`, note: 'half of 10%' }, { expr: `${P(100)} + ${P(50)}` });
  } else if (r === 18) {
    s.push(
      ten,
      { op: '→', expr: `20% = ${P(200)}`, note: 'double 10%' },
      { op: '→', expr: `2% = ${P(20)}`, note: '20% ÷ 10' },
      { expr: `${P(200)} − ${P(20)}`, note: '20% − 2%' },
    );
  } else if (r === 7) {
    s.push(one, { expr: `7 × ${P(10)}` });
  } else if (r === 12) {
    s.push(ten, one, { op: '→', expr: `2% = ${P(20)}`, note: 'double 1%' }, { expr: `${P(100)} + ${P(20)}` });
  } else if (r === 35) {
    s.push(
      ten,
      { op: '→', expr: `30% = ${P(300)}`, note: '3 × 10%' },
      { op: '→', expr: `5% = ${P(50)}`, note: 'half of 10%' },
      { expr: `${P(300)} + ${P(50)}` },
    );
  } else {
    // 17.5% = 10% + 5% + 2.5%
    s.push(
      ten,
      { op: '→', expr: `5% = ${P(50)}`, note: 'half of 10%' },
      { op: '→', expr: `2.5% = ${P(25)}`, note: 'half of 5%' },
      { expr: `${P(100)} + ${P(50)} + ${P(25)}` },
    );
  }
  s.push({ expr: ans });
  return s;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Percentages and tips',
    category: 'est',
    tier: 'Foundation',
    order: 20,
    idea: 'Get 10% by moving the decimal point, then build any rate from it.',
  },
  card: {
    prose: [
      '10% is one decimal shift; halve it for 5%, double it for 20%, shift again for 1%.',
      'Assemble other rates from those pieces: 15% = 10% + 5%, 18% = 20% − 2%.',
      'x% of y equals y% of x, so 8% of 25 is 25% of 8.',
    ],
    example: make(15, 84, 2),
    graphic: diagram,
    caption: 'Ten blocks of 8.4 make 84; one block and a half block give 15%.',
  },
  levels,
  generate(rng, level) {
    for (;;) {
      if (level === 1) {
        const r = rng.pick([10, 20, 5, 50, 25] as const);
        const y = rng.chance(0.3) ? rng.int(12, 99) : rng.int(100, 999);
        if (y % 10 === 0) continue;
        return make(r, y, level);
      }
      if (level === 2) {
        const r = rng.pick([15, 18, 20] as const);
        const cents = rng.pick([0, 0, 0, 50, 50, 20, 40, 60, 80] as const);
        const y = rng.int(12, 150) + cents / 100;
        if (y > 150.8 || !clean(r, y)) continue;
        return make(r, y, level);
      }
      if (rng.chance(0.3)) {
        const y = rng.pick([20, 25, 50] as const);
        const r = rng.int(3, 96);
        if (r % 10 === 0 || r % y === 0 || r === y) continue;
        return make(r, y, level, 1);
      }
      const r = rng.pick([7, 12, 35, 17.5] as const);
      const y = rng.int(12, 480);
      if (y % 10 === 0 || !clean(r, y)) continue;
      return make(r, y, level);
    }
  },
  steps: (p) => build(p.data.r, p.data.y, p.data.swap),
});
