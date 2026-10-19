import { defineTechnique } from '../define';
import { arrowHead, circle, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng, Step } from '../types';
import { fmt, sup } from '../util';

const ID = 'last-digit';

/** Last digits of u¹, u², u³, … before they repeat. */
const CYCLE = [[0], [1], [2, 4, 8, 6], [3, 9, 7, 1], [4, 6], [5], [6], [7, 9, 3, 1], [8, 4, 2, 6], [9, 1]];
const PLACE = ['', '1st', '2nd', '3rd', '4th'];

/** The lines that find the last digit of a^m, and that digit. */
function power(a: number, m: number): { lines: Step[]; d: number; why: string } {
  const u = a % 10;
  const cyc = CYCLE[u];
  const L = cyc.length;
  const lines: Step[] = [];
  if (a >= 10) lines.push({ op: '', expr: `${u}${sup(m)}`, note: `only the last digit of ${fmt(a)} matters` });
  if (L === 1) return { lines, d: u, why: `powers of ${u} always end in ${u}` };
  const r = m % L;
  const pos = r === 0 ? L : r;
  lines.push({ op: '', expr: cyc.join(', '), note: `last digits of ${u}¹, ${u}², …: a cycle of ${L}` });
  if (L === 2) {
    lines.push({ op: '', expr: `${fmt(m)} is ${m % 2 ? 'odd' : 'even'}`, note: m % 2 ? 'odd: 1st in the cycle' : 'even: 2nd in the cycle' });
  } else {
    const tail = m >= 100 ? m % 100 : m;
    lines.push({
      op: '',
      expr: `${tail} ÷ 4 leaves ${r}`,
      note: m >= 100 ? `last two digits of ${fmt(m)} are enough` : r === 0 ? 'leaves 0: the last place' : `place ${r} in the cycle`,
    });
  }
  return { lines, d: cyc[pos - 1], why: `${PLACE[pos]} in the cycle` };
}

function lastDigitOf(a: number, m: number): number {
  return power(a, m).d;
}

function make(level: Level, a: number, m: number, b = 0, n = 0, op: '' | '+' | '×' = ''): Problem {
  const da = lastDigitOf(a, m);
  const text = op ? `${a}${sup(m)} ${op} ${b}${sup(n)} mod 10` : `${a}${sup(m)} mod 10`;
  const d = op === '+' ? (da + lastDigitOf(b, n)) % 10 : op === '×' ? (da * lastDigitOf(b, n)) % 10 : da;
  return { technique: ID, level, text, answer: String(d), data: op ? { a, m, b, n } : { a, m }, hint: 'last digit' };
}

const levels = {
  1: { label: 'base 2–9, power up to 20', bounds: { a: [2, 9], m: [5, 20] } },
  2: { label: 'base 2–9, power up to 99', bounds: { a: [2, 9], m: [21, 99] } },
  3: { label: '2-digit base, 3-digit power', bounds: { a: [11, 99], m: [10, 999] } },
  4: { label: '3-digit base, 4-digit power', bounds: { a: [101, 999], m: [100, 9999] } },
  5: { label: 'sum of two powers', bounds: { a: [2, 9], m: [10, 99], b: [2, 9], n: [10, 99] } },
  6: { label: 'product of two powers', bounds: { a: [11, 99], m: [100, 999], b: [11, 99], n: [100, 999] } },
} as const satisfies Levels;

/** A base in [lo, hi] whose last digit usually has a real cycle (not 1, 5 or 6), never 0. */
function base(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const a = rng.int(lo, hi);
    const u = a % 10;
    if (u === 0) continue;
    if ([1, 5, 6].includes(u) && rng.chance(0.8)) continue;
    return a;
  }
}

