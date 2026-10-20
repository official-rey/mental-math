import { CHAIN_LEVELS, CHAIN_MAX } from '../chain/generator';
import { specToHash } from '../drill/spec';
import { MODES, type Mode } from '../drill/types';
import { store } from '../storage/store';
import { segmented } from './controls';
import { h, reveal } from './dom';
import { ladder } from './ladder';
import type { View } from './router';
import { layout } from './shell';

/** Chains: whole expressions with brackets, solved in order as fast as you can. No tutorial: just play. */
export async function chainView(): Promise<View> {
  const prefs = await store.getPrefs();
  const best = prefs.chainBest;
  let mode: Mode = prefs.mode;

  const btn = h('a', { class: 'btn primary big block', 'data-testid': 'start-chain' }, 'Start', h('span', { class: 'arrow' }, '→'));
  // Every run starts at Level I and climbs; levels reached before go by faster.
  const setHref = () => btn.setAttribute('href', specToHash({ kind: 'chain', ids: [], level: CHAIN_MAX, mode, known: best }));
  setHref();

  const modes = segmented<Mode>('Clock', MODES.map((m) => ({ value: m.id, label: m.id === 'training' ? 'No clock' : m.short })), mode, (m) => {
    mode = m;
    store.setPrefs({ mode: m });
    setHref();
  });

  const main = reveal(
    h(
      'article',
      { class: 'card' },
      h('h1', { class: 'display' }, 'Chains'),
      ladder(best, (l) => CHAIN_LEVELS[l].label, 'chain-ladder'),
      h('div', { class: 'controls' }, h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Clock'), modes)),
      btn,
    ),
  );

  return { el: layout({ active: 'chains' }, main), title: 'Chains' };
}
