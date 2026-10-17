import { h } from './dom';

/**
 * Each demo is one line of math rewritten in place until it becomes the answer.
 * Tokens are separated by spaces. `word@key` ties a token to the same key in the next line,
 * so it glides there even if its text changes; unkeyed tokens match by identical text.
 * A leading `~` packs a token against the one before it (digits of one number).
 * `|` draws a thin divider between parts that are worked separately.
 */
const DEMOS: { name: string; lines: string[] }[] = [
  {
    name: 'Multiplying by 11',
    lines: ['4@a ~7@b × 11', '4@a ~(4@c ~+ ~7@d ~) ~7@b', '4@a | 11@c | 7@b', '5@a ~1@c ~7@b'],
  },
  {
    name: 'Squaring numbers ending in 5',
    lines: ['6@a ~5@b ~²', '6@a × 7 | 25@b', '42@a | 25@b', '4,225@a'],
  },
  {
    name: 'Numbers near 100',
    lines: ['97@a × 94@b', '97@a − 6@b | 3 × 6', '91@a | 18@r', '9,118@a'],
  },
  {
    name: 'Percentages',
    lines: ['15%@p of 84@n', '10%@t + 5%@f of 84@n', '8.4@t + 4.2@f', '12.6@t'],
  },
  {
    name: 'Squares near 50',
    lines: ['53@a ~²', '25 + 3@d | 3@s ~²', '28@a | 09@s', '2,809@a'],
  },
  {
    name: 'Close together',
    lines: ['43@a × 48@b', '40 × 51@a + 3 × 8@b', '2,040@a + 24@b', '2,064@a'],
  },
  {
    name: 'Complements to 1,000',
    lines: ['1,000 − 3@a ~7@b ~2@c', '9−3@a | 9−7@b | 10−2@c', '6@a ~2@b ~8@c'],
  },
  {
    name: 'Halving',
    lines: ['48@a × 5@b', '48@a ÷ 2 × 10@b', '24@a × 10@b', '240@a'],
  },
  {
    name: '2-digit × 1-digit',
    lines: ['47@a × 6', '40 × 6@a + 7 × 6@b', '240@a + 42@b', '282@a'],
  },
];

const MORPH = 850;
const HOLD = 1300;
const LAST_HOLD = 2600;
const EASE = 'cubic-bezier(0.65, 0, 0.25, 1)';

interface Token {
  text: string;
  key: string;
  tight: boolean;
  divider: boolean;
}

function parse(line: string): Token[] {
  const seen = new Map<string, number>();
  return line.split(' ').map((raw) => {
    const tight = raw.startsWith('~');
    const body = tight ? raw.slice(1) : raw;
    const [text, k] = body.split('@');
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { text, key: k ? `@${k}` : `${text}#${n}`, tight, divider: text === '|' };
  });
}

/**
 * One line of math that morphs in place: tokens that carry over glide to their new spots,
 * new ones fade in, finished ones fade out, until the answer lands.
 */
export function processReel(): { el: HTMLElement; destroy(): void } {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const name = h('div', { class: 'demo-name' });
  const problem = h('div', { class: 'demo-problem' });
  const line = h('div', { class: 'morph-line', 'aria-hidden': 'true' });
  const spoken = h('span', { class: 'sr-only', 'aria-live': 'polite' });
  const stage = h('div', { class: 'morph-stage' }, line);
  const el = h('div', { class: 'demo', 'data-testid': 'demo' }, name, problem, stage, spoken);
  const timers: number[] = [];
  const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));

  function render(tokens: Token[], final: boolean): Map<string, HTMLElement> {
    const map = new Map<string, HTMLElement>();
    line.replaceChildren(
      ...tokens.map((t) => {
        const span = h('span', { class: `tok${t.tight ? ' tight' : ''}${t.divider ? ' divider' : ''}${final ? ' is-answer' : ''}` }, t.divider ? '' : t.text);
        map.set(t.key, span);
        return span;
      }),
    );
    return map;
  }

  /** Move from the current tokens to `next`, FLIP-style. */
  function morph(prev: Map<string, HTMLElement>, next: Token[], final: boolean): Map<string, HTMLElement> {
    const base = stage.getBoundingClientRect();
    const before = new Map<string, DOMRect>();
    prev.forEach((span, key) => before.set(key, span.getBoundingClientRect()));
    // Leaving tokens become ghosts at their old spot and fade away.
    const ghosts: HTMLElement[] = [];
    const nextKeys = new Set(next.map((t) => t.key));
    prev.forEach((span, key) => {
      if (nextKeys.has(key)) return;
      const r = before.get(key)!;
      const g = span.cloneNode(true) as HTMLElement;
      g.classList.add('ghost');
      Object.assign(g.style, { left: `${r.left - base.left}px`, top: `${r.top - base.top}px` });
      stage.append(g);
      ghosts.push(g);
      g.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(0.9)' }], { duration: reduced ? 1 : MORPH * 0.7, easing: EASE, fill: 'forwards' });
    });
    const map = render(next, final);
    map.forEach((span, key) => {
      const old = before.get(key);
      if (old) {
        const now = span.getBoundingClientRect();
        const dx = old.left - now.left, dy = old.top - now.top;
        const changed = prev.get(key)!.textContent !== span.textContent;
        span.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)`, opacity: changed ? 0.25 : 1 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: reduced ? 1 : MORPH, easing: EASE },
        );
      } else {
        span.animate([{ opacity: 0, transform: 'translateY(10px) scale(0.9)' }, { opacity: 1, transform: 'none' }], {
          duration: reduced ? 1 : MORPH,
          delay: reduced ? 0 : MORPH * 0.25,
          easing: EASE,
          fill: 'backwards',
        });
      }
    });
    later(MORPH, () => ghosts.forEach((g) => g.remove()));
    return map;
  }

  function play(i: number) {
    const demo = DEMOS[i % DEMOS.length];
    const lines = demo.lines.map(parse);
    name.textContent = demo.name;
    // The problem being solved stays visible above the line that morphs.
    problem.textContent = `${lines[0].map((t, j) => (j && !t.tight ? ' ' : '') + t.text).join('')} = ?`;
    el.classList.remove('out');
    let tokens = render(lines[0], false);
    spoken.textContent = demo.lines[0].replace(/[@~][a-z]*/g, '');
    let k = 1;
    const step = () => {
      const final = k === lines.length - 1;
      tokens = morph(tokens, lines[k], final);
      k++;
      if (!final) return later(MORPH + HOLD, step);
      spoken.textContent = `${demo.name}: ${line.textContent}`;
      later(MORPH + LAST_HOLD, () => {
        el.classList.add('out');
        later(450, () => play(i + 1));
      });
    };
    later(HOLD, step);
  }

  play(0);
  return { el, destroy: () => timers.forEach(clearTimeout) };
}
