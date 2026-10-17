import { sound } from '../drill/sound';
import { store } from '../storage/store';
import { DEV_CREDIT } from '../theme';
import { h, type Child } from './dom';
import { ICONS } from './icons';

export type Section = 'train' | 'learn' | 'stats' | 'settings';

export const SECTIONS: { id: Section; label: string; href: string }[] = [
  { id: 'train', label: 'Train', href: '#/' },
  { id: 'learn', label: 'Learn', href: '#/learn' },
  { id: 'stats', label: 'Stats', href: '#/stats' },
  { id: 'settings', label: 'Settings', href: '#/settings' },
];

export function soundToggle(): HTMLButtonElement {
  const btn = h('button', { class: 'iconbtn', type: 'button', 'data-testid': 'mute' });
  const paint = () => {
    btn.innerHTML = sound.muted ? ICONS.soundOff : ICONS.soundOn;
    btn.setAttribute('aria-label', sound.muted ? 'Unmute sounds' : 'Mute sounds');
    btn.setAttribute('aria-pressed', String(sound.muted));
  };
  btn.addEventListener('click', () => {
    sound.muted = !sound.muted;
    store.setPrefs({ muted: sound.muted });
    paint();
  });
  paint();
  return btn;
}

/** Top bar: a back link or the wordmark, section links on wide screens, the mute toggle. */
export function topbar(opts: { back?: { href: string; label: string }; active?: Section } = {}): HTMLElement {
  const left = opts.back
    ? h('a', { class: 'iconbtn back', href: opts.back.href, html: `${ICONS.back}<span>${opts.back.label}</span>` })
    : opts.active === 'train'
      ? h('span')
      : h('a', { class: 'wordmark', href: '#/' }, 'Mental Math');
  const nav = h(
    'nav',
    { class: 'topnav', 'aria-label': 'Sections' },
    SECTIONS.map((s) => h('a', { href: s.href, 'aria-current': s.id === opts.active ? 'page' : null }, s.label)),
  );
  return h('header', { class: 'topbar' }, left, nav, soundToggle());
}

/** Bottom tab bar for phones. */
export function tabbar(active?: Section): HTMLElement {
  return h(
    'nav',
    { class: 'tabbar', 'aria-label': 'Sections' },
    SECTIONS.map((s) =>
      h(
        'a',
        { href: s.href, 'aria-current': s.id === active ? 'page' : null, 'data-testid': `tab-${s.id}` },
        h('span', { class: 'tab-icon', html: ICONS[s.id] }),
        h('span', null, s.label),
      ),
    ),
  );
}

export function footer(): HTMLElement {
  return h('footer', { class: 'footer' }, h('span', null, DEV_CREDIT), h('a', { href: '#/about' }, 'About'));
}

/** Standard page: top bar, content, footer, tab bar. */
export function layout(opts: { active?: Section; back?: { href: string; label: string } }, ...content: Child[]): HTMLElement {
  return h('div', { class: 'layout' }, topbar(opts), h('main', null, ...content), footer(), tabbar(opts.active));
}
