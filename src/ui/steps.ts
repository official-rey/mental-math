import type { Step } from '../techniques/types';
import { h } from './dom';

function rows(steps: Step[], markLast: boolean): HTMLElement[] {
  return steps.map((s, i) => {
    const op = s.op ?? (i === 0 ? '' : '=');
    const last = markLast && i === steps.length - 1;
    return h(
      'div',
      { class: `step${last ? ' last' : ''}`, role: 'listitem', 'data-i': String(i) },
      h('span', { class: 'op', 'aria-hidden': 'true' }, op),
      h('span', { class: 'ex' }, s.expr),
      h('span', { class: 'nt' }, s.note ?? ''),
    );
  });
}

/** Vertical worked solution: the math in a right-aligned column, each step's note beside it. */
export function renderSteps(steps: Step[], opts: { markLast?: boolean } = {}): HTMLElement {
  return h('div', { class: 'steps', role: 'list' }, rows(steps, opts.markLast ?? true));
}

/**
 * The same layout revealed one line at a time. The current line is highlighted with its note
 * beside it; later lines stay hidden (but keep their space, so nothing jumps).
 */
export function renderStepper(steps: Step[]): HTMLElement {
  const lines = rows(steps, true);
  const list = h('div', { class: 'steps stepper-lines', role: 'list' }, lines);
  const counter = h('span', { class: 'stepper-count mono', 'aria-live': 'polite' });
  const back = h('button', { type: 'button', class: 'tool', 'aria-label': 'Previous step' }, '‹ Back');
  const next = h('button', { type: 'button', class: 'tool primary', 'data-testid': 'next-step' }, 'Next step ›');
  const all = h('button', { type: 'button', class: 'tool', 'data-testid': 'all-steps' }, 'Show all');
  const last = steps.length - 1;
  let cur = Math.min(1, last);

  function paint() {
    lines.forEach((el, i) => {
      el.classList.toggle('future', i > cur);
      el.classList.toggle('current', i === cur && cur < last + 1);
    });
    counter.textContent = `${cur} / ${last}`;
    back.disabled = cur <= 1;
    next.disabled = cur >= last;
    all.textContent = cur >= last ? 'Replay' : 'Show all';
  }

  back.addEventListener('click', () => {
    cur = Math.max(1, cur - 1);
    paint();
  });
  next.addEventListener('click', () => {
    cur = Math.min(last, cur + 1);
    paint();
  });
  all.addEventListener('click', () => {
    cur = cur >= last ? Math.min(1, last) : last;
    paint();
  });

  const el = h('div', { class: 'stepper', tabindex: '0', 'aria-label': 'Worked example, step by step' }, list, h('div', { class: 'stepper-nav' }, back, counter, next, all));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next.click();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') back.click();
    else return;
    e.preventDefault();
  });
  paint();
  return el;
}
