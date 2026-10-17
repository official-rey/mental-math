import { MODES, type Mode } from '../drill/types';
import { ROMAN } from '../drill/spec';
import type { Level } from '../techniques/types';
import { h } from './dom';

/** Segmented single-choice control. */
export function segmented<T extends string | number>(
  name: string,
  options: { value: T; label: string }[],
  value: T,
  onChange: (v: T) => void,
): HTMLElement {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': name });
  const buttons = options.map((o) =>
    h('button', { type: 'button', 'aria-pressed': String(o.value === value), 'data-value': String(o.value) }, o.label),
  );
  buttons.forEach((b, i) =>
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onChange(options[i].value);
    }),
  );
  wrap.append(...buttons);
  return wrap;
}

/** Level + mode pickers. `levels` adds a line describing the numbers at the chosen level. */
export function drillControls(
  init: { level: Level; mode: Mode },
  onChange: (v: { level: Level; mode: Mode }) => void,
  levels?: Readonly<Record<Level, { readonly label: string }>>,
): HTMLElement {
  const state = { ...init };
  const desc = h('div', { class: 'level-desc mono dim' });
  const paint = () => (desc.textContent = levels ? levels[state.level].label : '');
  paint();
  const level = segmented(
    'Level',
    ([1, 2, 3] as Level[]).map((l) => ({ value: l, label: `Level ${ROMAN[l]}` })),
    state.level,
    (v) => {
      state.level = v;
      paint();
      onChange({ ...state });
    },
  );
  const mode = segmented(
    'Mode',
    MODES.map((m) => ({ value: m.id, label: m.short })),
    state.mode,
    (v) => {
      state.mode = v;
      onChange({ ...state });
    },
  );
  return h(
    'div',
    { class: 'controls' },
    h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Level'), level),
    levels ? desc : null,
    h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Mode'), mode),
  );
}
