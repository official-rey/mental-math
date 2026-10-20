import { heroPlate } from '../art/hero';
import { store } from '../storage/store';
import { APP_NAME, DEV_CREDIT } from '../theme';
import { h, reveal } from './dom';
import type { View } from './router';
import { processReel } from './feats';
import { ICONS } from './icons';
import { layout, SECTIONS } from './shell';



export async function homeView(): Promise<View> {
  const prefs = await store.setPrefs({ visits: ((await store.getPrefs()).visits ?? 0) + 1 });
  const plate = prefs.art ? heroPlate() : null;
  const demo = processReel();

  // First screen: the four parts and the book. Everything else is below the fold.
  const why = h(
    'section',
    { class: 'why', id: 'why', 'data-testid': 'why' },
    h('h2', null, 'Bakit mental math?'),
    h(
      'p',
      { class: 'why-lead' },
      'Mental arithmetic is one of the most ',
      h('em', null, 'underrated'),
      ' skills sa math, and one of the most ',
      h('em', null, 'practical'),
      '. Gamit mo siya araw-araw, sa palengke man o sa exam.',
    ),
    demo.el,
    h(
      'p',
      null,
      'Sabi ng iba, wala na raw silbi kasi may calculator na. Pero ang pag-compute sa isip is math in its most old-school form, and para sa isang math major, hindi nawawala ang pagka-astig niyan.',
    ),
    h(
      'p',
      null,
      'Ginawa ko ’to para sa math community namin at para sa mga students ko: isang lugar para matutunan ang bawat trick at i-practice hanggang tumatak. Welcome din ang kahit sinong curious. Bonus pa, pang-impress sa barkada ;p',
    ),
    h('p', { class: 'why-sign' }, `— ${DEV_CREDIT.replace('dev: ', '')}`),
  );

  // Who made it.
  const dev = h(
    'section',
    { class: 'dev', 'data-testid': 'dev' },
    h('h2', null, 'Made in Bukidnon'),
    h(
      'p',
      null,
      'Ako si Rey, a BS Mathematics student at Central Mindanao University (CMU), Bukidnon. Mahilig ako sa numbers at sa pagtuturo, and I believe na kahit sino kayang matuto mag-compute nang mabilis sa isip. Padayon!',
    ),
  );

  const cue = h('button', { type: 'button', class: 'scroll-cue', onclick: () => why.scrollIntoView({ behavior: 'smooth' }) }, 'Why practice mental math', h('span', { 'aria-hidden': 'true' }, '↓'));

  const first = h(
    'section',
    { class: 'first-screen', 'data-testid': 'first-screen' },
    h('h1', { class: 'display' }, APP_NAME),
    h(
      'div',
      { class: 'actions' },
      // One button per part of the app, in the order you use them.
      SECTIONS.map((sec, i) =>
        h(
          'a',
          { class: `btn block mode-btn${i === 0 ? ' primary' : ''}`, href: sec.href, 'data-testid': `home-${sec.id}` },
          h('span', { class: 'mode-icon', html: ICONS[sec.icon] }),
          h('span', { class: 'mode-label' }, sec.label),
          h('span', { class: 'arrow' }, '→'),
        ),
      ),
    ),
    h(
      'div',
      { class: 'book' },
      h('img', { class: 'book-cover', src: './book-cover.jpg', alt: 'Cover of The Secrets of Mental Math by Arthur T. Benjamin', width: '480', height: '721' }),
      h(
        'div',
        { class: 'book-text' },
        h('h2', { class: 'book-title' }, 'The Secrets of Mental Math'),
        h('p', { class: 'book-author' }, 'Arthur T. Benjamin · The Great Courses'),
        h('p', null, 'This tool is built on ideas I took from this book.'),
      ),
    ),
    cue,
  );

  const coda = plate ? h('section', { class: 'coda' }, plate.el) : null;
  const content = reveal(h('div', { class: 'landing' }, first, why, dev, coda));

  return {
    el: layout({ active: 'home' }, content),
    destroy: () => {
      plate?.destroy();
      demo.destroy();
    },
  };
}
