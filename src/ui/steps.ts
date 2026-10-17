import type { Step } from '../techniques/types';
import { h } from './dom';

/** Vertical worked solution: gutter symbol, right-aligned expression, note. */
export function renderSteps(steps: Step[]): HTMLElement {
  const el = h('div', { class: 'steps', role: 'list' });
  steps.forEach((s, i) => {
    const op = s.op ?? (i === 0 ? '' : '=');
    const last = i === steps.length - 1;
    el.append(
      h('span', { class: 'op', 'aria-hidden': 'true' }, op),
      h('span', { class: `ex${last ? ' last' : ''}`, role: 'listitem' }, s.expr),
      h('span', { class: s.note ? 'nt' : '' }, s.note ?? ''),
    );
  });
  return el;
}