/** The cycle of 7 drawn as a clock: 37²²² lands on its 2nd place, 9. */
function graphic(): string {
  const cx = 92, cy = 104, R = 58;
  const digits = [7, 9, 3, 1];
  const at = (i: number): [number, number] => [cx + R * Math.cos(((i - 1) * Math.PI) / 2), cy + R * Math.sin(((i - 1) * Math.PI) / 2)];
  let b = circle(cx, cy, R, 'f-none s-rule s-dash');
  for (let i = 0; i < 4; i++) {
    const t = ((i - 1) * Math.PI) / 2 + Math.PI / 4;
    const [x, y] = [cx + R * Math.cos(t), cy + R * Math.sin(t)];
    b += arrowHead(x, y, -Math.sin(t), Math.cos(t), 'f-dim', 6);
  }
  const labels: [number, number, string][] = [
    [cx, cy - R - 28, '7¹'],
    [cx + R + 26, cy, '7²'],
    [cx, cy + R + 28, '7³'],
    [cx - R - 26, cy, '7⁴'],
  ];
  digits.forEach((d, i) => {
    const [x, y] = at(i);
    const hot = i === 1;
    b += circle(x, y, 15, hot ? 'f-soft s-accent' : 'f-raised s-ink') + text(x, y, d, hot ? 't t-lg t-accent t-b' : 't t-lg');
    b += text(labels[i][0], labels[i][1], labels[i][2], 't t-sm t-dim');
  });
  const x0 = 200;
  b += text(x0, 52, '37²²²', 't t-lg t-start');
  b += text(x0, 82, 'last digit 7', 't t-sm t-start');
  b += text(x0, 104, '222 ÷ 4 leaves 2', 't t-sm t-start');
  b += text(x0, 126, '2nd place', 't t-sm t-accent t-start');
  b += text(x0, 156, 'ends in 9', 't t-accent t-b t-start');
  return svg(
    340,
    208,
    b,
    'The last digits of powers of 7 go round 7, 9, 3, 1. For 37 to the 222nd, 222 divided by 4 leaves 2, so it lands on the 2nd place: 9',
  );
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Last digit of a power',
    category: 'higher',
    tier: 'Core',
    order: 20,
    idea: 'Last digits of powers go round a short cycle; the exponent’s remainder picks the place.',
  },
  card: {
    prose: [
      'Only the last digit of the base matters. List the last digits of its powers until they repeat: 7, 9, 3, 1, …',
      'The cycle is 1, 2 or 4 long. Divide the exponent by its length; for 4, the exponent’s last two digits are enough.',
      'The remainder is the place in the cycle; a remainder of 0 means the last place.',
    ],
    example: make(3, 37, 222),
    graphic,
    caption: 'Go round the cycle of 7: 222 ÷ 4 leaves 2, the 2nd place, 9.',
  },
  levels,
  generate(rng, level) {
    switch (level) {
      case 1:
        return make(level, base(rng, 2, 9), rng.int(5, 20));
      case 2:
        return make(level, base(rng, 2, 9), rng.int(21, 99));
      case 3:
        return make(level, base(rng, 11, 99), rng.int(10, 999));
      case 4:
        return make(level, base(rng, 101, 999), rng.int(100, 9999));
      case 5:
        return make(level, base(rng, 2, 9), rng.int(10, 99), base(rng, 2, 9), rng.int(10, 99), '+');
      default:
        return make(level, base(rng, 11, 99), rng.int(100, 999), base(rng, 11, 99), rng.int(100, 999), '×');
    }
  },
  steps(p) {
    const { a, m, b, n } = p.data;
    const head: Step = { op: '', expr: p.text };
    const A = power(a, m);
    if (b === undefined) return [head, ...A.lines, { expr: String(A.d), note: A.why }];
    const B = power(b, n);
    const plus = p.text.includes(' + ');
    const v = plus ? A.d + B.d : A.d * B.d;
    return [
      head,
      ...A.lines,
      { op: '', expr: `${a}${sup(m)} ends in ${A.d}`, note: A.why },
      ...B.lines,
      { op: '', expr: `${b}${sup(n)} ends in ${B.d}`, note: B.why },
      { op: '', expr: `${A.d} ${plus ? '+' : '×'} ${B.d} = ${v}`, note: plus ? 'add the last digits' : 'multiply the last digits' },
      { expr: String(v % 10), note: 'its last digit' },
    ];
  },
  reference(p) {
    // Square-and-multiply, independent of the cycles.
    const pow = (x: number, e: number) => {
      let r = 1, s = x % 10;
      for (; e > 0; e >>= 1, s = (s * s) % 10) if (e & 1) r = (r * s) % 10;
      return r;
    };
    const { a, m, b, n } = p.data;
    if (b === undefined) return pow(a, m);
    return p.text.includes(' + ') ? (pow(a, m) + pow(b, n)) % 10 : (pow(a, m) * pow(b, n)) % 10;
  },
});
