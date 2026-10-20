import { ROMAN } from '../techniques/types';
import { h } from './dom';

export const LADDER_MAX = 10;

/** A chess piece for each rung: pawns at the bottom, the king at the top. */
export const PIECE = ['', '♙', '♙', '♘', '♘', '♗', '♗', '♖', '♖', '♕', '♔'] as const;

/** "♘ III" */
export const rung = (level: number) => `${PIECE[Math.min(LADDER_MAX, Math.max(1, level))]} ${ROMAN[level]}`;

/**
 * The ten levels as a ladder of pieces, pawn to king: reached rungs filled, the next one named.
 * Runs always start at the bottom and climb; this shows how high you have been.
 */
export function ladder(best: number, label: (level: number) => string, testid: string): HTMLElement {
  return h(
    'div',
    { class: 'ladder', 'data-testid': testid },
    h(
      'div',
      { class: 'ladder-head' },
      h('span', { class: 'control-label' }, 'Highest level'),
      h('span', { class: 'ladder-level mono' }, `${rung(best)} `, h('span', { class: 'dim' }, `of ${ROMAN[LADDER_MAX]}`)),
    ),
    h(
      'ol',
      { class: 'ladder-steps', 'aria-label': `Level ${best} of ${LADDER_MAX} reached` },
      Array.from({ length: LADDER_MAX }, (_, i) => i + 1).map((l) =>
        h('li', { class: l <= best ? 'got' : '', title: `${ROMAN[l]}: ${label(l)}` }, h('span', { class: 'piece' }, PIECE[l]), h('span', null, ROMAN[l])),
      ),
    ),
    best < LADDER_MAX ? h('p', { class: 'ladder-next dim' }, `Next: ${label(best + 1)}`) : null,
  );
}
