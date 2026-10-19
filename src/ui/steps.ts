import type { Step } from '../techniques/types';
import { h } from './dom';

interface Line {
  op: string;
  term: string;
  /** Draw a rule above this line (a result, like the bar under a column sum). */
  rule?: boolean;
}

const SPLIT_ADD = [' + ', ' − '];
const SPLIT_MUL = [' × ', ' ÷ '];

/** Split `expr` at operators outside parentheses. Returns null when there is nothing to split. */
function splitTop(expr: string, ops: string[]): Line[] | null {
  const out: Line[] = [];
  let depth = 0, start = 0, op = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0) {
      const hit = ops.find((o) => expr.startsWith(o, i));
      if (hit) {
        out.push({ op, term: expr.slice(start, i) });
        op = hit.trim();
        start = i + hit.length;
        i += hit.length - 1;
      }
    }
  }
  if (!out.length) return null;
  out.push({ op, term: expr.slice(start) });
  return out;
}

/**
 * Write an expression the way it is done on paper: one term per line, operator on the left,
 * numbers right-aligned. "a + b = c" becomes a, + b, a rule, then c. Expressions with words
 * or special notation stay on one line.
 */
export function stack(expr: string): Line[] {
  if (/[a-zA-Z|%→…]|,\s/.test(expr)) return [{ op: '', term: expr }];
  const eq = expr.split(' = ');
  if (eq.length === 2) return [...stack(eq[0]), { op: '', term: eq[1], rule: true }];
  return splitTop(expr, SPLIT_ADD) ?? splitTop(expr, SPLIT_MUL) ?? [{ op: '', term: expr }];
}

function block(s: Step, i: number, last: boolean): HTMLElement {
  const lines = stack(s.expr);
  const op = s.op ?? (i === 0 ? '' : '=');
  // Each new "=" step continues the column under a rule; side workings (→, ≈) show their mark.
  const ruled = i > 0 && op === '=';
  const cells: HTMLElement[] = [];
  lines.forEach((l, r) => {
    const rule = (ruled && r === 0) || l.rule;
    const gutter = r === 0 && op !== '=' ? op : l.op;
    cells.push(
      h('span', { class: `op${rule ? ' ruled' : ''}`, style: { gridRow: String(r + 1) }, 'aria-hidden': gutter ? null : 'true' }, gutter),
      h('span', { class: `ex${rule ? ' rule' : ''}`, style: { gridRow: String(r + 1) } }, l.term),
    );
  });
  return h(
    'div',
    { class: `step${last ? ' last' : ''}${op === '→' ? ' side' : ''}`, role: 'listitem', 'data-i': String(i), 'aria-label': `${op} ${s.expr}`.trim() },
    cells,
    h('span', { class: 'nt', style: { gridRow: `1 / span ${lines.length}` } }, s.note ?? ''),
  );
}

/**
 * When the step before the answer already ends in "= answer", the bare answer line would only
 * repeat it: fold it away and let that step close the column (keeping both notes).
 */
export function fold(steps: Step[]): Step[] {
  if (steps.length < 3) return steps;
  const last = steps[steps.length - 1], prev = steps[steps.length - 2];
  if ((last.op ?? '=') !== '=' || !prev.expr.endsWith(` = ${last.expr}`)) return steps;
  const note = [prev.note, last.note].filter((n) => n && n !== 'answer').join('; ');
  return [...steps.slice(0, -2), { ...prev, note: note || undefined }];
}

function blocks(steps: Step[], markLast: boolean): HTMLElement[] {
  const shown = fold(steps);
  return shown.map((s, i) => block(s, i, markLast && i === shown.length - 1));
}

/** "47 × 11" → "47 × 11 = ?"; statements that are already a question stay as they are. */
export function problemStatement(expr: string): string {
  // Word problems ("Double at 6% a year") and questions read fine as they are.
  return /\?|^[A-Z]/.test(expr) ? expr : `${expr} = ?`;
}

/** Worked solution in column form: the math stacked and right-aligned, each step's note beside it. */
export function renderSteps(steps: Step[], opts: { markLast?: boolean } = {}): HTMLElement {
  return h('div', { class: 'steps', role: 'list' }, blocks(steps, opts.markLast ?? true));
}

/**
 * The same layout revealed one step at a time. The current step is highlighted with its note
 * beside it; later steps are not shown yet.
 */
export function renderStepper(input: Step[]): HTMLElement {
  const steps = fold(input);
  const lines = blocks(steps, true);
  const list = h('div', { class: 'steps stepper-lines', role: 'list' }, lines);
  const counter = h('span', { class: 'stepper-count mono', 'aria-live': 'polite' });
  const back = h('button', { type: 'button', class: 'tool', 'aria-label': 'Previous step' }, '‹ Back');
  const next = h('button', { type: 'button', class: 'tool primary', 'data-testid': 'next-step' }, 'Next step ›');
  const all = h('button', { type: 'button', class: 'tool', 'data-testid': 'all-steps' }, 'Show all');
  const last = steps.length - 1;
  let cur = Math.min(1, last);

  function paint() {
    lines.forEach((el, i) => {
      el.classList.toggle('future', i > cur);
      el.classList.toggle('current', i === cur);
    });
    counter.textContent = `${cur} / ${last}`;
    back.disabled = cur <= 1;
    next.disabled = cur >= last;
    all.textContent = cur >= last ? 'Replay' : 'Show all';
  }

  back.addEventListener('click', () => {
    cur = Math.max(1, cur - 1);
    paint();
  });
  next.addEventListener('click', () => {
    cur = Math.min(last, cur + 1);
    paint();
  });
  all.addEventListener('click', () => {
    cur = cur >= last ? Math.min(1, last) : last;
    paint();
  });

  // The problem stays in view above the steps, so you never have to look back for it.
  lines[0]?.classList.add('problem-line');
  const statement = h('div', { class: 'stepper-problem' }, h('span', { class: 'label' }, 'Example'), h('span', { class: 'expr' }, problemStatement(steps[0]?.expr ?? '')));
  const el = h(
    'div',
    { class: 'stepper', tabindex: '0', 'aria-label': 'Worked example, step by step' },
    statement,
    list,
    h('div', { class: 'stepper-nav' }, back, counter, next, all),
  );
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next.click();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') back.click();
    else return;
    e.preventDefault();
  });
  paint();
  return el;
}
