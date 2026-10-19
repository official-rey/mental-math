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

/** The techniques Train and Challenge use: the ones ticked in Train, or Foundation to begin with. */
export function pickedIds(mixed: string[]): string[] {
  const known = new Set(techniques.map((t) => t.meta.id));
  const ids = mixed.filter((id) => known.has(id));
  return ids.length ? ids : techniques.filter((t) => t.meta.tier === 'Foundation').map((t) => t.meta.id);
}

export function practiceSpec(ids: string[], level: Level, mode: Mode): DrillSpec {
  return { kind: ids.length === 1 ? 'technique' : 'mixed', ids, level, mode };
}

/** Correct answers per technique across saved runs. */
function solvedCounts(runs: RunRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of runs) for (const e of r.log) if (e.ok) m.set(e.technique, (m.get(e.technique) ?? 0) + 1);
  return m;
}

/** Train: pick techniques (with how many you have solved), pick a level, start. No clock. */
export async function trainView(): Promise<View> {
  const prefs = await store.getPrefs();
  const picked = new Set(pickedIds(prefs.mixed));
  const solved = solvedCounts(await store.history());
  let level = prefs.level;

  const go = h('a', { class: 'btn primary big block', 'data-testid': 'start-train' });
  const boxes: HTMLInputElement[] = [];

  function sync() {
    const ids = techniques.map((t) => t.meta.id).filter((id) => picked.has(id));
    go.replaceChildren(ids.length ? `Start · ${ids.length}` : 'Tick a technique', h('span', { class: 'arrow' }, '→'));
    if (ids.length) go.setAttribute('href', specToHash(practiceSpec(ids, level, 'training')));
    else go.removeAttribute('href');
    go.toggleAttribute('aria-disabled', !ids.length);
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
            'data-testid': `pick-${t.meta.id}`,
            onchange: (e: Event) => {
              if ((e.target as HTMLInputElement).checked) picked.add(t.meta.id);
              else picked.delete(t.meta.id);
              sync();
            },
          });
          boxes.push(box);
          const n = solved.get(t.meta.id) ?? 0;
          return h(
            'li',
            null,
            h('label', null, box, h('span', { class: 'name' }, t.meta.name), h('span', { class: `solved mono${n ? '' : ' none'}`, title: 'Solved' }, String(n))),
          );
        }),
      ),
    ),
  );

  sync();
  const content = reveal(
    h(
      'div',
      null,
      h('h1', { class: 'display' }, 'Train'),
      levelControl(level, (l) => {
        level = l;
        store.setPrefs({ level: l });
        sync();
      }),
      h('div', { class: 'quick-picks' }, quick('Foundation', (t) => t === 'Foundation'), quick('All', () => true), quick('None', () => false)),
      lists,
      h('div', { class: 'sticky-go' }, go),
    ),
  );

  return { el: layout({ active: 'train' }, content), title: 'Train' };
}

/** Challenge: your Train selection against the clock, with your best runs. */
export async function challengeView(): Promise<View> {
  const prefs = await store.getPrefs();
  const ids = pickedIds(prefs.mixed);
  let level = prefs.level;
  let mode: Mode = prefs.mode === 'twenty' ? 'twenty' : 'sprint';

  const go = h('a', { class: 'btn primary big block', 'data-testid': 'start-challenge' }, 'Start', h('span', { class: 'arrow' }, '→'));
  const sync = () => go.setAttribute('href', specToHash(practiceSpec(ids, level, mode)));
  sync();

  const bests = (await store.bests()).filter((r) => r.mode !== 'training').slice(0, 6);
  const bestRow = (r: RunRecord) => {
    const s = scoreText(r);
    return h(
      'a',
      { class: 'menu-row', href: `#/results/${r.id}` },
      h('span', { class: 'menu-text' }, h('span', { class: 'menu-title' }, r.drillName), h('span', { class: 'menu-desc mono' }, `${r.mode === 'sprint' ? 'Sprint' : '20 problems'} · ${ROMAN[r.level]}`)),
      h('span', { class: 'menu-score mono' }, `${s.main}${s.suffix}`),
    );
  };

  const content = reveal(
    h(
      'div',
      null,
      h('h1', { class: 'display' }, 'Challenge'),
      h(
        'div',
        { class: 'controls' },
        h(
          'div',
          { class: 'control' },
          h('span', { class: 'control-label' }, 'Clock'),
          segmented<Mode>('Clock', [{ value: 'sprint', label: 'Sprint' }, { value: 'twenty', label: '20 problems' }], mode, (m) => {
            mode = m;
            store.setPrefs({ mode: m });
            sync();
          }),
        ),
      ),
      levelControl(level, (l) => {
        level = l;
        store.setPrefs({ level: l });
        sync();
      }),
      h('a', { class: 'menu-row selection', href: '#/train' }, h('span', { class: 'menu-title' }, 'Techniques'), h('span', { class: 'menu-score mono' }, String(ids.length))),
      go,
      bests.length ? h('section', null, h('h2', { class: 'section-head' }, 'Best'), h('div', { class: 'menu' }, bests.map(bestRow))) : null,
    ),
  );

  return { el: layout({ active: 'challenge' }, content), title: 'Challenge' };
}
