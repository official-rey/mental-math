import { sound } from '../drill/sound';
import { specToHash } from '../drill/spec';
import { deltaLabel, ratingLabel, title } from '../drill/rating';
import { TROPHIES } from '../drill/trophies';
import { TROPHY_ICON } from './stats';
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
function scoreParts(run: RunRecord): { value: number; places: number; suffix: string; caption: string } {
  const s = scoreText(run);
  return { value: Number(s.main), places: s.main.split('.')[1]?.length ?? 0, suffix: s.suffix, caption: s.caption };
}

function countUp(el: HTMLElement, to: number, places = 0) {
  if (prefersReducedMotion() || to <= 0) {
    el.textContent = to.toFixed(places);
    return;
  }
  const start = performance.now();
  const dur = Math.min(1100, 400 + to * 25);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = (to * (1 - (1 - t) ** 3)).toFixed(places);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * One "Share result" button; it then offers the format, and the picture is saved straight to
 * the device. No share sheet, no links, nothing uploaded.
 */
function shareResult(run: RunRecord, best: boolean): [button: HTMLElement, panel: HTMLElement] {
  const status = h('div', { class: 'share-status', 'aria-live': 'polite', 'data-testid': 'share-status' });
  const make = (kind: 'png' | 'gif', label: string) => {
    const btn = h('button', { class: 'tool', type: 'button', 'data-testid': `share-${kind}` }, label);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      status.textContent = 'Drawing…';
      try {
        const [share, blob] = await Promise.all([
          import('../share/share'),
          kind === 'png' ? import('../share/scorecard').then((m) => m.renderScoreCard(run, { best })) : import('../share/gif').then((m) => m.renderHighlightGif(run)),
        ]);
        share.saveFile(blob, share.fileName(run, kind));
        status.textContent = `Saved ${kind === 'png' ? 'image' : 'GIF'} (${Math.max(1, Math.round(blob.size / 1024))} KB).`;
      } catch {
        status.textContent = 'Could not create the image.';
      } finally {
        btn.disabled = false;
      }
    });
    return btn;
  };
  const choices = h('div', { class: 'share-choices', hidden: true, 'data-testid': 'share-choices' }, make('png', 'Image'), make('gif', 'GIF'));
  const open = h('button', { class: 'btn big', type: 'button', 'data-testid': 'share', 'aria-expanded': 'false' }, 'Share');
  open.addEventListener('click', () => {
    choices.hidden = !choices.hidden;
    open.setAttribute('aria-expanded', String(!choices.hidden));
  });
  return [open, h('div', { class: 'share-panel' }, choices, status)];
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
  const nickname = (await store.getPrefs()).nickname;

  /** Asked once: the name that goes on this device's leaderboard. */
  function nameForm(): HTMLElement {
    const input = h('input', { class: 'name-input', type: 'text', maxlength: '20', placeholder: 'Your name', autocomplete: 'nickname', 'aria-label': 'Your name for the leaderboard', 'data-testid': 'nickname' });
    const form = h('form', { class: 'name-form' }, input, h('button', { class: 'btn ink', type: 'submit' }, 'Save'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim().slice(0, 20);
      if (!name) return;
      await store.setPrefs({ nickname: name });
      await store.nameRuns(name);
      go(location.hash);
    });
    return form;
  }
  // Problems that took more than one try, or were skipped.
  const misses = run.log.filter((e) => !e.ok || e.misses);
  // Compared with your earlier runs of the same drill: sprints by count, 20 problems by time.
  const earlier = run.mode === 'training' ? [] : (await store.history()).filter((r) => r.id !== run.id && r.drillKey === run.drillKey && r.mode === run.mode);
  const avg = (f: (r: RunRecord) => number) => earlier.reduce((a, r) => a + f(r), 0) / earlier.length;
  const aboveAverage =
    earlier.length >= 2 && !saved.isBest && (run.mode === 'sprint' ? run.correct > avg((r) => r.correct) : run.totalMs < avg((r) => r.totalMs));
  const fresh = app.lastResult?.run.id === run.id ? (app.lastResult.trophies ?? []) : [];
  const trophies = TROPHIES.filter((t) => fresh.includes(t.id));

  const [shareButton, sharePanel] = shareResult(run, saved.isBest);
  const delta = run.ratingDelta ?? 0;
  // Small marks under the score: what was special about this run, if anything.
  const marks = [
    saved.isBest ? h('span', { class: 'mark best' }, 'Personal best') : null,
    aboveAverage ? h('span', { class: 'mark best' }, 'Above your average') : null,
    saved.rank && !saved.isBest ? h('span', { class: 'mark' }, `#${saved.rank} here`) : null,
    run.bestStreak && run.bestStreak >= 5 ? h('span', { class: 'mark' }, `${run.bestStreak} in a row`) : null,
  ].filter((m): m is HTMLElement => !!m);

  const main = reveal(
    h(
      'div',
      { class: 'results', 'data-testid': 'results' },
      h('h1', { class: 'display' }, run.drillName),
      h('p', { class: 'dim result-mode mono' }, modeLabel(run)),
      h(
        'div',
        { class: 'result-hero' },
        h(
          'div',
          { class: 'score' },
          h('div', { class: 'score-line' }, big, h('span', { class: 'score-suffix' }, score.suffix)),
          h('div', { class: 'score-caption' }, score.caption),
        ),
        run.rating !== undefined
          ? h(
              'div',
              { class: 'agility', 'data-testid': 'rating' },
              h('div', { class: 'agility-label' }, 'Mental math agility'),
              h('div', { class: 'agility-value mono' }, ratingLabel(run.rating), h('span', { class: delta >= 0 ? 'up' : 'down' }, ` ${deltaLabel(delta)}`)),
              h('div', { class: 'agility-title' }, title(run.rating).name),
            )
          : null,
      ),
      marks.length ? h('div', { class: 'marks' }, marks) : null,
      h('p', { class: 'result-facts mono' }, `${pct(run.accuracy)} first try · ${secs(run.avgMs)} each`),
      trophies.length
        ? h(
            'ul',
            { class: 'trophy-list fresh', 'data-testid': 'new-trophies' },
            trophies.map((t) => h('li', { class: 'trophy got' }, h('span', { class: 'trophy-icon', html: TROPHY_ICON }), h('span', null, h('b', null, t.name), h('span', { class: 'dim' }, t.how)))),
          )
        : null,
      h(
        'div',
        { class: 'result-actions' },
        spec ? h('a', { class: 'btn primary big', href: specToHash(spec), 'data-testid': 'again' }, 'Again', h('span', { class: 'arrow' }, '→')) : null,
        shareButton,
      ),
      sharePanel,
      board.length
        ? h(
            'section',
            null,
            h('h2', { class: 'section-head' }, 'Leaderboard'),
            nickname ? null : nameForm(),
            h(
              'table',
              { class: 'board', 'data-testid': 'leaderboard' },
              h(
                'tbody',
                null,
                board.map((r, i) =>
                  h(
                    'tr',
                    { class: r.id === run.id ? 'me' : '' },
                    h('td', { class: 'rank' }, String(i + 1)),
                    h('td', { class: 'who' }, r.player ?? '—'),
                    h('td', { class: 'num' }, r.mode === 'twenty' ? secs(r.totalMs) : String(r.correct)),
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
            h('h2', { class: 'section-head' }, 'Review'),
            h(
              'ul',
              { class: 'misses mono' },
              misses.slice(0, 12).map((m) =>
                h('li', null, h('span', null, `${m.text} = `, h('b', null, fmt(m.answer))), h('span', { class: 'dim' }, m.skipped ? 'skipped' : `first: ${m.input}`)),
              ),
            ),
          )
        : null,
    ),
  );

  return {
    el: layout({ active: 'stats', back: spec ? { href: backHref(spec), label: 'Back' } : { href: '#/stats', label: 'Stats' } }, main),
    title: 'Results',
    mounted: () => {
      countUp(big, score.value, score.places);
      if (fresh.length || saved.isBest) window.setTimeout(() => sound.best(), 500);
    },
  };
}
