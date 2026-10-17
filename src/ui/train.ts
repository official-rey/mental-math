import { heroPlate } from '../art/hero';
import { defaultSpec, describe, specToHash } from '../drill/spec';
import type { DrillSpec, RunRecord } from '../drill/types';
import { scoreText } from '../share/draw';
import { store } from '../storage/store';
import { techniques } from '../techniques/registry';
import { CATEGORIES } from '../techniques/types';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

/** Where "change" goes for the drill the Start button would launch. */
function changeHref(s: DrillSpec): string {
  if (s.kind === 'technique') return `#/t/${s.ids[0]}`;
  return s.kind === 'chain' ? '#/chain' : '#/mixed';
}

function menuRow(href: string, title: string, desc: string, testid?: string): HTMLElement {
  return h(
    'a',
    { class: 'menu-row', href, 'data-testid': testid },
    h('span', { class: 'menu-text' }, h('span', { class: 'menu-title' }, title), h('span', { class: 'menu-desc' }, desc)),
    h('span', { class: 'menu-arrow', 'aria-hidden': 'true' }, '→'),
  );
}

function recentRow(run: RunRecord): HTMLElement | null {
  if (!run.spec) return null;
  const s = scoreText(run);
  return h(
    'a',
    { class: 'menu-row', href: specToHash(run.spec) },
    h('span', { class: 'menu-text' }, h('span', { class: 'menu-title' }, run.drillName), h('span', { class: 'menu-desc mono' }, describe(run.spec).replace(`${run.drillName} · `, ''))),
    h('span', { class: 'menu-score mono' }, `${s.main}${s.suffix}`),
  );
}

export async function trainView(): Promise<View> {
  const prefs = await store.getPrefs();
  const history = await store.history(30);
  const spec = prefs.last ?? defaultSpec();
  const plate = prefs.art ? heroPlate() : null;

  // De-duplicate recent drills by what was drilled.
  const seen = new Set<string>();
  const recent = history.filter((r) => r.spec && !seen.has(r.drillKey + r.mode) && seen.add(r.drillKey + r.mode)).slice(0, 3);
  const answered = history.reduce((a, r) => a + r.attempted, 0);
  const correct = history.reduce((a, r) => a + r.correct, 0);

  const content = reveal(
    h(
      'div',
      { class: 'train' },
      h(
        'section',
        { class: `train-hero${plate ? '' : ' no-art'}` },
        h(
          'div',
          { class: 'hero-text' },
          h('h1', { class: 'display' }, 'Mental Math'),
          h('p', { class: 'lede' }, 'Learn a technique in a minute. Then get fast at it.'),
          h(
            'a',
            { class: 'btn primary big block', href: specToHash(spec), 'data-testid': 'start' },
            prefs.last ? 'Continue drilling' : 'Start drilling',
            h('span', { class: 'arrow' }, '→'),
          ),
          h('div', { class: 'start-meta' }, h('span', null, describe(spec)), h('a', { href: changeHref(spec) }, 'change')),
        ),
        plate?.el,
      ),
      h(
        'section',
        null,
        h('h2', { class: 'section-head kicker' }, 'Start a drill'),
        h(
          'div',
          { class: 'menu' },
          menuRow(specToHash(defaultSpec()), 'Quick mix', 'Every Foundation technique, shuffled, Level I.', 'quick-mix'),
          menuRow('#/mixed', 'Mixed drill', 'Choose your own set of techniques.'),
          menuRow('#/chain', 'Chain drills', 'Multi-step expressions, one final answer.'),
          menuRow('#/learn', 'Learn a technique', `${techniques.length} techniques in ${CATEGORIES.length} groups.`),
        ),
      ),
      recent.length
        ? h('section', null, h('h2', { class: 'section-head kicker' }, 'Again'), h('div', { class: 'menu' }, recent.map(recentRow)))
        : null,
      answered
        ? h(
            'a',
            { class: 'summary-strip mono', href: '#/stats' },
            h('span', null, h('b', null, String(answered)), ' answered'),
            h('span', null, h('b', null, `${Math.round((100 * correct) / answered)}%`), ' correct'),
            h('span', null, h('b', null, String(history.length)), ' runs'),
          )
        : null,
    ),
  );

  return {
    el: layout({ active: 'train' }, content),
    destroy: () => plate?.destroy(),
  };
}
