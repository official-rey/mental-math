import { defineTechnique } from '../define';
import { pieces } from '../svg';
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

const levels = {
  1: { label: '10% and 50%', bounds: { r: [10, 50], y: [12, 198], swap: [0, 0] } },
  2: { label: '10, 20, 5, 50, 25%', bounds: { r: [5, 50], y: [12, 999], swap: [0, 0] } },
  3: { label: 'tips: 15, 18, 20%', bounds: { r: [15, 20], y: [12, 150], swap: [0, 0] } },
  4: { label: 'awkward rates, swaps', bounds: { r: [3, 96], y: [12, 480], swap: [0, 1] } },
  5: { label: '9, 11, 45, 65, 75% of 3-digit', bounds: { r: [9, 75], y: [101, 999], swap: [0, 0] } },
  6: { label: 'eighths and 2.5% steps', bounds: { r: [2.5, 87.5], y: [20, 999], swap: [0, 0] } },
} as const satisfies Levels;

/** Lines that build r% of y from 10% (or 1%), one small operation each, ending on the answer. */
function build(r: number, y: number, swap: number): Step[] {
  const v = toU(y);
  const P = (r10: number) => show(pctU(v, r10));
  const Y = money(y);
  const ans = P(Math.round(r * 10));
  const s: Step[] = [{ op: '', expr: `${r}% of ${Y}` }];
  const st = (expr: string, note: string): Step => ({ op: '', expr, note });
  const ten = st(`${Y} ÷ 10 = ${P(100)}`, '10%: shift the point');
  const half10 = st(`${P(100)} ÷ 2 = ${P(50)}`, '5%: half of 10%');
  const half = st(`${Y} ÷ 2 = ${P(500)}`, '50%: half');
  const quarter = st(`${P(500)} ÷ 2 = ${P(250)}`, '25%: half again');
  if (swap) {
    const d = y === 25 ? 4 : y === 50 ? 2 : 5;
    const what = y === 25 ? 'quarter' : y === 50 ? 'half' : 'fifth';
    s.push(st(`${r} ÷ ${d} = ${ans}`, `swap: ${Y}% of ${r}, a ${what}`));
  } else if (r === 10) {
    s.push(ten);
  } else if (r === 20) {
    s.push(ten, st(`${P(100)} × 2 = ${P(200)}`, '20%: double 10%'));
  } else if (r === 5) {
    s.push(ten, half10);
  } else if (r === 50) {
    s.push(half);
  } else if (r === 25) {
    s.push(half, quarter);
  } else if (r === 15) {
    s.push(ten, half10, st(`${P(100)} + ${P(50)} = ${P(150)}`, '10% + 5%'));
  } else if (r === 18) {
    s.push(
      ten,
      st(`${P(100)} × 2 = ${P(200)}`, '20%: double 10%'),
      st(`${P(200)} ÷ 10 = ${P(20)}`, '2%: shift 20% once more'),
      st(`${P(200)} − ${P(20)} = ${P(180)}`, '20% − 2%'),
    );
  } else if (r === 7) {
    s.push(st(`${Y} ÷ 100 = ${P(10)}`, '1%: shift two places'), st(`${P(10)} × 7 = ${P(70)}`, '7 lots of 1%'));
  } else if (r === 12) {
    s.push(
      ten,
      st(`${P(100)} ÷ 10 = ${P(10)}`, '1%: shift once more'),
      st(`${P(10)} × 2 = ${P(20)}`, '2%: double 1%'),
      st(`${P(100)} + ${P(20)} = ${P(120)}`, '10% + 2%'),
    );
  } else if (r === 35) {
    s.push(
      ten,
      st(`${P(100)} × 3 = ${P(300)}`, '30%: 3 lots of 10%'),
      half10,
      st(`${P(300)} + ${P(50)} = ${P(350)}`, '30% + 5%'),
    );
  } else if (r === 17.5) {
    // 17.5% = 10% + 5% + 2.5%
    s.push(
      ten,
      half10,
      st(`${P(50)} ÷ 2 = ${P(25)}`, '2.5%: half of 5%'),
      st(`${P(100)} + ${P(50)} + ${P(25)} = ${P(175)}`, '10% + 5% + 2.5%'),
    );
  } else if (r === 9 || r === 11) {
    s.push(
      ten,
      st(`${P(100)} ÷ 10 = ${P(10)}`, '1%: shift once more'),
      r === 9
        ? st(`${P(100)} − ${P(10)} = ${P(90)}`, '10% − 1%')
        : st(`${P(100)} + ${P(10)} = ${P(110)}`, '10% + 1%'),
    );
  } else if (r === 45 || r === 65) {
    s.push(half, ten, half10);
    s.push(
      r === 45
        ? st(`${P(500)} − ${P(50)} = ${P(450)}`, '50% − 5%')
        : st(`${P(500)} + ${P(100)} + ${P(50)} = ${P(650)}`, '50% + 10% + 5%'),
    );
  } else if (r === 75) {
    s.push(half, quarter, st(`${P(500)} + ${P(250)} = ${P(750)}`, '50% + 25%'));
  } else if (r === 2.5) {
    s.push(ten, half10, st(`${P(50)} ÷ 2 = ${P(25)}`, '2.5%: half of 5%'));
  } else if (r === 22.5) {
    s.push(
      ten,
      st(`${P(100)} × 2 = ${P(200)}`, '20%: double 10%'),
      st(`${P(100)} ÷ 4 = ${P(25)}`, '2.5%: a quarter of 10%'),
      st(`${P(200)} + ${P(25)} = ${P(225)}`, '20% + 2.5%'),
    );
  } else {
    // Eighths: 12.5% is half of 25%.
    s.push(half, quarter, st(`${P(250)} ÷ 2 = ${P(125)}`, '12.5%: half again'));
    if (r === 37.5) s.push(st(`${P(250)} + ${P(125)} = ${P(375)}`, '25% + 12.5%'));
    if (r === 62.5) s.push(st(`${P(500)} + ${P(125)} = ${P(625)}`, '50% + 12.5%'));
    if (r === 87.5) s.push(st(`${Y} − ${P(125)} = ${P(875)}`, '100% − 12.5%'));
  }
  s.push({ expr: ans, note: `${r}% of ${Y}` });
  return s;
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Percentages and tips',
    category: 'est',
    tier: 'Foundation',
    order: 20,
    idea: 'Find 10% by shifting the decimal point, then halve, double or shift it again and add the pieces.',
  },
  card: {
    prose: [
      'Shift the decimal point one place left to get 10%. Halve that for 5%, double it for 20%.',
      'Shift once more for 1%. Add or subtract the pieces to reach the rate you want.',
      'When the amount is 20, 25 or 50, swap the two: 8% of 25 is 25% of 8, a quarter of 8.',
    ],
    example: make(15, 60, 3),
    graphic: () =>
      pieces({
        input: '15% of 60',
        ops: [
          { text: '60 ÷ 10', out: '6' },
          { text: '6 ÷ 2', out: '3' },
        ],
        answer: [
          { text: '6', from: 0 },
          { text: '+', from: null },
          { text: '3', from: 1 },
        ],
        result: '9',
        label: '15% of 60: 10% is 6; half of that, 5%, is 3; add them to get 9',
      }),
    caption: 'Get 10%, halve it for 5%, then add the two.',
  },
  levels,
  generate(rng, level) {
    // Every answer is a whole number; the amounts are chosen so the rate divides evenly.
    for (;;) {
      let p: Problem;
      if (level === 1) p = make(rng.pick([10, 50] as const), rng.int(12, 198), level);
      else if (level === 2) p = make(rng.pick([10, 20, 5, 50, 25] as const), rng.chance(0.3) ? rng.int(12, 99) : rng.int(100, 999), level);
      else if (level === 3) p = make(rng.pick([15, 18, 20] as const), rng.int(12, 150), level);
      else if (level === 5) p = make(rng.pick([9, 11, 45, 65, 75] as const), rng.int(101, 999), level);
      else if (level === 6) p = make(rng.pick([2.5, 12.5, 37.5, 62.5, 87.5, 22.5] as const), rng.int(20, 999), level);
      else if (rng.chance(0.3)) {
        const y = rng.pick([20, 25, 50] as const);
        const r = rng.int(3, 96);
        if (r % 10 === 0 || r % y === 0 || r === y) continue;
        p = make(r, y, level, 1);
      } else p = make(rng.pick([7, 12, 35, 17.5] as const), rng.int(12, 480), level);
      if (!p.answer.includes('.')) return p;
    }
  },
  steps: (p) => build(p.data.r, p.data.y, p.data.swap),
});
