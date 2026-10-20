/**
 * The book's big lessons, in our own words, each with a small picture of it at work on a
 * real problem. Pictures use the technique SVG kit, so they follow the theme.
 */
import { circle, line, path, svg, text } from '../techniques/svg';
import { h } from './dom';

/** One line of a worked column: operator, value (right-aligned), and a note beside it. */
interface Row {
  op?: string;
  v: string;
  note?: string;
  /** Draw the bar of a sum above this line. */
  rule?: boolean;
}

/**
 * Worked the way you would on paper: the problem on top, then one line per operation,
 * numbers right-aligned in a column, a bar above each result, a short note beside each move.
 * The last line is the answer.
 */
function column(problem: string, rows: Row[], label: string, right = 136): string {
  const top = 34, gap = 19;
  // The operator column sits just left of the widest value (mono digits are about 8.6 wide).
  const opX = right - Math.max(...rows.map((r) => r.v.length)) * 8.6 - 16;
  let b = text(150, 11, problem, 't t-sm t-dim');
  rows.forEach((r, i) => {
    const y = top + i * gap;
    const last = i === rows.length - 1;
    if (r.rule) b += line(opX - 4, y - gap / 2, right + 2, y - gap / 2, 's-ink s-thin');
    if (r.op) b += text(opX, y, r.op, 't t-dim t-start');
    b += text(right, y, r.v, last ? 't t-accent t-b t-end' : 't t-end');
    if (r.note) b += text(right + 18, y, r.note, 't t-sm t-accent t-start');
  });
  return svg(300, top + (rows.length - 1) * gap + 14, b, label);
}

/** 476 + 238: hundreds, then tens, then ones, so the answer arrives in the order you say it. */
function leftToRight(): string {
  return column(
    '476 + 238 = ?',
    [
      { v: '476' },
      { op: '+', v: '200', note: 'hundreds first' },
      { v: '676', rule: true },
      { op: '+', v: '30', note: 'then tens' },
      { v: '706', rule: true },
      { op: '+', v: '8', note: 'then ones' },
      { v: '714', rule: true },
    ],
    '476 plus 238 from the left: add 200 to get 676, then 30 to get 706, then 8 to get 714',
  );
}

/** 48 × 52: spotting that both are 2 away from 50 turns it into two squares. */
function lookFirst(): string {
  return column(
    '48 × 52 = ?',
    [
      { v: '50 × 50', note: 'both are 2 from 50' },
      { v: '2,500', rule: true },
      { op: '−', v: '2 × 2', note: 'take off 2²' },
      { v: '2,496', rule: true },
    ],
    '48 times 52: both are 2 away from 50, so it is 50 squared, 2,500, minus 2 squared, 4: 2,496',
  );
}

/** 67 + 98: adding 98 is adding 100 and taking 2 back. */
function hardToEasy(): string {
  return column(
    '67 + 98 = ?',
    [
      { v: '67' },
      { op: '+', v: '100', note: 'add 100 instead' },
      { v: '167', rule: true },
      { op: '−', v: '2', note: 'give back the 2' },
      { v: '165', rule: true },
    ],
    '67 plus 98: add 100 to get 167, then take back 2 to get 165',
  );
}

/** 36 × 25 → 9 × 4 × 25 → 9 × 100 → 900: each line smaller than the last. */
function simplify(): string {
  return column(
    '36 × 25 = ?',
    [
      { v: '36 × 25' },
      { op: '=', v: '9 × 4 × 25', note: '36 is 9 × 4' },
      { op: '=', v: '9 × 100', note: '4 × 25 is 100' },
      { op: '=', v: '900' },
    ],
    '36 times 25: 36 is 9 times 4, and 4 times 25 is 100, so it is 9 times 100, 900',
  );
}

/** 47 × 6 = 282? Shrink both sides to one digit; they must match. */
function check(): string {
  return column(
    '47 × 6 = 282 ?',
    [
      { v: '4 + 7 = 11 → 2', note: 'shrink 47' },
      { op: '×', v: '6', note: 'keep the 6' },
      { v: '12 → 3', rule: true },
      { v: '2 + 8 + 2 = 12 → 3', note: 'shrink 282' },
      { op: '=', v: '3 ✓', note: 'they match' },
    ],
    'Check 47 times 6 equals 282: 47 shrinks to 2, times 6 is 12, which shrinks to 3; 282 adds to 12, which shrinks to 3; they match',
  );
}

/** Seconds per problem falling over ten runs. */
function practise(): string {
  const x0 = 40, x1 = 286, y0 = 14, y1 = 74;
  const secs = Array.from({ length: 10 }, (_, i) => 2 + 6 * Math.exp(-0.45 * i));
  const X = (i: number) => x0 + (i / 9) * (x1 - x0);
  const Y = (s: number) => y1 - ((s - 1.5) / 7) * (y1 - y0);
  let b = line(x0, y1 + 6, x1 + 6, y1 + 6, 's-rule') + line(x0 - 8, y0 - 4, x0 - 8, y1 + 6, 's-rule');
  b += path(secs.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(s).toFixed(1)}`).join(' '), 's-accent f-none');
  secs.forEach((s, i) => (b += circle(X(i), Y(s), i === 9 ? 4 : 2.6, i === 9 ? 'f-accent s-accent' : 'f-paper s-accent')));
  b += text(x0 - 12, Y(secs[0]), '8 s', 't t-sm t-dim t-end');
  b += text(x1, Y(secs[9]) - 14, '2 s', 't t-sm t-accent t-b');
  b += text((x0 + x1) / 2, y1 + 17, 'runs →', 't t-sm t-dim');
  return svg(300, 96, b, 'Seconds per problem over ten runs, falling from 8 to 2');
}

export const LESSONS: { head: string; body: string; picture: () => string }[] = [
  { head: 'Work left to right.', body: 'Start with the biggest part. You find the answer in the order you say it.', picture: leftToRight },
  { head: 'Look before you calculate.', body: 'Near a round number? Close together? Easy to factor? Pick the method that makes it easy.', picture: lookFirst },
  { head: 'Turn hard into easy.', body: 'A hard addition can be an easy subtraction, and the other way round.', picture: hardToEasy },
  { head: 'Keep simplifying.', body: 'Break any big problem into small steps you can hold in your head.', picture: simplify },
  { head: 'Check your answer.', body: 'Casting out nines catches most slips in a few seconds.', picture: check },
  { head: 'Practise.', body: 'Knowing a trick is not the same as being fast at it.', picture: practise },
];

/** The key takeaways on Learn: open to begin with, and can be folded away. */
export function lessons(): HTMLElement {
  return h(
    'details',
    { class: 'lessons', open: true, 'data-testid': 'lessons' },
    h('summary', null, 'Key takeaways to improve mental math'),
    h(
      'ol',
      { class: 'lesson-grid' },
      LESSONS.map((l, i) =>
        h(
          'li',
          { class: 'lesson' },
          h('div', { class: 'lesson-art', html: l.picture() }),
          h('p', null, h('span', { class: 'lesson-n mono' }, String(i + 1)), h('b', null, l.head), ' ', l.body),
        ),
      ),
    ),
    h(
      'figure',
      { class: 'lesson-quote' },
      h('blockquote', null, '“It’s never too late to start looking at numbers in a new way.”'),
      h('figcaption', null, '— Arthur T. Benjamin, ', h('i', null, 'The Secrets of Mental Math')),
    ),
  );
}
