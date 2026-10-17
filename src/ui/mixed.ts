import { specToHash } from '../drill/spec';
import { store } from '../storage/store';
import { byCategory, techniques } from '../techniques/registry';
import { drillControls } from './controls';
import { h, reveal } from './dom';
import type { View } from './router';
import { footer, topbar } from './shell';

export async function mixedView(): Promise<View> {
  const prefs = await store.getPrefs();
  const known = new Set(techniques.map((t) => t.meta.id));
  const picked = new Set(prefs.mixed.filter((id) => known.has(id)));
  if (picked.size === 0) techniques.filter((t) => t.meta.tier === 'Foundation').forEach((t) => picked.add(t.meta.id));
  const state = { level: prefs.level, mode: prefs.mode };

  const go = h('a', { class: 'btn primary big block', 'data-testid': 'start-mixed' });
  const boxes: HTMLInputElement[] = [];
  const sync = () => {
    const ids = techniques.map((t) => t.meta.id).filter((id) => picked.has(id));
    go.textContent = '';
    go.append(ids.length ? `Start · ${ids.length} technique${ids.length === 1 ? '' : 's'}` : 'Pick at least one', h('span', { class: 'arrow' }, '→'));
    if (ids.length) go.setAttribute('href', specToHash({ kind: 'mixed', ids, level: state.level, mode: state.mode }));
    else go.removeAttribute('href');
    go.toggleAttribute('aria-disabled', !ids.length);
    boxes.forEach((b) => (b.checked = picked.has(b.value)));
    store.setPrefs({ mixed: ids });
  };

  const quick = (label: string, pick: (tier: string) => boolean) =>
    h('button', {
      class: 'iconbtn',
      type: 'button',
      onclick: () => {
        picked.clear();
        techniques.filter((t) => pick(t.meta.tier)).forEach((t) => picked.add(t.meta.id));
        sync();
      },
    }, label);

  const lists = byCategory().map((cat) =>
    h(
      'section',
      null,
      h('h2', { class: 'section-head kicker' }, cat.name),
      h(
        'ul',
        { class: 'picklist' },
        cat.items.map((t) => {
          const box = h('input', {
            type: 'checkbox',
            value: t.meta.id,
            onchange: (e: Event) => {
              if ((e.target as HTMLInputElement).checked) picked.add(t.meta.id);
              else picked.delete(t.meta.id);
              sync();
            },
          });
          boxes.push(box);
          return h('li', null, h('label', null, box, h('span', { class: 'name' }, t.meta.name), h('span', { class: `badge tier-${t.meta.tier.toLowerCase()}` }, t.meta.tier)));
        }),
      ),
    ),
  );

  const main = reveal(
    h(
      'main',
      null,
      h('h1', { class: 'display' }, 'Mixed drill'),
      h('p', { class: 'lede' }, 'Pick the techniques to shuffle together. Problems alternate between them.'),
      h('div', { class: 'quick-picks' }, quick('Foundation', (t) => t === 'Foundation'), quick('Core', (t) => t === 'Core'), quick('All', () => true), quick('None', () => false)),
      lists,
      drillControls(state, (v) => {
        Object.assign(state, v);
        store.setPrefs(v);
        sync();
      }),
    ),
  );
  sync();

  return {
    el: h('div', null, topbar({ back: { href: '#/', label: 'Home' } }), main, h('div', { class: 'sticky-go' }, go), footer()),
    title: 'Mixed drill',
  };
}
