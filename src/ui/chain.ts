import { evaluate, print, type Node } from '../chain/evaluator';
import { CHAIN_LEVELS, chainExample, chainExampleNode, chainSteps } from '../chain/generator';
import { specToHash } from '../drill/spec';
import { store } from '../storage/store';
import { circle, line, svg, text } from '../techniques/svg';
import { drillControls } from './controls';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';
import { renderSteps } from './steps';

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

export async function chainView(): Promise<View> {
  const prefs = await store.getPrefs();
  const state = { level: prefs.level, mode: prefs.mode };
  const example = chainExample();

  const btn = h('a', { class: 'btn primary big block', 'data-testid': 'start-chain' }, 'Start chain drill', h('span', { class: 'arrow' }, '→'));
  const setHref = () => btn.setAttribute('href', specToHash({ kind: 'chain', ids: [], level: state.level, mode: state.mode }));
  setHref();

  const figure = h('figure', { class: 'figure' });
  figure.innerHTML = treeSvg(chainExampleNode());
  figure.append(h('figcaption', null, 'Read the tree bottom-up: an operator is ready once both of its inputs are numbers.'));

  const main = reveal(
    h(
      'article',
      { class: 'card' },
      h('div', { class: 'kicker' }, 'Drill mode'),
      h('h1', { class: 'display' }, 'Chain drills'),
      h('p', { class: 'lede' }, 'One expression, several operations, one answer typed at the end.'),
      h('p', { class: 'prose' }, 'Parentheses first, then squares, then × and ÷, then + and −, each left to right.'),
      h('p', { class: 'prose' }, 'Every intermediate result is a whole number and every division comes out exact.'),
      h('div', { class: 'kicker example-label' }, 'Example'),
      renderSteps(chainSteps(example)),
      figure,
      drillControls(
        state,
        (v) => {
          Object.assign(state, v);
          store.setPrefs(v);
          setHref();
        },
        { 1: { label: CHAIN_LEVELS[1].label }, 2: { label: CHAIN_LEVELS[2].label }, 3: { label: CHAIN_LEVELS[3].label } },
      ),
      btn,
    ),
  );

  return { el: layout({ active: 'train', back: { href: '#/', label: 'Train' } }, main), title: 'Chain drills' };
}
