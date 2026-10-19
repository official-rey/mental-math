/**
 * Background: faint graph paper drifting slowly behind the page. The grid fades out behind
 * the content column so text always sits on clean paper. On wide screens the empty side
 * margins carry slowly scrolling columns of worked results from the app's own drills.
 *
 * Everything moves with CSS transforms on composited layers, so the browser animates it
 * without running any script per frame. Static under reduced motion (see app.css).
 */
import { techniques } from '../techniques/registry';
import { betterTechnique } from '../techniques/route';
import type { Level } from '../techniques/types';
import { fmt, makeRng } from '../techniques/util';

/** "47 × 6" and "282": problems with plain arithmetic text from the technique generators. */
function workedLines(count: number, seed: number): [string, string][] {
  const rng = makeRng(seed);
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (let guard = 0; out.length < count && guard < count * 20; guard++) {
    const t = rng.pick(techniques);
    const p = t.generate(rng, rng.pick([1, 2] as Level[]));
    if (/[a-zA-Z]/.test(p.text.replace(/% of /, '').replace(/ mod /, '')) || p.tolerance !== undefined) continue;
    if (p.text.length > 16 || p.answer.startsWith('-') || seen.has(p.text) || betterTechnique(p)) continue;
    seen.add(p.text);
    out.push([p.text, fmt(p.answer)]);
  }
  return out;
}

export interface ArtController {
  pause(): void;
  resume(): void;
  setEnabled(on: boolean): void;
}

/** One margin column: the lines twice over, so scrolling by half loops without a seam. */
function column(side: 'left' | 'right', lines: [string, string][]): HTMLElement {
  const track = document.createElement('div');
  track.className = 'art-track';
  const rows = lines.map(([q, a]) => `<div><span>${q} = </span><b>${a}</b></div>`).join('');
  track.innerHTML = rows + rows;
  const col = document.createElement('div');
  col.className = `art-col ${side}`;
  col.append(track);
  return col;
}

export function startArt(host: HTMLElement): ArtController {
  const grid = document.createElement('div');
  grid.className = 'art-grid';
  const paper = document.createElement('div');
  paper.className = 'art-paper';
  paper.append(grid);
  host.append(paper);

  // The margin columns only show on wide screens; build them the first time they are needed.
  const wide = matchMedia('(min-width: 1100px)');
  const addColumns = () => {
    if (!wide.matches || host.querySelector('.art-col')) return;
    host.append(column('left', workedLines(48, 7)), column('right', workedLines(48, 13)));
  };
  addColumns();
  wide.addEventListener?.('change', addColumns);

  return {
    pause: () => host.classList.add('is-paused'),
    resume: () => host.classList.remove('is-paused'),
    setEnabled: (on) => host.classList.toggle('is-off', !on),
  };
}
