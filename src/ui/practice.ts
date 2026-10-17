import { specToHash } from '../drill/spec';
import type { DrillSpec, Mode, RunRecord } from '../drill/types';
import { scoreText } from '../share/draw';
import { store } from '../storage/store';
import { byCategory, techniques } from '../techniques/registry';
import { ROMAN, type Level } from '../techniques/types';
import { levelControl, segmented } from './controls';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

/** The techniques Train and Challenge use: the ones ticked in Learn, or Foundation to begin with. */
export function pickedIds(mixed: string[]): string[] {
  const known = new Set(techniques.map((t) => t.meta.id));
  const ids = mixed.filter((id) => known.has(id));
  return ids.length ? ids : techniques.filter((t) => t.meta.tier === 'Foundation').map((t) => t.meta.id);
}

export function practiceSpec(ids: string[], level: Level, mode: Mode): DrillSpec {
  return { kind: ids.length === 1 ? 'technique' : 'mixed', ids, level, mode };
}

/**
 * Train (untimed, steps after a miss) and Challenge (timed, scored) share one setup:
 * which techniques, which level, and for Challenge which clock.
 */
export async function practiceView(kind: 'train' | 'challenge'): Promise<View> {
  const prefs = await store.getPrefs();
  const picked = new Set(pickedIds(prefs.mixed));
  let level = prefs.level;
  let mode: Mode = kind === 'train' ? 'training' : prefs.mode === 'twenty' ? 'twenty' : 'sprint';

  const go = h('a', { class: 'btn primary big block', 'data-testid': `start-${kind}` });
  const count = h('span', { class: 'mono dim' });
  const boxes: HTMLInputElement[] = [];

  function sync() {
    const ids = techniques.map((t) => t.meta.id).filter((id) => picked.has(id));
    go.replaceChildren(ids.length ? (kind === 'train' ? 'Start training' : 'Start the challenge') : 'Pick at least one technique', h('span', { class: 'arrow' }, '→'));
    if (ids.length) go.setAttribute('href', specToHash(practiceSpec(ids, level, mode)));
    else go.removeAttribute('href');
    go.toggleAttribute('aria-disabled', !ids.length);
    count.textContent = `${ids.length} selected`;
    boxes.forEach((b) => (b.checked = picked.has(b.value)));
    store.setPrefs({ mixed: ids });
  }

  const quick = (label: string, pick: (tier: string) => boolean) =>
    h('button', {
      class: 'tool',
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
      h('h3', { class: 'pick-head' }, cat.name),
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
          return h('li', null, h('label', null, box, h('span', { class: 'name' }, t.meta.name)));
        }),
      ),
    ),
  );

  const chooser = h(
    'details',
    { class: 'chooser' },
    h('summary', null, h('span', null, 'Techniques'), count),
    h('div', { class: 'quick-picks' }, quick('Foundation', (t) => t === 'Foundation'), quick('Core', (t) => t === 'Core'), quick('All', () => true), quick('None', () => false)),
    lists,
  );

  const levels = levelControl(
    level,
    (l) => {
      level = l;
      store.setPrefs({ level: l });
      sync();
    },
    (l) => (l > 1 ? `Starts at Level I and climbs to ${ROMAN[l]}` : 'Level I throughout'),
  );

  const clock =
    kind === 'challenge'
      ? h(
          'div',
          { class: 'controls' },
          h(
            'div',
            { class: 'control' },
            h('span', { class: 'control-label' }, 'Clock'),
            segmented<Mode>(
              'Clock',
              [
                { value: 'sprint', label: 'Sprint' },
                { value: 'twenty', label: '20 problems' },
              ],
              mode,
              (m) => {
                mode = m;
                store.setPrefs({ mode: m });
                sync();
                paintHint();
              },
            ),
          ),
        )
      : null;
  const clockHint = h('p', { class: 'dim small-note' });
  const paintHint = () =>
    (clockHint.textContent =
      kind === 'train'
        ? 'No clock. A miss shows the steps for that exact problem.'
        : mode === 'sprint'
          ? '60 seconds, plus 2 seconds for every correct answer.'
          : '20 problems, as fast as you can.');
  paintHint();

  const bests = kind === 'challenge' ? (await store.bests()).filter((r) => r.mode !== 'training').slice(0, 5) : [];
  const bestRow = (r: RunRecord) => {
    const s = scoreText(r);
    return h(
      'a',
      { class: 'menu-row', href: `#/results/${r.id}` },
      h('span', { class: 'menu-text' }, h('span', { class: 'menu-title' }, r.drillName), h('span', { class: 'menu-desc mono' }, `${r.mode === 'sprint' ? 'Sprint' : '20 problems'} · ${ROMAN[r.level]}`)),
      h('span', { class: 'menu-score mono' }, `${s.main}${s.suffix}`),
    );
  };

  sync();
  const content = reveal(
    h(
      'div',
      null,
      h('h1', { class: 'display' }, kind === 'train' ? 'Train' : 'Challenge'),
      clockHint,
      clock,
      levels,
      chooser,
      h('div', { class: 'sticky-go' }, go),
      bests.length ? h('section', null, h('h2', { class: 'section-head' }, 'Your best challenges'), h('div', { class: 'menu' }, bests.map(bestRow))) : null,
    ),
  );

  return { el: layout({ active: kind }, content), title: kind === 'train' ? 'Train' : 'Challenge' };
}
