/**
 * The book's big lessons, in our own words, each with a small picture of it at work on a
 * real problem. Pictures use the technique SVG kit, so they follow the theme.
 */
import { arrowHead, circle, line, path, rect, svg, text } from '../techniques/svg';
import { h } from './dom';

/** A boxed value; the last one in a picture is the answer, in accent. */
const box = (cx: number, cy: number, w: number, hgt: number, v: string, answer = false) =>
  rect(cx - w / 2, cy - hgt / 2, w, hgt, answer ? 'f-soft s-accent' : 'f-raised s-ink', 3) + text(cx, cy, v, answer ? 't t-accent t-b' : 't');

/** Straight arrow from (x1, y1) to (x2, y2). */
const arrow = (x1: number, y1: number, x2: number, y2: number, cls = 's-accent') =>
  line(x1, y1, x2 - (x2 - x1) * 0.12, y2 - (y2 - y1) * 0.12, cls) + arrowHead(x2, y2, x2 - x1, y2 - y1, cls === 's-accent' ? 'f-accent' : 'f-dim', 6);

/** 476 + 238: hundreds, then tens, then ones, so the answer arrives in the order you say it. */
function leftToRight(): string {
  let b = text(150, 11, '476 + 238 = ?', 't t-sm t-dim');
  const xs = [32, 112, 192, 270];
  ['476', '676', '706', '714'].forEach((v, i) => (b += box(xs[i], 46, 52, 26, v, i === 3)));
  ['+200', '+30', '+8'].forEach((op, i) => {
    b += arrow(xs[i] + 27, 46, xs[i + 1] - 27, 46);
    b += text((xs[i] + xs[i + 1]) / 2, 28, op, 't t-sm t-accent');
  });
  ['hundreds', 'tens', 'ones'].forEach((u, i) => (b += text((xs[i] + xs[i + 1]) / 2, 72, u, 't t-sm t-dim')));
  return svg(300, 82, b, '476 plus 238 from the left: add 200 to get 676, then 30 to get 706, then 8 to get 714');
}

/** 48 × 52: three ways in; spotting that both are near 50 makes it two squares. */
function lookFirst(): string {
  let b = text(150, 11, '48 × 52 = ?', 't t-sm t-dim');
  const opts: [number, number, string, boolean][] = [
    [48, 84, 'long way', false],
    [146, 84, 'factor', false],
    [248, 100, 'both near 50', true],
  ];
  for (const [cx, w, label, pick] of opts) {
    b += line(150, 20, cx, 33, pick ? 's-accent' : 's-rule s-dash');
    b += rect(cx - w / 2, 34, w, 24, pick ? 'f-soft s-accent' : 'f-paper s-rule', 12);
    b += text(cx, 46, label, pick ? 't t-sm t-accent t-b' : 't t-sm t-dim');
  }
  b += arrow(248, 60, 248, 72);
  b += text(296, 86, '50² − 2² = 2,496', 't t-accent t-b t-end');
  return svg(300, 96, b, '48 times 52: instead of the long way or factoring, notice both are near 50: 50 squared minus 2 squared is 2,496');
}

/** 67 + 98: adding 98 is adding 100 and taking 2 back. */
function hardToEasy(): string {
  let b = box(40, 26, 72, 28, '67 + 98');
  b += arrow(78, 26, 98, 26);
  b += box(156, 26, 112, 28, '67 + 100 − 2');
  b += arrow(214, 26, 240, 26);
  b += box(268, 26, 52, 28, '165', true);
  b += text(156, 56, '98 is 100 − 2', 't t-sm t-accent');
  return svg(300, 66, b, '67 plus 98 becomes 67 plus 100 minus 2, which is 165');
}

/** 36 × 25 → 9 × 100 → 900: each step smaller than the last. */
function simplify(): string {
  let b = box(50, 24, 84, 32, '36 × 25');
  b += arrow(94, 32, 110, 44);
  b += box(150, 50, 76, 28, '9 × 100');
  b += arrow(190, 58, 222, 68);
  b += box(252, 74, 52, 24, '900', true);
  b += text(150, 14, '36 = 9 × 4', 't t-sm t-accent');
  b += text(250, 44, '4 × 25 = 100', 't t-sm t-accent');
  return svg(300, 90, b, '36 times 25: split 36 into 9 times 4, and 4 times 25 is 100, so it is 9 times 100, 900');
}

/** 47 × 6 = 282? Both sides shrink to the same digit, 3. */
function check(): string {
  const L = 72, R = 228;
  /** A digit-sum line ending in its single digit, in accent. */
  const shrink = (x: number, work: string) =>
    `<text x="${x}" y="66" class="t t-sm" dominant-baseline="central">${work} → <tspan class="t-accent t-b">3</tspan></text>`;
  let b = text(150, 11, '47 × 6 = 282 ?', 't t-sm t-dim');
  b += text(L, 36, '47 × 6', 't') + text(R, 36, '282', 't');
  b += arrow(L, 45, L, 56, 's-dim') + arrow(R, 45, R, 56, 's-dim');
  b += shrink(L, '2 × 6 = 12') + shrink(R, '2+8+2 = 12');
  b += circle(150, 66, 10, 'f-paper s-ok') + text(150, 66, '✓', 't t-ok t-b');
  b += text(150, 88, 'add digits until one is left', 't t-sm t-dim');
  return svg(300, 96, b, 'Check 47 times 6 equals 282: 47 adds to 11 and then 2, and 2 times 6 is 12, which adds to 3; 282 adds to 12, which adds to 3; they match');
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

/** The collapsible "Six lessons from the book" block on Learn. */
export function lessons(): HTMLElement {
  return h(
    'details',
    { class: 'lessons', 'data-testid': 'lessons' },
    h('summary', null, 'Six lessons from the book'),
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
