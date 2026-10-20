import { evaluate, print, type Node } from '../chain/evaluator';
import { CHAIN_LEVEL_IDS, CHAIN_LEVELS, CHAIN_MAX, chainExample, chainExampleNode, chainSteps } from '../chain/generator';
import { ROMAN } from '../techniques/types';
import { specToHash } from '../drill/spec';
import { MODES, type Mode } from '../drill/types';
import { store } from '../storage/store';
import { circle, line, svg, text } from '../techniques/svg';
import { segmented } from './controls';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';
import { problemStatement, renderStepper } from './steps';

const SYM: Record<string, string> = { '+': '+', '−': '−', '×': '×', '÷': '÷', '^': 'x²', mod: 'mod' };

/** The example's expression tree: each operator node is evaluated once its children are numbers. */
function treeSvg(root: Node): string {
  type Placed = { node: Node; x: number; y: number; kids: Placed[] };
  let col = 0;
  let depth = 0;
  const place = (n: Node, d: number): Placed => {
    depth = Math.max(depth, d);
    if (n.kind === 'num') return { node: n, x: col++, y: d, kids: [] };
    if (n.kind === 'neg') {
      const k = place(n.arg, d + 1);
      return { node: n, x: k.x, y: d, kids: [k] };
    }
    // Squares draw as a single child.
    const kids = n.op === '^' ? [place(n.left, d + 1)] : [place(n.left, d + 1), place(n.right, d + 1)];
    return { node: n, x: kids.reduce((a, k) => a + k.x, 0) / kids.length, y: d, kids };
  };
  const tree = place(root, 0);
  const W = 340, H = 40 + depth * 46 + 24;
  const sx = (x: number) => 24 + (x / Math.max(1, col - 1)) * (W - 48);
  const sy = (y: number) => 22 + y * 46;
  let edges = '', nodes = '';
  const walk = (p: Placed) => {
    for (const k of p.kids) {
      edges += line(sx(p.x), sy(p.y), sx(k.x), sy(k.y), 's-rule');
      walk(k);
    }
    const n = p.node;
    if (n.kind === 'num') {
      nodes += text(sx(p.x), sy(p.y), n.value, 't');
    } else {
      const label = n.kind === 'neg' ? '−' : SYM[n.op];
      nodes += circle(sx(p.x), sy(p.y), 13, 'f-paper s-ink');
      nodes += text(sx(p.x), sy(p.y), label, n.kind === 'bin' && n.op === '^' ? 't t-sm' : 't');
      nodes += text(sx(p.x) + 17, sy(p.y) - 13, evaluate(n), 't t-sm t-accent t-start');
    }
  };
  walk(tree);
  return svg(W, H, edges + nodes, `Expression tree for ${print(root)}; each operator shows its value in accent`);
}

/** Chains: a whole expression with brackets, solved in the right order as fast as you can. */
export async function chainView(): Promise<View> {
  const prefs = await store.getPrefs();
  const best = prefs.chainBest;
  let mode: Mode = prefs.mode;

  const btn = h('a', { class: 'btn primary big block', 'data-testid': 'start-chain' }, 'Start', h('span', { class: 'arrow' }, '→'));
  // Every run starts at Level I and climbs; levels reached before go by faster.
  const setHref = () => btn.setAttribute('href', specToHash({ kind: 'chain', ids: [], level: CHAIN_MAX, mode, known: best }));
  setHref();

  /** The ten levels as a ladder: reached ones filled, the next one named. */
  const ladder = h(
    'div',
    { class: 'ladder', 'data-testid': 'chain-ladder' },
    h(
      'div',
      { class: 'ladder-head' },
      h('span', { class: 'control-label' }, 'Highest level'),
      h('span', { class: 'ladder-level mono' }, `${ROMAN[best]} `, h('span', { class: 'dim' }, `of ${ROMAN[CHAIN_MAX]}`)),
    ),
    h(
      'ol',
      { class: 'ladder-steps', 'aria-label': `Level ${best} of ${CHAIN_MAX} reached` },
      CHAIN_LEVEL_IDS.map((l) => h('li', { class: l <= best ? 'got' : '', title: `${ROMAN[l]}: ${CHAIN_LEVELS[l].label}` }, ROMAN[l])),
    ),
    best < CHAIN_MAX ? h('p', { class: 'ladder-next dim' }, `Next: ${CHAIN_LEVELS[best + 1].label}`) : null,
  );

  const figure = h('figure', { class: 'figure' });
  figure.innerHTML = treeSvg(chainExampleNode());
  figure.prepend(h('div', { class: 'figure-problem' }, problemStatement(chainExample().text)));

  const modes = segmented<Mode>('Clock', MODES.map((m) => ({ value: m.id, label: m.id === 'training' ? 'No clock' : m.short })), mode, (m) => {
    mode = m;
    store.setPrefs({ mode: m });
    setHref();
  });

  const main = reveal(
    h(
      'article',
      { class: 'card' },
      h('h1', { class: 'display' }, 'Chains'),
      h('p', { class: 'chain-rule mono' }, h('b', null, '( )'), ' first, then ', h('b', null, '× ÷'), ', then ', h('b', null, '+ −'), ', left to right'),
      h('div', { class: 'chain-example' }, renderStepper(chainSteps(chainExample())), figure),
      ladder,
      h('div', { class: 'controls' }, h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Clock'), modes)),
      btn,
    ),
  );

  return { el: layout({ active: 'chains' }, main), title: 'Chains' };
}
