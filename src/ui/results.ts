import { sound } from '../drill/sound';
import { specToHash } from '../drill/spec';
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
function scoreParts(run: RunRecord): { value: number; suffix: string; caption: string } {
  const s = scoreText(run);
  return { value: Number(s.main), suffix: s.suffix, caption: s.caption };
}

function countUp(el: HTMLElement, to: number) {
  const places = Number.isInteger(to) ? 0 : 1;
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
 * One "Share result" button; it then offers the format. The picture is shared as a file
 * through the phone's share sheet, or saved to the device where there is none. No links.
 */
function shareResult(run: RunRecord, best: boolean): HTMLElement {
  const status = h('div', { class: 'share-status', 'aria-live': 'polite', 'data-testid': 'share-status' });
  const make = (kind: 'png' | 'gif', label: string) => {
    const btn = h('button', { class: 'btn', type: 'button', 'data-testid': `share-${kind}` }, label);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      status.textContent = 'Drawing…';
      try {
        const [share, blob] = await Promise.all([
          import('../share/share'),
          kind === 'png' ? import('../share/scorecard').then((m) => m.renderScoreCard(run, { best })) : import('../share/gif').then((m) => m.renderHighlightGif(run)),
        ]);
        const how = await share.shareFile(blob, share.fileName(run, kind));
        status.textContent = how === 'shared' ? 'Shared.' : how === 'saved' ? `Saved ${kind === 'png' ? 'image' : 'GIF'} (${Math.max(1, Math.round(blob.size / 1024))} KB).` : '';
      } catch {
        status.textContent = 'Could not create the image.';
      } finally {
        btn.disabled = false;
      }
    });
    return btn;
  };
  const choices = h('div', { class: 'share-choices', hidden: true, 'data-testid': 'share-choices' }, make('png', 'Image'), make('gif', 'GIF'));
  const open = h('button', { class: 'btn block', type: 'button', 'data-testid': 'share', 'aria-expanded': 'false' }, 'Share result');
  open.addEventListener('click', () => {
    choices.hidden = !choices.hidden;
    open.setAttribute('aria-expanded', String(!choices.hidden));
  });
  return h('div', { class: 'share-row' }, open, choices, status);
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

  const main = reveal(
    h(
      'div',
      { class: 'results', 'data-testid': 'results' },
      h('h1', { class: 'display' }, run.drillName),
      h('p', { class: 'dim result-mode' }, modeLabel(run)),
      h(
        'div',
        { class: 'score' },
        h('div', { class: 'score-line' }, big, h('span', { class: 'score-suffix' }, score.suffix)),
        h('div', { class: 'score-caption' }, score.caption),
        h(
          'div',
          { class: 'score-badges' },
          saved.isBest ? h('span', { class: 'badge solid' }, 'Personal best') : null,
          aboveAverage ? h('span', { class: 'badge solid' }, 'Above your average') : null,
          saved.rank ? h('span', { class: 'badge' }, `#${saved.rank} on this device`) : null,
          run.bestStreak && run.bestStreak >= 5 ? h('span', { class: 'badge' }, `${run.bestStreak} in a row`) : null,
        ),
      ),
      trophies.length
        ? h(
            'ul',
            { class: 'trophy-list fresh', 'data-testid': 'new-trophies' },
            trophies.map((t) => h('li', { class: 'trophy got' }, h('span', { class: 'trophy-icon', html: TROPHY_ICON }), h('span', null, h('b', null, t.name), h('span', { class: 'dim' }, t.how)))),
          )
        : null,
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
        shareResult(run, saved.isBest),
      ),
      board.length
        ? h(
            'section',
            null,
            h('h2', { class: 'section-head' }, 'Leaderboard'),
            nickname ? null : nameForm(),
            h(
              'table',
              { class: 'board', 'data-testid': 'leaderboard' },
              h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Name'), h('th', null, 'Score'), h('th', null, 'Acc.'), h('th', null, 'Avg'))),
              h(
                'tbody',
                null,
                board.map((r, i) =>
                  h(
                    'tr',
                    { class: r.id === run.id ? 'me' : '' },
                    h('td', null, String(i + 1)),
                    h('td', { class: 'who' }, r.player ?? '—'),
                    h('td', null, r.mode === 'twenty' ? `${r.correct}/20 · ${secs(r.totalMs)}` : String(r.correct)),
                    h('td', null, pct(r.accuracy)),
                    h('td', null, secs(r.avgMs)),
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
            h('h2', { class: 'section-head' }, 'To look at again'),
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
      countUp(big, score.value);
      if (fresh.length || saved.isBest) window.setTimeout(() => sound.best(), 500);
    },
  };
}
