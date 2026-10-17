import { store } from '../storage/store';
import { byCategory } from '../techniques/registry';
import type { CategoryId, Tier } from '../techniques/types';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

const SHORT: Record<CategoryId, { label: string; glyph: string }> = {
  addsub: { label: 'Add & subtract', glyph: '±' },
  mul: { label: 'Multiply', glyph: '×' },
  div: { label: 'Divide', glyph: '÷' },
  est: { label: 'Estimate', glyph: '≈' },
  check: { label: 'Check', glyph: '✓' },
};

const TIERS: Tier[] = ['Foundation', 'Core', 'Advanced'];

export async function learnView(parts: string[]): Promise<View> {
  const prefs = await store.getPrefs();
  const groups = byCategory();
  const fromUrl = groups.find((g) => g.id === parts[0])?.id;
  let current: CategoryId = fromUrl ?? (groups.some((g) => g.id === prefs.learnCategory) ? prefs.learnCategory : groups[0].id);

  const list = h('div', { class: 'learn-list', 'aria-live': 'polite' });
  const chips = groups.map((g) =>
    h(
      'button',
      {
        type: 'button',
        class: 'chip',
        role: 'tab',
        'data-cat': g.id,
        onclick: () => select(g.id),
      },
      h('span', { class: 'chip-glyph', 'aria-hidden': 'true' }, SHORT[g.id].glyph),
      h('span', null, SHORT[g.id].label),
      h('span', { class: 'chip-count' }, String(g.items.length)),
    ),
  );

  function paint() {
    const g = groups.find((x) => x.id === current)!;
    chips.forEach((c) => c.setAttribute('aria-selected', String(c.dataset.cat === current)));
    let n = 0;
    list.replaceChildren(
      reveal(
        h(
          'div',
          null,
          TIERS.map((tier) => {
            const items = g.items.filter((t) => t.meta.tier === tier);
            if (!items.length) return null;
            return h(
              'section',
              { class: 'tier-group' },
              h('h3', { class: `tier-head badge tier-${tier.toLowerCase()}` }, tier),
              h(
                'ol',
                { class: 'toc' },
                items.map((t) =>
                  h(
                    'li',
                    null,
                    h(
                      'a',
                      { href: `#/t/${t.meta.id}` },
                      h('span', { class: 'num' }, String(++n).padStart(2, '0')),
                      h('span', { class: 'name' }, t.meta.name),
                      h('span', { class: 'idea' }, t.meta.idea),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  function select(id: CategoryId) {
    current = id;
    store.setPrefs({ learnCategory: id });
    history.replaceState(null, '', `#/learn/${id}`);
    paint();
  }

  paint();

  const content = h(
    'div',
    null,
    h('h1', { class: 'display' }, 'Learn'),
    h('p', { class: 'lede' }, 'Each card gives the idea, one worked example and a picture of why it works.'),
    h('div', { class: 'chips', role: 'tablist', 'aria-label': 'Technique groups' }, chips),
    list,
  );

  return { el: layout({ active: 'learn' }, content), title: 'Learn' };
}
