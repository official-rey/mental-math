import { defaultSpec, describe, specToHash } from '../drill/spec';
import { store } from '../storage/store';
import { byCategory } from '../techniques/registry';
import { h, reveal } from './dom';
import type { View } from './router';
import { footer, topbar } from './shell';

export async function homeView(): Promise<View> {
  const prefs = await store.getPrefs();
  const spec = prefs.last ?? defaultSpec();
  let n = 0;

  const sections = byCategory().map((cat) =>
    h(
      'section',
      null,
      h('h2', { class: 'section-head kicker' }, cat.name),
      h(
        'ul',
        { class: 'toc' },
        cat.items.map((t) =>
          h(
            'li',
            null,
            h(
              'a',
              { href: `#/t/${t.meta.id}` },
              h('span', { class: 'num' }, String(++n).padStart(2, '0')),
              h('span', { class: 'name' }, t.meta.name),
              h('span', { class: `badge tier-${t.meta.tier.toLowerCase()}` }, t.meta.tier),
              h('span', { class: 'idea' }, t.meta.idea),
            ),
          ),
        ),
      ),
    ),
  );

  const main = reveal(
    h(
      'main',
      { class: 'hero' },
      h('h1', { class: 'display' }, 'Mental Math'),
      h('p', { class: 'lede' }, 'Learn a technique in a minute. Then get fast at it.'),
      h(
        'div',
        { class: 'start' },
        h(
          'a',
          { class: 'btn primary big block', href: specToHash(spec), 'data-testid': 'start' },
          prefs.last ? 'Continue drilling' : 'Start drilling',
          h('span', { class: 'arrow' }, '→'),
        ),
        h('div', { class: 'start-meta' }, h('span', null, describe(spec)), h('a', { href: '#/mixed' }, 'change')),
      ),
      h(
        'nav',
        { class: 'alt-modes', 'aria-label': 'Drill modes' },
        h('a', { href: '#/chain' }, h('h3', null, 'Chain drills'), h('p', null, 'Multi-step expressions, one final answer.')),
        h('a', { href: '#/mixed' }, h('h3', null, 'Mixed drill'), h('p', null, 'Pick techniques and shuffle them together.')),
      ),
      sections,
    ),
  );

  return { el: h('div', null, topbar(), main, footer()) };
}
