import { specToHash } from '../drill/spec';
import type { Mode } from '../drill/types';
import { store } from '../storage/store';
import { getTechnique } from '../techniques/registry';
import type { Level, Technique } from '../techniques/types';
import { drillControls } from './controls';
import { h } from './dom';
import { learnView } from './learn';
import type { View } from './router';
import { renderStepper } from './steps';

/**
 * Everything needed to learn one technique: prose, the step-through example, the picture,
 * and a button to drill it. `state` is shared so level and mode carry across techniques.
 */
export function cardBody(t: Technique, state: { level: Level; mode: Mode }): HTMLElement {
  const drillBtn = h('a', { class: 'btn primary block', 'data-testid': 'drill-this' }, 'Practise this one', h('span', { class: 'arrow' }, '→'));
  const setHref = () =>
    drillBtn.setAttribute('href', specToHash({ kind: 'technique', ids: [t.meta.id], level: state.level, mode: state.mode }));
  setHref();

  // The stepped example and the numbered picture carry the explanation; no extra prose.
  const figure = h('figure', { class: 'figure', title: t.card.caption });
  figure.innerHTML = t.card.graphic();

  return h(
    'div',
    { class: 'card', 'data-technique': t.meta.id },
    renderStepper(t.steps(t.card.example)),
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
  );
}

/** Old card links (#/t/<id>) open the technique in place on the Learn screen. */
export async function cardView(parts: string[]): Promise<View> {
  const t = getTechnique(parts[0] ?? '');
  const target = t ? `#/learn/${t.meta.category}/${t.meta.id}` : '#/learn';
  history.replaceState(null, '', target);
  return learnView(t ? [t.meta.category, t.meta.id] : []);
}
