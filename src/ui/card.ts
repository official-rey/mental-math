import { specToHash } from '../drill/spec';
import { store } from '../storage/store';
import { getTechnique } from '../techniques/registry';
import { CATEGORIES } from '../techniques/types';
import { drillControls } from './controls';
import { h, reveal } from './dom';
import type { View } from './router';
import { footer, topbar } from './shell';
import { renderSteps } from './steps';

export async function cardView(parts: string[]): Promise<View> {
  const t = getTechnique(parts[0] ?? '');
  if (!t) return notFound();
  const prefs = await store.getPrefs();
  const state = { level: prefs.level, mode: prefs.mode };
  const cat = CATEGORIES.find((c) => c.id === t.meta.category)!;

  const drillBtn = h(
    'a',
    { class: 'btn primary big block', 'data-testid': 'drill-this' },
    'Drill this',
    h('span', { class: 'arrow' }, '→'),
  );
  const setHref = () =>
    drillBtn.setAttribute('href', specToHash({ kind: 'technique', ids: [t.meta.id], level: state.level, mode: state.mode }));
  setHref();

  const figure = h('figure', { class: 'figure' });
  figure.innerHTML = t.card.graphic();
  figure.append(h('figcaption', null, t.card.caption));

  const article = reveal(
    h(
      'article',
      { class: 'card', 'data-technique': t.meta.id },
      h('div', { class: 'kicker' }, cat.name),
      h('h1', { class: 'display' }, t.meta.name),
      h('div', { class: 'meta' }, h('span', { class: `badge tier-${t.meta.tier.toLowerCase()}` }, t.meta.tier)),
      h('p', { class: 'lede' }, t.meta.idea),
      t.card.prose.map((p) => h('p', { class: 'prose' }, p)),
      h('div', { class: 'kicker example-label' }, 'Example'),
      renderSteps(t.steps(t.card.example)),
      figure,
      drillControls(
        state,
        (v) => {
          Object.assign(state, v);
          store.setPrefs(v);
          setHref();
        },
        t.levels,
      ),
      drillBtn,
    ),
  );

  return {
    el: h('div', null, topbar({ back: { href: '#/', label: 'All' } }), h('main', null, article), footer()),
    title: t.meta.name,
  };
}

function notFound(): View {
  return {
    el: h(
      'div',
      null,
      topbar({ back: { href: '#/', label: 'Home' } }),
      h('main', null, h('h1', { class: 'display' }, 'Not found'), h('p', { class: 'lede' }, h('a', { href: '#/' }, 'Back to the techniques'))),
      footer(),
    ),
  };
}
