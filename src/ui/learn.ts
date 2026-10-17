import { specToHash } from '../drill/spec';
import { store } from '../storage/store';
import { byCategory, techniques } from '../techniques/registry';
import type { CategoryId, Technique, Tier } from '../techniques/types';
import { cardBody } from './card';
import { h } from './dom';
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

/**
 * Learn: techniques by group. Each row opens in place to teach the technique; its checkbox
 * adds it to "my drill" (the same set the Mixed drill uses).
 */
export async function learnView(parts: string[]): Promise<View> {
  const prefs = await store.getPrefs();
  const groups = byCategory();
  const known = new Set(techniques.map((t) => t.meta.id));
  const picked = new Set(prefs.mixed.filter((id) => known.has(id)));
  const state = { level: prefs.level, mode: prefs.mode };
  let current: CategoryId =
    groups.find((g) => g.id === parts[0])?.id ?? (groups.some((g) => g.id === prefs.learnCategory) ? prefs.learnCategory : groups[0].id);
  let openId: string | null = parts[1] && known.has(parts[1]) ? parts[1] : null;

  const list = h('div', { class: 'learn-list' });

  // Sticky "drill what I've ticked" bar.
  const goCount = h('span');
  const go = h('a', { class: 'btn primary block', 'data-testid': 'drill-picked' }, goCount, h('span', { class: 'arrow' }, '→'));
  const clear = h('button', { type: 'button', class: 'tool', onclick: () => setPicked([]) }, 'Clear');
  const dock = h('div', { class: 'learn-dock' }, go, clear);
  function paintDock() {
    const ids = techniques.map((t) => t.meta.id).filter((id) => picked.has(id));
    dock.hidden = ids.length === 0;
    goCount.textContent = `Drill ${ids.length} ticked technique${ids.length === 1 ? '' : 's'}`;
    if (ids.length) {
      go.setAttribute('href', specToHash({ kind: ids.length === 1 ? 'technique' : 'mixed', ids, level: state.level, mode: state.mode }));
    }
  }
  function setPicked(ids: string[]) {
    picked.clear();
    ids.forEach((id) => picked.add(id));
    list.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((b) => (b.checked = picked.has(b.value)));
    store.setPrefs({ mixed: [...picked] });
    paintDock();
  }

  const chips = groups.map((g) =>
    h(
      'button',
      { type: 'button', class: 'chip', role: 'tab', 'data-cat': g.id, onclick: () => select(g.id) },
      h('span', { class: 'chip-glyph', 'aria-hidden': 'true' }, SHORT[g.id].glyph),
      h('span', null, SHORT[g.id].label),
      h('span', { class: 'chip-count' }, String(g.items.length)),
    ),
  );

  function row(t: Technique, n: number): HTMLElement {
    const id = t.meta.id;
    const bodyId = `learn-${id}`;
    const box = h('input', {
      type: 'checkbox',
      value: id,
      'aria-label': `Include ${t.meta.name} in my drill`,
      'data-testid': `pick-${id}`,
      onchange: (e: Event) => {
        if ((e.target as HTMLInputElement).checked) picked.add(id);
        else picked.delete(id);
        store.setPrefs({ mixed: [...picked] });
        paintDock();
      },
    });
    box.checked = picked.has(id);
    const body = h('div', { class: 'tech-body', id: bodyId, hidden: true });
    const head = h(
      'button',
      { type: 'button', class: 'tech-head', 'aria-expanded': 'false', 'aria-controls': bodyId, 'data-testid': `open-${id}` },
      h('span', { class: 'num' }, String(n).padStart(2, '0')),
      h('span', { class: 'tech-text' }, h('span', { class: 'name' }, t.meta.name), h('span', { class: 'idea' }, t.meta.idea)),
      h('span', { class: 'chev', 'aria-hidden': 'true' }),
    );
    const li = h('li', { class: 'tech', 'data-id': id }, h('div', { class: 'tech-row' }, h('label', { class: 'tech-check' }, box), head), body);
    head.addEventListener('click', () => toggle(id));
    return li;
  }

  function toggle(id: string, force?: boolean, scroll = false) {
    const open = force ?? openId !== id;
    // One technique open at a time.
    list.querySelectorAll<HTMLElement>('li.tech').forEach((li) => {
      const isThis = li.dataset.id === id && open;
      const head = li.querySelector('.tech-head')!;
      const body = li.querySelector<HTMLElement>('.tech-body')!;
      head.setAttribute('aria-expanded', String(isThis));
      li.classList.toggle('open', isThis);
      if (isThis && !body.firstChild) body.append(cardBody(techniques.find((t) => t.meta.id === id)!, state));
      body.hidden = !isThis;
      if (isThis && scroll) requestAnimationFrame(() => li.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    });
    openId = open ? id : null;
    history.replaceState(null, '', `#/learn/${current}${openId ? `/${openId}` : ''}`);
  }

  function paint() {
    const g = groups.find((x) => x.id === current)!;
    chips.forEach((c) => c.setAttribute('aria-selected', String(c.dataset.cat === current)));
    let n = 0;
    list.replaceChildren(
      ...TIERS.map((tier) => {
        const items = g.items.filter((t) => t.meta.tier === tier);
        if (!items.length) return null;
        return h(
          'section',
          { class: 'tier-group' },
          h('h3', { class: `tier-head badge tier-${tier.toLowerCase()}` }, tier),
          h('ol', { class: 'tech-list' }, items.map((t) => row(t, ++n))),
        );
      }).filter((x): x is HTMLElement => !!x),
    );
  }

  function select(id: CategoryId) {
    current = id;
    openId = null;
    store.setPrefs({ learnCategory: id });
    history.replaceState(null, '', `#/learn/${id}`);
    paint();
  }

  paint();
  paintDock();

  const content = h(
    'div',
    null,
    h('h1', { class: 'display' }, 'Learn'),
    h('p', { class: 'lede' }, 'Tap to learn. Tick to add to your drill.'),
    h('div', { class: 'chips', role: 'tablist', 'aria-label': 'Technique groups' }, chips),
    list,
    dock,
  );

  return {
    el: layout({ active: 'learn' }, content),
    title: 'Learn',
    mounted() {
      if (openId) toggle(openId, true, true);
    },
  };
}
