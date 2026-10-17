import { heroPlate } from '../art/hero';
import { defaultSpec, specToHash } from '../drill/spec';
import type { DrillSpec } from '../drill/types';
import { store } from '../storage/store';
import { getTechnique } from '../techniques/registry';
import { DEV_CREDIT } from '../theme';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

/** After this many runs or visits, the landing page leads with the buttons instead of the why. */
const SEASONED_RUNS = 3;
const SEASONED_VISITS = 8;

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
  const prefs = await store.setPrefs({ visits: ((await store.getPrefs()).visits ?? 0) + 1 });
  const runs = (await store.history(SEASONED_RUNS)).length;
  // New visitors read the why first; after a while of use the buttons come first.
  const seasoned = runs >= SEASONED_RUNS || prefs.visits >= SEASONED_VISITS;
  const spec = prefs.last ?? defaultSpec();
  const plate = prefs.art ? heroPlate() : null;
  const title = h('h1', { class: 'display' }, 'Mental Math');

  const why = h(
    'section',
    { class: `why${seasoned ? '' : ' first'}`, 'data-testid': 'why' },
    seasoned ? h('h2', null, 'Why mental math') : title,
    h(
      'p',
      { class: 'why-lead' },
      'Mental arithmetic is one of the most underrated skills there is, and the most practical math most of us will ever use.',
    ),
    h(
      'p',
      null,
      'Splitting a bill, checking a receipt, sizing up a discount, catching a wrong number in a spreadsheet: it comes up every day, and it is faster than reaching for a phone.',
    ),
    h(
      'p',
      null,
      'It is also just cool. Squaring 85 or multiplying 97 by 94 in your head before anyone finds a calculator still lands like a magic trick, even when you know exactly why it works.',
    ),
    h(
      'p',
      null,
      'None of it is talent. It is a handful of techniques, practised until they are automatic. I made this so you can learn one in a minute, then drill it until it is yours.',
    ),
    h('p', { class: 'why-sign' }, `— ${DEV_CREDIT.replace('dev: ', '')}`),
  );

  const hero = h(
    'section',
    { class: `landing-hero${plate ? '' : ' no-art'}` },
    h(
      'div',
      { class: 'hero-text' },
      seasoned ? title : null,
      h(
        'a',
        { class: 'btn primary big block start-btn', href: '#/learn', 'data-testid': 'start-learning' },
        h('span', { class: 'start-label' }, 'Start learning', h('span', { class: 'arrow' }, '→')),
        h('span', { class: 'start-sub' }, 'A minute per technique, with a worked example'),
      ),
      h(
        'a',
        { class: 'btn block start-btn drill-btn', href: specToHash(spec), 'data-testid': 'start' },
        h('span', { class: 'start-label' }, 'Start drilling', h('span', { class: 'arrow' }, '→')),
        h('span', { class: 'start-sub' }, whatStarts(spec)),
      ),
      h('nav', { class: 'hero-links', 'aria-label': 'Other drills' }, h('a', { href: '#/chain' }, 'Chain drills'), h('a', { href: '#/mixed' }, 'Custom mix')),
    ),
    plate?.el,
  );

  const book = h(
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
  );

  const content = reveal(h('div', { class: 'landing' }, seasoned ? [hero, book, why] : [why, hero, book]));

  return {
    el: layout({ active: 'train' }, content),
    destroy: () => plate?.destroy(),
  };
}
