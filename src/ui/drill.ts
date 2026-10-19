import { flashMs } from '../chain/flash';
import { DrillSession, TWENTY, type Attempt } from '../drill/engine';
import { sound } from '../drill/sound';
import { drillName, parseSpec, ROMAN } from '../drill/spec';
import type { DrillSpec } from '../drill/types';
import { store } from '../storage/store';
import { fmt } from '../techniques/util';
import { app } from './context';
import { h } from './dom';
import { ICONS } from './icons';
import { applyKey, keypad, type PadKey } from './keypad';
import { go, type View } from './router';
import { soundToggle } from './shell';
import { renderStepper, renderSteps } from './steps';
import { getTechnique } from '../techniques/registry';

export function backHref(spec: DrillSpec): string {
  if (spec.kind === 'chain') return '#/chain';
  if (spec.mode !== 'training') return '#/challenge';
  return spec.kind === 'technique' ? `#/t/${spec.ids[0]}` : '#/train';
}

const sizeClass = (text: string) => (text.length <= 9 ? 'xl' : text.length <= 15 ? 'lg' : text.length <= 24 ? 'md' : 'sm');

const secs = (ms: number) => (ms / 1000).toFixed(1);

function toolButton(icon: string, label: string, testid: string, onclick: () => void): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'tool', 'data-testid': testid }, h('span', { class: 'tool-icon', html: icon }), h('span', { class: 'tool-label' }, label));
  b.addEventListener('pointerdown', (e) => e.preventDefault());
  b.addEventListener('click', onclick);
  return b;
}

