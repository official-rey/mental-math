import { defineTechnique } from '../define';
import { arrowHead, circle, line, rect, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { digits, fmt, nonRound } from '../util';

const ID = 'times-11';

/** Build the answer digit by digit from the right: each inner digit is a neighbouring pair's sum. */
function solve(n: number): { value: number; lines: Step[]; out: number[] } {
  const ds = digits(n);
  const last = ds[ds.length - 1];
  const lines: Step[] = [{ op: '', expr: String(last), note: 'last digit stays' }];
  const out: number[] = [last];
  let carry = 0;
  for (let i = ds.length - 1; i > 0; i--) {
    const l = ds[i - 1], r = ds[i];
    const s = l + r + carry;
    const next = Math.floor(s / 10);
    lines.push({
      op: '',
      expr: `${l} + ${r}${carry ? ` + ${carry}` : ''} = ${s}`,
      note: next ? `write ${s % 10}, carry ${next}` : `write ${s}`,
    });
    out.unshift(s % 10);
    carry = next;
  }
  const first = ds[0] + carry;
  lines.push(
    carry
      ? { op: '', expr: `${ds[0]} + ${carry} = ${first}`, note: 'first digit plus the carry' }
      : { op: '', expr: String(first), note: 'first digit stays' },
  );
  out.unshift(first);
  return { value: Number(out.join('')), lines, out };
}

function make(n: number, level: Level): Problem {
  return { technique: ID, level, text: `${fmt(n)} × 11`, answer: String(solve(n).value), data: { n } };
}

const levels = {
  1: { label: '2-digit, digit sum up to 6', bounds: { n: [12, 51] } },
  2: { label: '2-digit, digit sum < 10', bounds: { n: [11, 81] } },
  3: { label: '2-digit × 11, with carries', bounds: { n: [12, 99] } },
  4: { label: '3-digit × 11', bounds: { n: [101, 999] } },
  5: { label: '4-digit × 11', bounds: { n: [1001, 9999] } },
  6: { label: '5-digit × 11, with carries', bounds: { n: [10001, 99999] } },
} as const satisfies Levels;

/** A number with `len` digits, none of them 0, whose neighbouring pairs carry at least `carries` times. */
function withCarries(rng: Rng, len: number, carries: number): number {
  for (;;) {
    const ds = Array.from({ length: len }, () => rng.int(1, 9));
    let c = 0;
    for (let i = 1; i < len; i++) if (ds[i - 1] + ds[i] >= 10) c++;
    if (c >= carries) return Number(ds.join(''));
  }
}

/** 47 × 11 worked right to left: keep the 7, add 4 + 7 (write 1, carry 1), then 4 + 1. */
function diagram(): string {
  const X = [70, 170, 270];
  const yOp = 92, yAns = 162;
  let b = text(170, 28, '47 × 11', 't t-xl');
  const stages = [
    { x: X[2], t: '7', out: '7', tag: 'last' },
    { x: X[1], t: '4 + 7', out: '1', tag: 'pair' },
    { x: X[0], t: '4 + 1', out: '5', tag: 'first + carry' },
  ];
  stages.forEach((s, i) => {
    const w = 64;
    b += text(s.x, 58, s.tag, 't t-sm t-dim');
    b += rect(s.x - w / 2, yOp - 15, w, 30, 'f-raised s-ink');
    b += text(s.x, yOp, s.t, 't');
    b += circle(s.x - w / 2, yOp - 15, 8, 'f-paper s-accent');
    b += text(s.x - w / 2, yOp - 15, i + 1, 't t-sm t-accent');
    b += line(s.x, yOp + 17, s.x, yAns - 22, 's-accent') + arrowHead(s.x, yAns - 18, 0, 1);
    b += rect(s.x - 17, yAns - 17, 34, 34, 'f-soft s-accent');
    b += text(s.x, yAns, s.out, 't t-lg t-accent t-b');
  });
  // The pair makes 11: write 1, carry 1 into the first digit.
  b += line(X[1] - 24, yAns, X[0] + 28, yAns, 's-accent s-dash') + arrowHead(X[0] + 22, yAns, -1, 0);
  b += text((X[0] + X[1]) / 2, yAns - 14, 'carry 1', 't t-sm t-accent');
  b += text(170, yAns + 46, '= 517', 't t-lg t-b');
  return svg(340, 226, b, '47 times 11 from the right: keep 7, then 4 plus 7 is 11 so write 1 and carry 1, then 4 plus 1 is 5, giving 517');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Multiplying by 11',
    category: 'mul',
    tier: 'Foundation',
    order: 30,
    idea: 'Keep the last digit, add neighbouring pairs for the middle, add any carry to the first digit.',
  },
  card: {
    prose: [
      'Write the last digit of the number as the last digit of the answer.',
      'Moving left, add each pair of neighbouring digits; write the ones digit and carry any 1.',
      'Finish with the first digit, plus any carry.',
    ],
    example: make(47, 3),
    graphic: diagram,
    caption: 'Work from the right: keep the 7, add the pair, carry the 1 onto the first digit.',
  },
  levels,
  generate(rng, level) {
    if (level === 1) {
      const a = rng.int(1, 5);
      return make(10 * a + (a === 1 ? rng.int(2, 5) : rng.int(1, 6 - a)), level);
    }
    if (level === 2) {
      const a = rng.int(1, 8);
      return make(10 * a + rng.int(1, 9 - a), level);
    }
    if (level === 3) {
      if (rng.chance(0.75)) {
        const a = rng.int(1, 9);
        return make(10 * a + rng.int(Math.max(1, 10 - a), 9), level);
      }
      return make(nonRound(rng, 12, 99), level);
    }
    if (level === 4) return make(nonRound(rng, 101, 999), level);
    if (level === 5) return make(rng.chance(0.7) ? withCarries(rng, 4, 2) : nonRound(rng, 1001, 9999), level);
    return make(withCarries(rng, 5, 3), level);
  },
  steps(p) {
    const { n } = p.data;
    const { value, lines } = solve(n);
    return [{ op: '', expr: `${fmt(n)} × 11` }, ...lines, { expr: fmt(value), note: 'read them left to right' }];
  },
});
