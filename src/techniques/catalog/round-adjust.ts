import { defineTechnique } from '../define';
import { arrowHead, line, path, svg, text } from '../svg';
import type { Level, Levels, Problem, Rng } from '../types';
import { fmt, nonRound } from '../util';

const ID = 'round-adjust';

/** a ± b with b = r − d just below the round number r. sub = 1 for subtraction. */
function make(a: number, r: number, d: number, sub: boolean, level: Level): Problem {
  const b = r - d;
  // The technique: move by the round number, then undo the overshoot.
  const answer = sub ? a - r + d : a + r - d;
  return {
    technique: ID,
    level,
    text: `${fmt(a)} ${sub ? '−' : '+'} ${fmt(b)}`,
    answer: String(answer),
    data: { a, b, r, d, sub: sub ? 1 : 0 },
  };
}

const levels = {
  1: { label: '2-digit ± 2-digit ending 7–9', bounds: { a: [21, 99], b: [17, 89], d: [1, 3] } },
  2: { label: '3-digit ± 2-digit near a ten', bounds: { a: [101, 999], b: [17, 99], d: [1, 3] } },
  3: { label: '3–4-digit ± near a hundred', bounds: { a: [101, 9999], b: [196, 999], d: [1, 4] } },
} as const satisfies Levels;

/** Pick the first operand; for subtraction it must exceed the round number. */
function operand(rng: Rng, lo: number, hi: number, r: number, sub: boolean): number | null {
  const min = sub ? Math.max(lo, r + 1) : lo;
  return min + 1 > hi ? null : nonRound(rng, min, hi);
}

/** Overshoot then step back, drawn for 538 + 297 (spacing schematic). */
function diagram(): string {
  const y = 90;
  const xa = 40, xr = 295, xs = 215;
  let body = line(16, y, 326, y, 's-ink');
  body += line(xa, y - 6, xa, y + 6, 's-ink');
  body += line(xs, y - 6, xs, y + 6, 's-accent s-thick');
  body += line(xr, y - 6, xr, y + 6, 's-ink');
  body += text(xa, y + 20, '538', 't t-sm');
  body += text(xs - 6, y + 16, '835', 't t-sm t-accent t-b t-end');
  body += text(xr + 6, y + 16, '838', 't t-sm t-start');
  // Overshoot: +300 above the line.
  const mid1 = (xa + xr) / 2;
  body += path(`M${xa},${y - 3} Q${mid1},10 ${xr},${y - 3}`, 's-accent f-none');
  body += arrowHead(xr, y - 3, xr - mid1, y - 3 - 10);
  body += text(mid1, 36, '+300', 't t-sm t-accent');
  // Step back: −3 below the line.
  const mid2 = (xr + xs) / 2;
  body += path(`M${xr},${y + 3} Q${mid2},${y + 48} ${xs},${y + 3}`, 's-accent f-none');
  body += arrowHead(xs, y + 3, xs - mid2, y + 3 - (y + 48));
  body += text(mid2, y + 38, '−3', 't t-sm t-accent');
  return svg(340, 140, body, 'Number line: 538 plus 300 overshoots to 838, then back 3 to 835');
}

export default defineTechnique({
  meta: {
    id: ID,
    name: 'Round and adjust',
    category: 'addsub',
    tier: 'Foundation',
    order: 30,
    idea: 'Move by the nearby round number, then correct by the small difference.',
  },
  card: {
    prose: [
      'Write the awkward number as a round number minus a little: 297 = 300 − 3.',
      'Add or subtract the round number, which changes only one or two digits.',
      'Then undo the overshoot: take back what you added too much, give back what you took too much.',
    ],
    example: make(538, 300, 3, false, 3),
    graphic: diagram,
    caption: 'For 538 + 297, hop 300 to 838, which is 3 too far, then step back to 835.',
  },
  levels,
  generate(rng, level) {
    for (;;) {
      const sub = rng.chance(0.5);
      if (level === 3) {
        const r = rng.int(2, 10) * 100;
        const d = rng.int(1, 4);
        const a = rng.chance(0.5) ? operand(rng, 1001, 9999, r, sub) : operand(rng, 101, 999, r, sub);
        if (a !== null) return make(a, r, d, sub, level);
        continue;
      }
      const tens = level === 1 ? rng.int(1, 8) : rng.int(1, 9);
      const b = tens * 10 + rng.pick([7, 8, 9]);
      const r = tens * 10 + 10;
      const a = level === 1 ? operand(rng, 21, 99, r, sub) : operand(rng, 101, 999, r, sub);
      if (a !== null) return make(a, r, r - b, sub, level);
    }
  },
  steps(p) {
    const { a, b, r, d, sub } = p.data;
    const op = sub ? '−' : '+', back = sub ? '+' : '−';
    const mid = sub ? a - r : a + r;
    const end = sub ? mid + d : mid - d;
    return [
      { op: '', expr: `${fmt(a)} ${op} ${fmt(b)}` },
      { expr: `${fmt(a)} ${op} ${fmt(r)} ${back} ${d}`, note: `${fmt(b)} = ${fmt(r)} − ${d}` },
      { expr: `${fmt(mid)} ${back} ${d}`, note: sub ? `take ${fmt(r)}` : `add ${fmt(r)}` },
      { expr: fmt(end), note: sub ? `give back ${d}` : `take back ${d}` },
    ];
  },
});