export async function drillView(_parts: string[], q: URLSearchParams): Promise<View> {
  const parsed = parseSpec(q);
  if (!parsed) {
    queueMicrotask(() => go('#/'));
    return { el: h('div') };
  }
  const spec: DrillSpec = parsed;
  const prefs = await store.setPrefs({ last: spec });
  const usePad = prefs.keypad === 'on' || (prefs.keypad === 'auto' && matchMedia('(pointer: coarse)').matches);
  const buzz = (ms: number) => {
    if (prefs.haptics) navigator.vibrate?.(ms);
  };

  const session = new DrillSession(spec);
  const timed = spec.mode !== 'training';
  let state: 'answering' | 'review' | 'paused' | 'done' = 'answering';
  let hints = 0;
  let timer = 0;
  let feedbackTimer = 0;
  let flashTimer = 0;
  /** True while a running-total chain is still showing its terms. */
  let flashing = false;

  // ----- Elements -----
  const levelTag = h('div', { class: 'level-tag', 'data-testid': 'level' });
  const bonus = h('span', { class: 'bonus mono', 'aria-live': 'polite' });
  const stat = h('div', { class: 'drill-stat mono', 'data-testid': 'stat' });
  const bar = h('i');
  const progress = h('div', { class: 'progress', 'aria-hidden': 'true' }, bar);
  const tag = h('div', { class: 'drill-tag' });
  const problem = h('div', { class: 'problem', 'data-testid': 'problem', role: 'status', 'aria-live': 'polite' });
  const hint = h('div', { class: 'problem-hint mono' });
  const hintSteps = h('div', { class: 'hint-steps', 'data-testid': 'hint-steps' });
  const input = h('input', {
    class: 'answer',
    type: 'text',
    inputmode: usePad ? 'none' : 'decimal',
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
  const resumeBtn = h('button', { class: 'btn ink', type: 'button', 'data-testid': 'resume', onclick: () => togglePause() }, 'Resume', h('span', { class: 'arrow' }, '→'));
  const pausedCover = h('div', { class: 'paused-cover', hidden: true }, h('h2', null, 'Paused'), h('p', { class: 'dim' }, 'The clock is stopped.'), resumeBtn);

  // Tools: hints and answers while training; pause and skip when timed.
  const tools: HTMLButtonElement[] = [];
  let pauseBtn: HTMLButtonElement | null = null;
  let hintBtn: HTMLButtonElement | null = null;
  if (timed) {
    pauseBtn = toolButton(ICONS.pause, 'Pause', 'pause', () => togglePause());
    tools.push(pauseBtn, toolButton(ICONS.skip, 'Skip', 'skip', () => skip()));
  } else {
    hintBtn = toolButton(ICONS.hint, 'Hint', 'hint', () => showHint());
    tools.push(toolButton(ICONS.info, 'How', 'how', () => openLesson()), hintBtn, toolButton(ICONS.eye, 'Show answer', 'reveal', () => skip()));
    if (spec.kind === 'chain' && spec.style !== 'expression') {
      tools.unshift(toolButton(ICONS.play, 'Replay', 'replay', () => !flashing && state === 'answering' && playSequence(session.current.sequence!)));
      hintBtn.hidden = true;
    }
  }
  const toolbar = h('div', { class: 'toolbar' }, tools);
  const dock = h('div', { class: `dock${usePad ? ' with-pad' : ''}` }, toolbar, usePad ? keypad(onKey) : null);

  const doneBtn = timed ? null : h('button', { class: 'iconbtn done', type: 'button', 'data-testid': 'done', onclick: () => end() }, 'Done');

  const el = h(
    'div',
    { class: `drill${usePad ? ' has-pad' : ''}` },
    h(
      'header',
      { class: 'drill-bar' },
      h('a', { class: 'iconbtn', href: backHref(spec), 'aria-label': 'Quit drill', html: ICONS.close }),
      h('div', { class: 'drill-title' }, drillName(spec)),
      h('div', { class: 'stat-wrap' }, stat, bonus),
      doneBtn,
      soundToggle(),
    ),
    progress,
    h('main', { class: 'drill-stage' }, levelTag, tag, problem, hint, hintSteps, form, feedback, solution, pausedCover),
    dock,
  );

  // ----- Rendering -----
  function paintStats() {
    const log = session.log;
    const ok = session.correct;
    if (spec.mode === 'sprint') {
      const left = session.remaining();
      stat.textContent = `${Math.ceil(left / 1000)}s · ✓${ok}`;
      bar.style.width = `${(100 * session.elapsed()) / session.timeLimit()}%`;
      if (left <= 0 && state !== 'done') end();
    } else if (spec.mode === 'twenty') {
      stat.textContent = `${Math.min(log.length + 1, TWENTY)}/${TWENTY} · ${secs(session.elapsed())}s`;
      bar.style.width = `${(100 * log.length) / TWENTY}%`;
    } else {
      stat.textContent = `✓${ok} ✗${log.length - ok}`;
    }
  }

  /** The current technique's lesson (example and picture) in a sheet over the problem. */
  function openLesson() {
    const t = getTechnique(session.current.technique);
    if (!t) return;
    const sheet = h(
      'div',
      { class: 'lesson-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.meta.name, 'data-testid': 'lesson-sheet' },
      h(
        'div',
        { class: 'sheet-inner' },
        h('div', { class: 'sheet-head' }, h('h2', null, t.meta.name), h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Close', html: ICONS.close, onclick: () => close() })),
        h('p', { class: 'tech-idea' }, t.meta.idea),
        renderStepper(t.steps(t.card.example)),
      ),
    );
    const close = () => {
      sheet.remove();
      input.focus();
    };
    sheet.addEventListener('click', (e) => e.target === sheet && close());
    el.append(sheet);
  }

  /** Running-total chains: show each term on its own, then ask for the total. The clock waits. */
  function playSequence(seq: string[]) {
    clearTimeout(flashTimer);
    flashing = true;
    input.readOnly = true;
    session.pause();
    const ms = flashMs(session.level);
    let i = 0;
    const show = () => {
      if (i < seq.length) {
        problem.textContent = seq[i];
        problem.className = 'problem xl flash-term';
        void problem.offsetWidth;
        problem.classList.add('enter');
        hint.textContent = `${i + 1} of ${seq.length}`;
        i++;
        flashTimer = window.setTimeout(show, ms);
        return;
      }
      problem.textContent = '= ?';
      problem.className = 'problem xl';
      hint.textContent = 'the running total';
      flashing = false;
      input.readOnly = false;
      session.resume();
      input.focus();
    };
    show();
  }

  function showProblem() {
    const p = session.current;
    if (p.sequence) {
      tag.textContent = '';
      input.value = '';
      input.classList.remove('is-wrong', 'is-ok');
      solution.hidden = true;
      solution.replaceChildren();
      dock.hidden = false;
      playSequence(p.sequence);
      return;
    }
    problem.textContent = p.text;
    problem.className = `problem ${sizeClass(p.text)}`;
    fitProblem();
    void problem.offsetWidth;
    problem.classList.add('enter');
    hint.textContent = p.hint ?? '';
    tag.textContent = session.sources.length > 1 ? session.sourceName(p) : '';
    hints = 0;
    hintSteps.replaceChildren();
    if (hintBtn) hintBtn.disabled = false;
    input.value = '';
    input.readOnly = false;
    input.classList.remove('is-wrong', 'is-ok');
    solution.hidden = true;
    solution.replaceChildren();
    dock.hidden = false;
    input.focus();
  }

  /** "Level I → III" while the drill is still climbing to the chosen level, then just the level. */
  function paintLevel() {
    const cur = session.level, target = spec.level;
    levelTag.textContent = cur < target ? `Level ${ROMAN[cur]} → ${ROMAN[target]}` : `Level ${ROMAN[cur]}`;
  }

  /** Brief "+2 s" beside the clock when a correct sprint answer adds time. */
  function showBonus(a: Attempt) {
    if (!a.bonusMs) return;
    bonus.textContent = `+${a.bonusMs / 1000} s`;
    bonus.classList.remove('pop');
    void bonus.offsetWidth;
    bonus.classList.add('pop');
  }

  /** Shrink the problem until it fits on one line, so expressions never break mid-way. */
  function fitProblem() {
    problem.style.fontSize = '';
    const max = problem.parentElement!.clientWidth;
    let size = parseFloat(getComputedStyle(problem).fontSize);
    while (problem.scrollWidth > max && size > 16) {
      size -= 2;
      problem.style.fontSize = `${size}px`;
    }
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

  /** Training: reveal one more line of the worked solution, never the final answer. */
  function showHint() {
    if (state !== 'answering') return;
    const steps = session.steps();
    const available = steps.slice(1, -1);
    if (hints >= available.length) return;
    hints++;
    hintSteps.replaceChildren(
      renderSteps([{ op: '', expr: steps[0].expr }, ...available.slice(0, hints).map((s) => ({ ...s, op: s.op ?? '=' }))], { markLast: false }),
    );
    if (hintBtn && hints >= available.length) hintBtn.disabled = true;
    input.focus();
  }

  function review(answer: string, problemText: string, steps: ReturnType<typeof session.steps>) {
    state = 'review';
    input.readOnly = true;
    feedback.textContent = '';
    hintSteps.replaceChildren();
    dock.hidden = true;
    solution.replaceChildren(
      h('div', { class: 'solution-head' }, h('span', { class: 'dim' }, 'Answer'), h('span', { class: 'mono solution-answer' }, fmt(answer))),
      renderSteps(steps),
      h('button', { class: 'btn ink block big', type: 'button', 'data-testid': 'next', onclick: () => next() }, 'Next', h('span', { class: 'arrow' }, '↵')),
    );
    solution.setAttribute('aria-label', `Worked solution for ${problemText}`);
    solution.hidden = false;
    input.focus();
  }

  function submit() {
    if (state === 'done' || state === 'paused' || flashing) return;
    if (state === 'review') return next();
    const raw = input.value.trim();
    if (!raw) return;
    const a = session.submit(raw);
    paintStats();
    if (a.ok) {
      sound.correct();
      flash(a.levelUp ? `✓ ${fmt(a.problem.answer)} · up to Level ${ROMAN[a.levelUp]}` : `✓ ${fmt(a.problem.answer)}`, 'ok');
      showBonus(a);
      paintLevel();
      input.classList.add('is-ok');
      return next();
    }
    sound.wrong();
    buzz(40);
    input.classList.remove('is-wrong');
    void input.offsetWidth;
    input.classList.add('is-wrong');
    if (timed) {
      flash(`${a.problem.text} = ${fmt(a.problem.answer)}`, 'bad');
      return next();
    }
    review(a.problem.answer, a.problem.text, session.steps(a.problem));
  }

  function skip() {
    if (state !== 'answering' || flashing) return;
    const a = session.skip();
    paintStats();
    if (timed) {
      flash(`${a.problem.text} = ${fmt(a.problem.answer)}`, 'bad');
      return next();
    }
    review(a.problem.answer, a.problem.text, session.steps(a.problem));
  }

  function togglePause() {
    if (!timed || state === 'done' || state === 'review' || flashing) return;
    if (state === 'paused') {
      session.resume();
      state = 'answering';
      el.classList.remove('is-paused');
      pausedCover.hidden = true;
      pauseBtn!.querySelector('.tool-icon')!.innerHTML = ICONS.pause;
      pauseBtn!.querySelector('.tool-label')!.textContent = 'Pause';
      input.focus();
    } else {
      session.pause();
      state = 'paused';
      el.classList.add('is-paused');
      pausedCover.hidden = false;
      pauseBtn!.querySelector('.tool-icon')!.innerHTML = ICONS.play;
      pauseBtn!.querySelector('.tool-label')!.textContent = 'Resume';
      resumeBtn.focus();
    }
    paintStats();
  }

  function onKey(k: PadKey) {
    if (state !== 'answering' || flashing) return;
    buzz(6);
    const v = applyKey(input.value, k);
    if (v === null) return submit();
    input.value = v;
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
    const nickname = (await store.getPrefs()).nickname;
    if (nickname) run.player = nickname;
    const saved = await store.saveRun(run);
    app.lastResult = { run, saved, spec };
    go('#/results');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      input.value = '';
    }
  });

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
      paintLevel();
      showProblem();
      paintStats();
      timer = window.setInterval(paintStats, 100);
      addEventListener('resize', fitProblem);
    },
    destroy() {
      removeEventListener('resize', fitProblem);
      clearInterval(timer);
      clearTimeout(feedbackTimer);
      clearTimeout(flashTimer);
      document.body.classList.remove('drilling');
      app.art?.resume();
    },
  };
}
