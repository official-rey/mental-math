import { ROMAN } from '../techniques/types';
import { h } from './dom';

export const LADDER_MAX = 10;

/** A chess piece for each rung: pawns at the bottom, the king at the top. */
// Solid pieces read better small; the pawn carries U+FE0E so phones show it as text, not an emoji.
export const PIECE = ['', '♟︎', '♟︎', '♞', '♞', '♝', '♝', '♜', '♜', '♛', '♚'] as const;

/**
 * The font's queen and king are fussy; these are drawn to match the plain, solid look of the
 * other pieces: a crown of five points for the queen, a cross over a rounded crown for the king.
 */
const ROYAL: Record<number, string> = {
  9: '<svg class="piece-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="3" cy="7" r="1.7"/><circle cx="7.5" cy="4.4" r="1.7"/><circle cx="12" cy="3.4" r="1.7"/><circle cx="16.5" cy="4.4" r="1.7"/><circle cx="21" cy="7" r="1.7"/><path d="M3 8.6 6 19.5h12l3-10.9-4.4 5.6-.6-8.4L12 13.4 8 5.8l-.6 8.4z"/><rect x="5" y="20.4" width="14" height="2.6" rx="1.1"/></svg>',
  10: '<svg class="piece-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 .8h2v2.6h2.4v2H13V8h-2V5.4H8.6v-2H11z"/><path d="M6.1 19.6c-.7-2.9-2.8-5-3-8C2.9 8.8 5 7.4 7.3 8.2 9.2 8.9 10.6 10.4 12 12c1.4-1.6 2.8-3.1 4.7-3.8 2.3-.8 4.4.6 4.2 3.4-.2 3-2.3 5.1-3 8z"/><rect x="5" y="20.4" width="14" height="2.6" rx="1.1"/></svg>',
};

/** The piece for a level as HTML: the font's glyph, or a drawing for the queen and king. */
export const pieceHTML = (level: number) => ROYAL[level] ?? PIECE[Math.min(LADDER_MAX, Math.max(1, level))];

/** "♞ III" */
export const rung = (level: number) => `${PIECE[Math.min(LADDER_MAX, Math.max(1, level))]} ${ROMAN[level]}`;

/** Lets the player pick where to play: 0 is Auto (start at I and climb), 1–10 a fixed level. */
export interface LadderPick {
  selected: number;
  onPick(level: number): void;
}

/**
 * The ten levels as a ladder of pieces, pawn to king, with the rungs reached so far filled.
 * With `pick`, the rungs are buttons and an Auto choice sits beside them.
 */
export function ladder(best: number, label: (level: number) => string, testid: string, pick?: LadderPick): HTMLElement {
  const next = h('p', { class: 'ladder-next dim' });
  const rungs = Array.from({ length: LADDER_MAX }, (_, i) => i + 1).map((l) => {
    // The queen and king glyphs are drawn larger than the rest; they get a smaller size to match.
    const body = [h('span', { class: 'piece', html: pieceHTML(l) }), h('span', null, ROMAN[l])];
    const cls = l <= best ? 'got' : '';
    return pick
      ? h('button', { type: 'button', class: `rung ${cls}`, title: `${ROMAN[l]}: ${label(l)}`, 'data-level': String(l), onclick: () => choose(l) }, body)
      : h('li', { class: cls, title: `${ROMAN[l]}: ${label(l)}` }, body);
  });
  const auto = pick ? h('button', { type: 'button', class: 'rung auto', 'data-testid': `${testid}-auto`, onclick: () => choose(0) }, h('span', { class: 'piece' }, '↑'), h('span', null, 'Auto')) : null;

  function paint(selected: number) {
    rungs.forEach((r, i) => r.setAttribute('aria-pressed', String(!!pick && selected === i + 1)));
    auto?.setAttribute('aria-pressed', String(selected === 0));
    // What the Start button will play.
    next.textContent = !pick || selected === 0
      ? best < LADDER_MAX ? `Starts at I and climbs. Next to reach: ${ROMAN[best + 1]}, ${label(best + 1)}` : 'Starts at I and climbs.'
      : `Level ${ROMAN[selected]} only: ${label(selected)}`;
  }

  function choose(level: number) {
    paint(level);
    pick?.onPick(level);
  }

  paint(pick?.selected ?? 0);
  return h(
    'div',
    { class: `ladder${pick ? ' pickable' : ''}`, 'data-testid': testid },
    h(
      'div',
      { class: 'ladder-head' },
      h('span', { class: 'control-label' }, 'Highest level'),
      h('span', { class: 'ladder-level mono' }, h('span', { class: 'piece', html: pieceHTML(best) }), ` ${ROMAN[best]} `, h('span', { class: 'dim' }, `of ${ROMAN[LADDER_MAX]}`)),
    ),
    pick
      ? h('div', { class: 'ladder-steps', role: 'group', 'aria-label': 'Level' }, auto, rungs)
      : h('ol', { class: 'ladder-steps', 'aria-label': `Level ${best} of ${LADDER_MAX} reached` }, rungs),
    next,
  );
}
