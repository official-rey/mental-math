import { specToHash } from '../drill/spec';
import { getTechnique } from '../techniques/registry';
import type { Level, Technique } from '../techniques/types';
import { h } from './dom';
import { learnView } from './learn';
import type { View } from './router';
import { renderStepper } from './steps';

/**
 * Learning one technique: the worked example (problem first, then steps), the picture of the
 * procedure, and one button to train it untimed.
 */
export function cardBody(t: Technique, level: Level): HTMLElement {
  const figure = h('figure', { class: 'figure', title: t.card.caption });
  figure.innerHTML = t.card.graphic();
  return h(
    'div',
    { class: 'card', 'data-technique': t.meta.id },
    renderStepper(t.steps(t.card.example)),
    figure,
    h(
      'a',
      { class: 'btn primary block', href: specToHash({ kind: 'technique', ids: [t.meta.id], level, mode: 'training' }), 'data-testid': 'drill-this' },
      'Train this',
      h('span', { class: 'arrow' }, '→'),
    ),
  );
}

/** Old card links (#/t/<id>) open the technique in place on the Learn screen. */
export async function cardView(parts: string[]): Promise<View> {
  const t = getTechnique(parts[0] ?? '');
  const target = t ? `#/learn/${t.meta.category}/${t.meta.id}` : '#/learn';
  history.replaceState(null, '', target);
  return learnView(t ? [t.meta.category, t.meta.id] : []);
}
