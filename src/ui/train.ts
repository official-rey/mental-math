import { heroPlate } from '../art/hero';
import { defaultSpec, specToHash } from '../drill/spec';
import type { DrillSpec } from '../drill/types';
import { store } from '../storage/store';
import { getTechnique } from '../techniques/registry';
import { DEV_CREDIT } from '../theme';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

const BOOK_URL = 'https://archive.org/details/secretsofmentalm0000arth';

const MODE_WORDS = { training: 'untimed', sprint: '60-second sprint', twenty: '20 problems' } as const;

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
  return `${what} · Level ${['', 'I', 'II', 'III'][s.level]} · ${MODE_WORDS[s.mode]}`;
}

export async function trainView(): Promise<View> {
  const prefs = await store.getPrefs();
  const spec = prefs.last ?? defaultSpec();
  const plate = prefs.art ? heroPlate() : null;

  const content = reveal(
    h(
      'div',
      { class: 'landing' },
      h(
        'section',
        { class: `landing-hero${plate ? '' : ' no-art'}` },
        h(
          'div',
          { class: 'hero-text' },
          h('h1', { class: 'display' }, 'Mental Math'),
          h(
            'a',
            { class: 'btn primary big block start-btn', href: specToHash(spec), 'data-testid': 'start' },
            h('span', { class: 'start-label' }, 'Start drilling', h('span', { class: 'arrow' }, '→')),
            h('span', { class: 'start-sub' }, whatStarts(spec)),
          ),
          h(
            'nav',
            { class: 'hero-links', 'aria-label': 'Other drills' },
            h('a', { href: '#/mixed' }, 'Pick techniques'),
            h('a', { href: '#/chain' }, 'Chain drills'),
            h('a', { href: '#/learn' }, 'All techniques'),
          ),
        ),
        plate?.el,
      ),
      h(
        'section',
        { class: 'book' },
        h('img', { class: 'book-cover', src: './book-cover.jpg', alt: 'Cover of The Secrets of Mental Math by Arthur T. Benjamin', width: '480', height: '721', loading: 'lazy' }),
        h(
          'div',
          { class: 'book-text' },
          h('h2', null, 'The book behind it'),
          h(
            'p',
            null,
            'Arthur T. Benjamin’s ',
            h('i', null, 'The Secrets of Mental Math'),
            ' (The Great Courses) is the clearest account of how fast calculators actually work: left to right, in chunks, checking as they go. Most of the techniques here come from it.',
          ),
          h('p', null, 'Read it for the ideas. Use this for the practice.'),
          h('a', { class: 'book-link', href: BOOK_URL, target: '_blank', rel: 'noopener' }, 'Find the book →'),
        ),
      ),
      h(
        'section',
        { class: 'why' },
        h('h2', null, 'Why I made this'),
        h(
          'p',
          null,
          'Mental arithmetic is not a talent. It is a handful of moves that become automatic with the right practice. Reading about the moves takes an afternoon; making them automatic takes problems built for each move and a quick way to drill them.',
        ),
        h(
          'p',
          null,
          'I could not find that, so I built it: one technique at a time, a minute to learn it, then as many well-chosen problems as you want. It is for our math community, and for anyone who would rather work it out than reach for a phone.',
        ),
        h('p', { class: 'why-sign' }, `— ${DEV_CREDIT.replace('dev: ', '')}`),
      ),
    ),
  );

  return {
    el: layout({ active: 'train' }, content),
    destroy: () => plate?.destroy(),
  };
}
