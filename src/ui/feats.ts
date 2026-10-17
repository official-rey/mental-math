import { getTechnique } from '../techniques/registry';
import { h } from './dom';
import { fold, renderSteps } from './steps';

/** Techniques whose card examples make the best short demos, in playing order. */
const DEMO = ['times-11', 'square-5', 'nikhilam', 'square-near-50', 'close-together', 'complements', 'percentages', 'crosswise', 'halving'];

const FIRST = 700;
const STEP = 1250;
const HOLD = 2800;
const FADE = 450;

/**
 * Looping demo of the real procedures: each technique's worked example plays one step at a
 * time, in column form, until the answer lands; then the next technique starts.
 */
export function processReel(): { el: HTMLElement; destroy(): void } {
  const items = DEMO.map((id) => getTechnique(id)).filter((t) => !!t);
  const name = h('div', { class: 'demo-name' });
  const stage = h('div', { class: 'demo-stage' });
  const el = h('div', { class: 'demo', 'aria-label': 'A technique worked step by step', 'data-testid': 'demo' }, name, stage);
  const timers: number[] = [];
  const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));

  function play(i: number) {
    const t = items[i % items.length]!;
    const steps = renderSteps(fold(t.steps(t.card.example)));
    const lines = Array.from(steps.querySelectorAll<HTMLElement>('.step'));
    lines.forEach((l, k) => l.classList.toggle('pending', k > 0));
    name.textContent = t.meta.name;
    stage.replaceChildren(steps);
    el.classList.remove('out');
    let k = 1;
    const reveal = () => {
      if (k >= lines.length) {
        later(HOLD, () => {
          el.classList.add('out');
          later(FADE, () => play(i + 1));
        });
        return;
      }
      lines[k - 1].classList.remove('current');
      lines[k].classList.remove('pending');
      lines[k].classList.add('current');
      k++;
      later(STEP, reveal);
    };
    later(FIRST, reveal);
  }

  play(0);
  return { el, destroy: () => timers.forEach(clearTimeout) };
}
