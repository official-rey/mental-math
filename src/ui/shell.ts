import { sound } from '../drill/sound';
import { store } from '../storage/store';
import { APP_NAME, DEV_CREDIT } from '../theme';
import { h, type Child } from './dom';
import { ICONS } from './icons';

export type Section = 'home' | 'learn' | 'train' | 'challenge' | 'chains' | 'stats' | 'settings';

/** The four parts of the app, in the order you use them. */
export const SECTIONS: { id: Section; label: string; href: string; icon: keyof typeof ICONS }[] = [
  { id: 'learn', label: 'Learn', href: '#/learn', icon: 'learn' },
  { id: 'train', label: 'Train', href: '#/train', icon: 'train' },
  { id: 'challenge', label: 'Challenge', href: '#/challenge', icon: 'challenge' },
  { id: 'chains', label: 'Chains', href: '#/chain', icon: 'chains' },
];

const EXTRA: { id: Section; label: string; href: string; icon: keyof typeof ICONS }[] = [
  { id: 'stats', label: 'Stats', href: '#/stats', icon: 'stats' },
  { id: 'settings', label: 'Settings', href: '#/settings', icon: 'settings' },
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

/** Top bar: back link or wordmark, section links on wide screens, Stats/Settings icons on phones, mute. */
export function topbar(opts: { back?: { href: string; label: string }; active?: Section } = {}): HTMLElement {
  const left = opts.back
    ? h('a', { class: 'iconbtn back', href: opts.back.href, html: `${ICONS.back}<span>${opts.back.label}</span>` })
    : h('a', { class: 'wordmark', href: '#/' }, APP_NAME);
  const nav = h(
    'nav',
    { class: 'topnav', 'aria-label': 'Sections' },
    [...SECTIONS, ...EXTRA].map((s) => h('a', { href: s.href, class: EXTRA.includes(s) ? 'extra' : null, 'aria-current': s.id === opts.active ? 'page' : null }, s.label)),
  );
  const icons = h(
    'div',
    { class: 'top-icons' },
    EXTRA.map((s) =>
      h('a', { class: 'iconbtn', href: s.href, 'aria-label': s.label, 'aria-current': s.id === opts.active ? 'page' : null, 'data-testid': `top-${s.id}`, html: ICONS[s.icon] }),
    ),
  );
  return h('header', { class: 'topbar' }, left, nav, icons, soundToggle());
}

/** Bottom tab bar for phones: Learn, Train, Challenge, Chains. */
export function tabbar(active?: Section): HTMLElement {
  return h(
    'nav',
    { class: 'tabbar', 'aria-label': 'Sections' },
    SECTIONS.map((s) =>
      h(
        'a',
        { href: s.href, 'aria-current': s.id === active ? 'page' : null, 'data-testid': `tab-${s.id}` },
        h('span', { class: 'tab-icon', html: ICONS[s.icon] }),
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
