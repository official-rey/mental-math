import { defineTechnique } from '../define';
import { line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'times-11';

/** Build n × 11 digit by digit from the right: each inner digit is a neighbouring pair's sum. */
function solve(n: number): { value: number; lines: Step[] } {
  const ds = digits(n);
  const lines: Step[] = [];
  const last = ds[ds.length - 1];
  const out: number[] = [last];
  lines.push({ op: '→', expr: String(last), note: 'last digit stays' });
  let carry = 0;
  for (let i = ds.length - 1; i > 0; i--) {
    const l = ds[i - 1], r = ds[i];
    const s = l + r + carry;
    const next = Math.floor(s / 10);
    lines.push({
      op: '→',
      expr: `${l} + ${r}${carry ? ` + ${carry}` : ''} = ${s}`,
      note: `write ${s % 10}${next ? `, carry ${next}` : ''}`,
    });
    out.unshift(s % 10);
    carry = next;
  }
  const first = ds[0] + carry;
  lines.push(
    carry
      ? { op: '→', expr: `${ds[0]} + ${carry} = ${first}`, note: `write ${first}` }
      : { op: '→', expr: String(first), note: 'first digit stays' },
  );
  out.unshift(first);
  return { value: Number(out.join('')), lines };
}

function make(n: number, level: Level): Problem {
  return { technique: ID, level, text: `${n} × 11`, answer: String(solve(n).value), data: { n } };
}

const levels = {
  1: { label: '2-digit, digit sum < 10', bounds: { n: [11, 81] } },
  2: { label: '2-digit × 11, with carries', bounds: { n: [12, 99] } },
  3: { label: '3-digit × 11', bounds: { n: [101, 999] } },
} as const satisfies Levels;

/** 47 × 11 as 470 + 47: the tens column collects both digits. */
function diagram(): string {
  const xs = [150, 180, 210];
  let b = rect(165, 18, 30, 114, 'f-soft s-accent', 4);
  b += text(xs[0], 36, 4, 't t-lg');
  b += text(xs[1], 36, 7, 't t-lg');
  b += text(xs[2], 36, 0, 't t-lg t-dim');
  b += text(112, 70, '+', 't t-lg');
  b += text(xs[1], 70, 4, 't t-lg');
  b += text(xs[2], 70, 7, 't t-lg');
  b += line(104, 90, 226, 90, 's-ink');
  b += text(xs[0], 112, 5, 't t-lg');
  b += text(xs[1], 112, 1, 't t-lg t-accent t-b');
  b += text(xs[2], 112, 7, 't t-lg');
  b += text(244, 36, '47 × 10', 't t-sm t-dim t-start');
  b += text(244, 70, '47 × 1', 't t-sm t-dim t-start');
  b += text(244, 112, '47 × 11', 't t-sm t-dim t-start');
  b += text(170, 152, 'tens: 4 + 7 = 11, carry 1', 't t-sm t-accent');
  return svg(340, 168, b, '47 times 11 as 470 plus 47; the tens column holds 4 plus 7');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Multiplying by 11',
    category: 'mul',
    tier: 'Foundation',
    order: 30,
    idea: 'Keep the outer digits; each digit between them is the sum of a neighbouring pair.',
  },
  card: {
    prose: [
      'n × 11 = 10n + n: the number added to a copy of itself shifted one place.',
      'So the outer digits survive and every inner column holds two neighbouring digits.',
      'Work from the right so that a pair summing to 10 or more carries left.',
    ],
    example: make(47, 2),
    graphic: diagram,
    caption: 'Adding 470 and 47 puts 4 + 7 in the tens column; the 1 of 11 carries into the hundreds.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      const a = rng.int(1, 8);
      return make(10 * a + rng.int(1, 9 - a), level);
    }
    if (level === 2) {
      if (rng.chance(0.75)) {
        const a = rng.int(1, 9);
        return make(10 * a + rng.int(Math.max(1, 10 - a), 9), level);
      }
      return make(nonRound(rng, 12, 99), level);
    }
    return make(nonRound(rng, 101, 999), level);
  },
  steps(p) {
    const { n } = p.data;
    const { value, lines } = solve(n);
    return [{ op: '', expr: `${n} × 11` }, ...lines, { expr: fmt(value) }];
  },
});
