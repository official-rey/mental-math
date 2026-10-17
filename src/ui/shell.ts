import { DEV_CREDIT } from '../theme';
import { sound } from '../drill/sound';
import { store } from '../storage/store';
import { h } from './dom';
import { ICONS } from './icons';

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

export function topbar(opts: { back?: { href: string; label: string }; center?: Node | string } = {}): HTMLElement {
  const left = opts.back
    ? h('a', { class: 'iconbtn', href: opts.back.href, html: `${ICONS.back}<span>${opts.back.label}</span>` })
    : h('span', { class: 'kicker' }, 'Mental Math');
  return h('header', { class: 'topbar' }, left, opts.center ?? '', soundToggle());
}

export function footer(): HTMLElement {
  return h('footer', { class: 'footer' }, h('span', null, DEV_CREDIT), h('a', { href: '#/about' }, 'About'));
}

export function page(...children: (Node | string | false | null | undefined)[]): HTMLElement {
  return h('div', { class: 'page', style: { display: 'contents' } }, ...children);
}
