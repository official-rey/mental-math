import { h } from './dom';
import { ICONS } from './icons';

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back' | 'clear' | 'enter';

const LAYOUT: { key: PadKey; label: string; cls?: string; aria?: string }[] = [
  { key: '7', label: '7' },
  { key: '8', label: '8' },
  { key: '9', label: '9' },
  { key: 'back', label: '', cls: 'fn', aria: 'Delete last digit' },
  { key: '4', label: '4' },
  { key: '5', label: '5' },
  { key: '6', label: '6' },
  { key: 'clear', label: 'C', cls: 'fn', aria: 'Clear' },
  { key: '1', label: '1' },
  { key: '2', label: '2' },
  { key: '3', label: '3' },
  { key: 'enter', label: '↵', cls: 'enter', aria: 'Submit answer' },
  { key: '0', label: '0', cls: 'zero' },
  { key: '.', label: '.', aria: 'Decimal point' },
];

/** Phone-style number pad. Buttons never take focus, so the answer field keeps its caret. */
export function keypad(onKey: (k: PadKey) => void): HTMLElement {
  return h(
    'div',
    { class: 'keypad', role: 'group', 'aria-label': 'Number pad', 'data-testid': 'keypad' },
    LAYOUT.map((k) => {
      const b = h('button', {
        type: 'button',
        class: `key ${k.cls ?? ''}`,
        'data-key': k.key,
        'aria-label': k.aria ?? k.label,
        tabindex: '-1',
      });
      if (k.key === 'back') b.innerHTML = ICONS.backspace;
      else b.textContent = k.label;
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('click', () => onKey(k.key));
      return b;
    }),
  );
}

/** Apply a pad key to the current entry. Returns the new value, or null for Enter. */
export function applyKey(value: string, key: PadKey): string | null {
  if (key === 'enter') return null;
  if (key === 'back') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (key === '.') return value.includes('.') ? value : (value || '0') + '.';
  if (value.replace('.', '').length >= 12) return value;
  return value === '0' ? key : value + key;
}
