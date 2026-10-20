import { ROMAN } from '../techniques/types';
import { h } from './dom';

export const LADDER_MAX = 10;

/** A chess piece for each rung: pawns at the bottom, the king at the top. */
// Solid pieces read better small; the pawn carries U+FE0E so phones show it as text, not an emoji.
export const PIECE = ['', '♟︎', '♟︎', '♞', '♞', '♝', '♝', '♜', '♜', '♛', '♚'] as const;

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
    const body = [h('span', { class: `piece${l >= 9 ? ' royal' : ''}` }, PIECE[l]), h('span', null, ROMAN[l])];
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
      h('span', { class: 'ladder-level mono' }, `${rung(best)} `, h('span', { class: 'dim' }, `of ${ROMAN[LADDER_MAX]}`)),
    ),
    pick
      ? h('div', { class: 'ladder-steps', role: 'group', 'aria-label': 'Level' }, auto, rungs)
      : h('ol', { class: 'ladder-steps', 'aria-label': `Level ${best} of ${LADDER_MAX} reached` }, rungs),
    next,
  );
}
