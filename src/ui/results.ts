import { specToHash } from '../drill/spec';
import { modeLabel, pct, scoreText, secs } from '../share/draw';
import type { DrillSpec, RunRecord } from '../drill/types';
import { store } from '../storage/store';
import { fmt } from '../techniques/util';
import { app } from './context';
import { h, prefersReducedMotion, reveal } from './dom';
import { backHref } from './drill';
import { go, type View } from './router';
import { layout } from './shell';

/** Headline number for a run, and what it counts. */
function scoreParts(run: RunRecord): { value: number; suffix: string; caption: string } {
  const s = scoreText(run);
  return { value: Number(s.main), suffix: s.suffix, caption: s.caption };
}

function countUp(el: HTMLElement, to: number) {
  if (prefersReducedMotion() || to <= 0) {
    el.textContent = String(to);
    return;
  }
  const start = performance.now();
  const dur = Math.min(1100, 400 + to * 25);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = String(Math.round(to * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Score card and GIF buttons. The drawing code loads on first use. */
function shareButtons(run: RunRecord): HTMLElement[] {
  const status = h('div', { class: 'share-status', 'aria-live': 'polite', 'data-testid': 'share-status' });
  const make = (kind: 'png' | 'gif', label: string) => {
    const btn = h('button', { class: 'btn', type: 'button', 'data-testid': `share-${kind}` }, label);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      status.textContent = kind === 'png' ? 'Drawing the score card…' : 'Encoding the replay…';
      try {
        const [share, render] = await Promise.all([
          import('../share/share'),
          kind === 'png'
            ? import('../share/scorecard').then((m) => m.renderScoreCard)
            : import('../share/gif').then((m) => m.renderHighlightGif),
        ]);
        const blob = await render(run);
        (window as unknown as { __mmShare?: object }).__mmShare = { kind, size: blob.size, type: blob.type };
        const out = await share.shareOrDownload(blob, share.fileName(run, kind), share.shareLine(run));
        const kb = `${Math.max(1, Math.round(blob.size / 1024))} KB`;
        status.textContent =
          out === 'shared' ? 'Shared.' : out === 'downloaded' ? `Saved ${kind.toUpperCase()} (${kb}). Summary copied.` : '';
      } catch {
        status.textContent = 'Could not create the image.';
      } finally {
        btn.disabled = false;
      }
    });
    return btn;
  };
  return [make('png', 'Score card'), make('gif', 'GIF replay'), status];
}

export async function resultsView(parts: string[]): Promise<View> {
  let found: { run: RunRecord; saved: { rank: number | null; isBest: boolean }; spec?: DrillSpec } | null = null;
  if (parts[0]) {
    const run = await store.getRun(parts[0]);
    if (run) {
      const board = run.mode === 'training' ? [] : await store.topRuns(run.drillKey, run.mode);
      const idx = board.findIndex((r) => r.id === run.id);
      found = { run, saved: { rank: idx < 0 ? null : idx + 1, isBest: idx === 0 && app.lastResult?.run.id === run.id && app.lastResult.saved.isBest }, spec: run.spec };
    }
  } else if (app.lastResult) {
    found = app.lastResult;
    // Give the finished run a stable address so reloading or sharing the page works.
    history.replaceState(null, '', `#/results/${found.run.id}`);
  }
  if (!found) {
    queueMicrotask(() => go('#/stats'));
    return { el: h('div') };
  }
  const { run, saved, spec } = found;
  const score = scoreParts(run);
  const big = h('span', { class: 'score-num', 'data-testid': 'score' }, '0');

  const board = run.mode === 'training' ? [] : await store.topRuns(run.drillKey, run.mode);
  const misses = run.log.filter((e) => !e.ok);

  const main = reveal(
    h(
      'div',
      { class: 'results', 'data-testid': 'results' },
      h('div', { class: 'kicker' }, modeLabel(run)),
      h('h1', { class: 'display' }, run.drillName),
      h(
        'div',
        { class: 'score' },
        h('div', { class: 'score-line' }, big, h('span', { class: 'score-suffix' }, score.suffix)),
        h('div', { class: 'score-caption' }, score.caption),
        h(
          'div',
          { class: 'score-badges' },
          saved.isBest ? h('span', { class: 'badge solid' }, 'Personal best') : null,
          saved.rank ? h('span', { class: 'badge' }, `#${saved.rank} on this device`) : null,
        ),
      ),
      h(
        'dl',
        { class: 'stats' },
        h('div', null, h('dt', { class: 'kicker' }, 'Accuracy'), h('dd', null, pct(run.accuracy))),
        h('div', null, h('dt', { class: 'kicker' }, 'Avg / problem'), h('dd', null, secs(run.avgMs))),
        h('div', null, h('dt', { class: 'kicker' }, 'Answered'), h('dd', null, String(run.attempted))),
      ),
      h(
        'div',
        { class: 'result-actions' },
        spec ? h('a', { class: 'btn primary big block', href: specToHash(spec), 'data-testid': 'again' }, 'Again', h('span', { class: 'arrow' }, '→')) : null,
        h('div', { class: 'share-row' }, shareButtons(run)),
      ),
      board.length
        ? h(
            'section',
            null,
            h('h2', { class: 'section-head kicker' }, 'Best runs on this device'),
            h(
              'table',
              { class: 'board', 'data-testid': 'leaderboard' },
              h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Score'), h('th', null, 'Acc.'), h('th', null, 'Avg'), h('th', null, 'Date'))),
              h(
                'tbody',
                null,
                board.map((r, i) =>
                  h(
                    'tr',
                    { class: r.id === run.id ? 'me' : '' },
                    h('td', null, String(i + 1)),
                    h('td', null, r.mode === 'twenty' ? `${r.correct}/20 · ${secs(r.totalMs)}` : String(r.correct)),
                    h('td', null, pct(r.accuracy)),
                    h('td', null, secs(r.avgMs)),
                    h('td', null, new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
                  ),
                ),
              ),
            ),
          )
        : null,
      misses.length
        ? h(
            'section',
            null,
            h('h2', { class: 'section-head kicker' }, 'Missed'),
            h(
              'ul',
              { class: 'misses mono' },
              misses.slice(0, 12).map((m) =>
                h('li', null, h('span', null, `${m.text} = `, h('b', null, fmt(m.answer))), h('span', { class: 'dim' }, `you: ${m.input}`)),
              ),
            ),
          )
        : null,
    ),
  );

  return {
    el: layout({ active: 'stats', back: spec ? { href: backHref(spec), label: 'Back' } : { href: '#/stats', label: 'Stats' } }, main),
    title: 'Results',
    mounted: () => countUp(big, score.value),
  };
}
