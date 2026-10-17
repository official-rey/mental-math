import { h } from './dom';

/** Three reels of things worth doing in your head. Every answer here is exact. */
const REELS: [string, string][][] = [
  [
    ['85²', '7,225'],
    ['53²', '2,809'],
    ['65²', '4,225'],
    ['47²', '2,209'],
    ['45²', '2,025'],
  ],
  [
    ['97 × 94', '9,118'],
    ['47 × 11', '517'],
    ['43 × 48', '2,064'],
    ['103 × 108', '11,124'],
    ['98 × 96', '9,408'],
  ],
  [
    ['15% of 84', '12.6'],
    ['1,000 − 372', '628'],
    ['8% of 25', '2'],
    ['756 ÷ 4', '189'],
    ['20% of 65', '13'],
  ],
];

const SHOW_Q = 350;
const THINK = 900;
const SCRAMBLE = 520;
const HOLD = 2300;
const FADE = 350;
const STAGGER = 750;

/**
 * Looping demo: each cell shows a problem, "works it out" (the digits flicker and settle),
 * holds the answer, then moves on to the next problem. Static under reduced motion.
 */
export function featReel(): { el: HTMLElement; destroy(): void } {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers: number[] = [];
  const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));

  const cells = REELS.map((reel, c) => {
    const q = h('span', { class: 'feat-q' }, reel[0][0]);
    const a = h('span', { class: 'feat-a' }, reduced ? reel[0][1] : '');
    const el = h('div', { class: 'feat', role: 'listitem' }, q, a);
    if (!reduced) later(c * STAGGER, () => play(reel, 0, q, a));
    return el;
  });

  function scramble(a: HTMLElement, answer: string, done: () => void) {
    const start = performance.now();
    const tick = () => {
      if (performance.now() - start >= SCRAMBLE) {
        a.textContent = answer;
        done();
        return;
      }
      a.textContent = answer.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
      later(55, tick);
    };
    tick();
  }

  function play(reel: [string, string][], i: number, q: HTMLElement, a: HTMLElement) {
    const [problem, answer] = reel[i % reel.length];
    q.textContent = problem;
    a.textContent = '';
    q.classList.add('in');
    a.classList.remove('in', 'settled');
    later(SHOW_Q + THINK, () => {
      a.classList.add('in');
      scramble(a, answer, () => {
        a.classList.add('settled');
        later(HOLD, () => {
          q.classList.remove('in');
          a.classList.remove('in');
          later(FADE, () => play(reel, i + 1, q, a));
        });
      });
    });
  }

  const el = h('div', { class: `feats${reduced ? ' still' : ''}`, role: 'list', 'aria-label': 'Examples done in your head' }, cells);
  return {
    el,
    destroy: () => timers.forEach(clearTimeout),
  };
}
