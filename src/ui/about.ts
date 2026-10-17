import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

export function aboutView(): View {
  const main = reveal(
    h(
      'div',
      null,
      h('h1', { class: 'display' }, 'About'),
      h('p', { class: 'lede' }, 'A trainer for calculating in your head: one technique, one example, then practice until it is automatic.'),
      h('p', { class: 'prose' }, 'Every problem is generated on the spot to suit the technique being drilled. Scores stay on this device.'),
      h('p', { class: 'prose dim' }, 'Techniques adapted from A. T. Benjamin, The Secrets of Mental Math, and the Vedic mathematics tradition.'),
    ),
  );
  return { el: layout({ active: 'settings', back: { href: '#/settings', label: 'Settings' } }, main), title: 'About' };
}
