import { APP_MEANING, APP_NAME } from '../theme';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

export function aboutView(): View {
  const main = reveal(
    h(
      'div',
      null,
      h('h1', { class: 'display' }, 'About'),
      h(
        'p',
        { class: 'lede' },
        h('i', null, APP_NAME.toLowerCase()),
        ` means ${APP_MEANING.join(' ').replace(/\.$/, '')}. It is a trainer for calculating in your head: learn a technique, see it worked out, then practise until it is automatic.`,
      ),

      // Who made it, and why.
      h(
        'section',
        { class: 'maker', 'data-testid': 'maker' },
        h(
          'div',
          { class: 'maker-card' },
          h('div', { class: 'maker-mark', 'aria-hidden': 'true' }, 'R'),
          h(
            'div',
            null,
            h('h2', { class: 'maker-name' }, 'Rey S.'),
            h('p', { class: 'maker-line' }, 'BS Mathematics · Central Mindanao University'),
            h('p', { class: 'maker-line dim' }, 'Bukidnon, Philippines'),
          ),
        ),
        h(
          'p',
          { class: 'prose' },
          'I made Kuwenta for our math community and for my students: one place to learn the tricks that make numbers easy, and to practise them until they stick. It is built from scratch, from the problem generators to the drawings, and every problem is made fresh for you.',
        ),
        h('p', { class: 'prose' }, 'If it helps you calculate a little faster, or makes you like numbers a little more, it did its job. Padayon!'),
      ),

      h('h2', { class: 'section-head' }, 'Good to know'),
      h(
        'ul',
        { class: 'prose about-facts' },
        h('li', null, 'No account. Scores, names and trophies stay on this device.'),
        h('li', null, 'Mistakes are retried, not counted against you twice.'),
        h('li', null, 'Shared images are saved to your device; nothing is uploaded.'),
      ),
      h('p', { class: 'prose dim' }, 'Techniques adapted from A. T. Benjamin, The Secrets of Mental Math, and the Vedic mathematics tradition. Number theory, trigonometry and higher math go beyond the book.'),
    ),
  );
  return { el: layout({ active: 'settings', back: { href: '#/settings', label: 'Settings' } }, main), title: 'About' };
}
