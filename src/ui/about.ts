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
      h('h2', { class: 'section-head' }, 'Made in Bukidnon'),
      h('p', { class: 'prose' }, 'Gawa ni Rey S., a BS Mathematics student at Central Mindanao University (CMU), Bukidnon, para sa math community at sa mga students niya.'),
      h('p', { class: 'prose dim' }, 'Techniques adapted from A. T. Benjamin, The Secrets of Mental Math, and the Vedic mathematics tradition. Number theory, trigonometry and higher math go beyond the book.'),
    ),
  );
  return { el: layout({ active: 'settings', back: { href: '#/settings', label: 'Settings' } }, main), title: 'About' };
}
