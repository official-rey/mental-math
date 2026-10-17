import { heroPlate } from '../art/hero';
import { defaultSpec, specToHash } from '../drill/spec';
import type { DrillSpec } from '../drill/types';
import { store } from '../storage/store';
import { getTechnique } from '../techniques/registry';
import { DEV_CREDIT } from '../theme';
import { h, reveal } from './dom';
import type { View } from './router';
import { processReel } from './feats';
import { layout } from './shell';

const BOOK_URL = 'https://archive.org/details/secretsofmentalm0000arth';

const MODE_WORDS = { training: 'untimed', sprint: 'sprint', twenty: '20 problems' } as const;

/** Plain description of exactly what the Start button launches. */
function whatStarts(s: DrillSpec): string {
  const d = defaultSpec();
  const what =
    s.kind === 'chain'
      ? 'Chain drill'
      : s.kind === 'technique'
        ? getTechnique(s.ids[0])!.meta.name
        : s.ids.length === d.ids.length && s.ids.every((id) => d.ids.includes(id))
          ? 'Foundation mix'
          : `Mix of ${s.ids.length} techniques`;
  const level = s.level > 1 ? `builds to Level ${['', 'I', 'II', 'III'][s.level]}` : 'Level I';
  return `${what} · ${level} · ${MODE_WORDS[s.mode]}`;
}

export async function trainView(): Promise<View> {
  const prefs = await store.setPrefs({ visits: ((await store.getPrefs()).visits ?? 0) + 1 });
  const spec = prefs.last ?? defaultSpec();
  const plate = prefs.art ? heroPlate() : null;
  const demo = processReel();

  // First screen: just the two actions and the book. Everything else is below the fold.
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
    h('p', null, 'So I made this for anyone curious enough to try. It also happens to be a great way to impress your friends ;p'),
    h('p', { class: 'why-sign' }, `— ${DEV_CREDIT.replace('dev: ', '')}`),
  );

  const cue = h('button', { type: 'button', class: 'scroll-cue', onclick: () => why.scrollIntoView({ behavior: 'smooth' }) }, 'Why practice mental math', h('span', { 'aria-hidden': 'true' }, '↓'));

  const first = h(
    'section',
    { class: 'first-screen', 'data-testid': 'first-screen' },
    h('h1', { class: 'display' }, 'Mental Math'),
    h(
      'div',
      { class: 'actions' },
      h('a', { class: 'btn primary big block start-btn', href: '#/learn', 'data-testid': 'start-learning' }, 'Start learning', h('span', { class: 'arrow' }, '→')),
      h('a', { class: 'btn block start-btn drill-btn', href: specToHash(spec), title: whatStarts(spec), 'data-testid': 'start' }, 'Start drilling', h('span', { class: 'arrow' }, '→')),
      h('nav', { class: 'hero-links', 'aria-label': 'Other drills' }, h('a', { href: '#/chain' }, 'Chain drills'), h('a', { href: '#/mixed' }, 'Custom mix')),
    ),
    h(
      'div',
      { class: 'book' },
      h('img', { class: 'book-cover', src: './book-cover.jpg', alt: 'Cover of The Secrets of Mental Math by Arthur T. Benjamin', width: '480', height: '721' }),
      h(
        'div',
        { class: 'book-text' },
        h('h2', null, 'Where these techniques come from'),
        h('p', null, 'Arthur T. Benjamin’s ', h('i', null, 'The Secrets of Mental Math'), ' (The Great Courses). Read it for the ideas; use this for the practice.'),
        h('a', { class: 'book-link', href: BOOK_URL, target: '_blank', rel: 'noopener' }, 'Find the book →'),
      ),
    ),
    cue,
  );

  const coda = plate ? h('section', { class: 'coda' }, plate.el) : null;
  const content = reveal(h('div', { class: 'landing' }, first, why, coda));

  return {
    el: layout({ active: 'train' }, content),
    destroy: () => {
      plate?.destroy();
      demo.destroy();
    },
  };
}
