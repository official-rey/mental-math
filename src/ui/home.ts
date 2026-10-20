import { heroPlate } from '../art/hero';
import { store } from '../storage/store';
import { APP_MEANING, APP_NAME, APP_SYLLABLES, DEV_CREDIT } from '../theme';
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
    h('h2', null, 'Why practice mental math'),
    h(
      'p',
      { class: 'why-lead' },
      'Mental arithmetic is one of the most ',
      h('em', null, 'underrated'),
      ' skills in math, and one of the most ',
      h('em', null, 'practical'),
      ' ones to have in real life.',
    ),
    demo.el,
    h(
      'p',
      null,
      'You could argue calculators made it obsolete. But working a number out in your head is math in its most old-school form, and to a math major that never stops being cool.',
    ),
    h(
      'p',
      null,
      'I built this for our math community and for my students: a place to pick up each trick and practise it until it sticks. Anyone else curious enough is welcome too. It also happens to be a great way to impress your friends ;p',
    ),
    h('p', { class: 'why-sign' }, `— ${DEV_CREDIT.replace('dev: ', '')}`),
  );

  const cue = h('button', { type: 'button', class: 'scroll-cue', onclick: () => why.scrollIntoView({ behavior: 'smooth' }) }, 'Why practice mental math', h('span', { 'aria-hidden': 'true' }, '↓'));

  const first = h(
    'section',
    { class: 'first-screen', 'data-testid': 'first-screen' },
    // The name as a dictionary entry: the word, its syllables, what it means.
    h(
      'header',
      { class: 'entry' },
      h('h1', { class: 'entry-word' }, APP_NAME.toLowerCase()),
      h('p', { class: 'entry-say mono' }, `/${APP_SYLLABLES}/`),
      h('ol', { class: 'entry-meanings' }, APP_MEANING.map((m) => h('li', null, m))),
    ),
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
  const content = reveal(h('div', { class: 'landing' }, first, why, coda));

  return {
    el: layout({ active: 'home' }, content),
    destroy: () => {
      plate?.destroy();
      demo.destroy();
    },
  };
}
