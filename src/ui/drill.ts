import { DrillSession, SPRINT_MS, TWENTY } from '../drill/engine';
import { sound } from '../drill/sound';
import { drillName, parseSpec, ROMAN } from '../drill/spec';
import type { DrillSpec } from '../drill/types';
import { store } from '../storage/store';
import { fmt } from '../techniques/util';
import { app } from './context';
import { h } from './dom';
import { ICONS } from './icons';
import { go, type View } from './router';
import { soundToggle } from './shell';
import { renderSteps } from './steps';

export function backHref(spec: DrillSpec): string {
  if (spec.kind === 'technique') return `#/t/${spec.ids[0]}`;
  return spec.kind === 'chain' ? '#/chain' : '#/mixed';
}

const sizeClass = (text: string) => (text.length <= 9 ? 'xl' : text.length <= 15 ? 'lg' : text.length <= 24 ? 'md' : 'sm');

const secs = (ms: number) => (ms / 1000).toFixed(1);

export async function drillView(_parts: string[], q: URLSearchParams): Promise<View> {
  const parsed = parseSpec(q);
  if (!parsed) {
    queueMicrotask(() => go('#/'));
    return { el: h('div') };
  }
  const spec: DrillSpec = parsed;
  await store.setPrefs({ last: spec });

  const session = new DrillSession(spec);
  const timed = spec.mode !== 'training';
  let state: 'answering' | 'review' | 'done' = 'answering';
  let timer = 0;
  let feedbackTimer = 0;

  // ----- Elements -----
  const stat = h('div', { class: 'drill-stat mono', 'data-testid': 'stat' });
  const bar = h('i');
  const progress = h('div', { class: 'progress', 'aria-hidden': 'true' }, bar);
  const tag = h('div', { class: 'drill-tag kicker' });
  const problem = h('div', { class: 'problem', 'data-testid': 'problem', role: 'status', 'aria-live': 'polite' });
  const hint = h('div', { class: 'problem-hint mono' });
  const input = h('input', {
    class: 'answer',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    'aria-label': 'Your answer',
    'data-testid': 'answer',
  });
  const form = h('form', { class: 'answer-form', novalidate: true }, input);
  const feedback = h('div', { class: 'feedback mono', 'aria-live': 'polite', 'data-testid': 'feedback' });
  const solution = h('div', { class: 'solution', hidden: true, 'data-testid': 'solution' });
  const doneBtn = timed
    ? null
    : h('button', { class: 'btn', type: 'button', 'data-testid': 'done', onclick: () => end() }, 'Done');

  const el = h(
    'div',
    { class: 'drill' },
    h(
      'header',
      { class: 'drill-bar' },
      h('a', { class: 'iconbtn', href: backHref(spec), 'aria-label': 'Quit drill', html: ICONS.close }),
      h('div', { class: 'drill-title kicker' }, `${drillName(spec)} · ${ROMAN[spec.level]}`),
      stat,
      soundToggle(),
    ),
    progress,
    h('main', { class: 'drill-stage' }, tag, problem, hint, form, feedback, solution, doneBtn),
  );

  // ----- Rendering -----
  function paintStats() {
    const log = session.log;
    const ok = session.correct;
    if (spec.mode === 'sprint') {
      const left = session.remaining();
      stat.textContent = `${Math.ceil(left / 1000)}s · ✓${ok}`;
      bar.style.width = `${(100 * (SPRINT_MS - left)) / SPRINT_MS}%`;
      if (left <= 0 && state !== 'done') end();
    } else if (spec.mode === 'twenty') {
      stat.textContent = `${Math.min(log.length + 1, TWENTY)}/${TWENTY} · ${secs(session.elapsed())}s`;
      bar.style.width = `${(100 * log.length) / TWENTY}%`;
    } else {
      stat.textContent = `✓${ok} ✗${log.length - ok}`;
    }
  }

  function showProblem() {
    const p = session.current;
    problem.textContent = p.text;
    problem.className = `problem ${sizeClass(p.text)}`;
    problem.classList.remove('enter');
    void problem.offsetWidth;
    problem.classList.add('enter');
    hint.textContent = p.hint ?? '';
    tag.textContent = session.sources.length > 1 ? session.sourceName(p) : '';
    input.value = '';
    input.readOnly = false;
    input.classList.remove('is-wrong', 'is-ok');
    solution.hidden = true;
    solution.replaceChildren();
    input.focus();
  }

  function flash(text: string, cls: 'ok' | 'bad') {
    clearTimeout(feedbackTimer);
    feedback.textContent = text;
    feedback.className = `feedback mono ${cls}`;
    void feedback.offsetWidth;
    feedback.classList.add('pulse');
    feedbackTimer = window.setTimeout(() => (feedback.textContent = ''), cls === 'ok' ? 900 : 2200);
  }

  function next() {
    if (session.isFinished()) return end();
    session.advance();
    state = 'answering';
    showProblem();
    paintStats();
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    if (state === 'done') return;
    if (state === 'review') return next();
    const raw = input.value.trim();
    if (!raw) return;
    const a = session.submit(raw);
    paintStats();
    if (a.ok) {
      sound.correct();
      flash(`✓ ${fmt(a.problem.answer)}`, 'ok');
      input.classList.add('is-ok');
      return next();
    }
    sound.wrong();
    input.classList.remove('is-wrong');
    void input.offsetWidth;
    input.classList.add('is-wrong');
    if (timed) {
      flash(`${a.problem.text} = ${fmt(a.problem.answer)}`, 'bad');
      return next();
    }
    // Training: show this exact problem worked through, then wait for Enter / Next.
    state = 'review';
    input.readOnly = true;
    feedback.textContent = '';
    solution.replaceChildren(
      h('div', { class: 'solution-head' }, h('span', { class: 'kicker' }, 'Answer'), h('span', { class: 'mono solution-answer' }, fmt(a.problem.answer))),
      renderSteps(session.steps(a.problem)),
      h('button', { class: 'btn ink block', type: 'button', 'data-testid': 'next', onclick: () => next() }, 'Next', h('span', { class: 'arrow' }, '↵')),
    );
    solution.hidden = false;
    input.focus();
  }

  async function end() {
    if (state === 'done') return;
    state = 'done';
    clearInterval(timer);
    session.finish();
    if (session.log.length === 0) return go(backHref(spec));
    sound.finish();
    const run = session.result();
    const saved = await store.saveRun(run);
    app.lastResult = { run, saved, spec };
    go('#/results');
  }

  form.addEventListener('submit', onSubmit);

  // Test hook for end-to-end runs: exposes the current answer only when ?e2e is in the URL.
  if (new URLSearchParams(location.search).has('e2e')) {
    (window as unknown as { __mm: unknown }).__mm = { answer: () => session.current?.answer, session };
  }

  return {
    el,
    title: drillName(spec),
    mounted() {
      app.art?.pause();
      document.body.classList.add('drilling');
      session.start();
      showProblem();
      paintStats();
      timer = window.setInterval(paintStats, 100);
    },
    destroy() {
      clearInterval(timer);
      clearTimeout(feedbackTimer);
      document.body.classList.remove('drilling');
      app.art?.resume();
    },
  };
}
