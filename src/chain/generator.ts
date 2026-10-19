import type { ProblemSource } from '../drill/types';
import type { Level, Problem, Rng, Step } from '../techniques/types';
import { bin, evaluate, num, print, sq, traceSteps, type BinOp, type Node } from './evaluator';

/**
 * Chains: one whole expression, shown at once, with brackets, to be solved in the right order
 * (brackets, then × and ÷, then + and −) as fast as possible. Operands stay small; the work is
 * in the order of operations. Every intermediate is a whole number from 0 to the level's cap,
 * and every division comes out exact.
 */
export const CHAIN_LEVELS: Record<
  Level,
  { label: string; ops: [number, number]; leaf: number; cap: number; groups: number; nested?: boolean; squares?: boolean }
> = {
  1: { label: '2 operations · single digits', ops: [2, 2], leaf: 9, cap: 60, groups: 0 },
  2: { label: '3 operations · one pair of brackets', ops: [3, 3], leaf: 9, cap: 100, groups: 1 },
  3: { label: '3–4 operations · numbers to 12', ops: [3, 4], leaf: 12, cap: 150, groups: 1 },
  4: { label: '4–5 operations · with squares', ops: [4, 5], leaf: 15, cap: 300, groups: 1, squares: true },
  5: { label: '5–6 operations · two pairs of brackets', ops: [5, 6], leaf: 20, cap: 600, groups: 2, squares: true },
  6: { label: '6–7 operations · brackets inside brackets', ops: [6, 7], leaf: 25, cap: 1000, groups: 2, nested: true, squares: true },
};

/** Largest operand at any level. */
export const MAX_OPERAND = 25;

interface Part {
  node: Node;
  value: number;
}

const OPS: BinOp[] = ['+', '−', '×', '÷', '+', '−', '×', '÷', '×'];

const isSum = (p: Part) => p.node.kind === 'bin' && (p.node.op === '+' || p.node.op === '−');

/** A random expression with exactly `n` operations, or null when the numbers do not work out. */
function grow(rng: Rng, n: number, lv: (typeof CHAIN_LEVELS)[Level]): Part | null {
  if (n === 0) {
    const v = rng.int(2, lv.leaf);
    return { node: num(v), value: v };
  }
  // The square of a number or a bracket that comes to at most 15.
  if (lv.squares && rng.chance(0.15)) {
    const inner = grow(rng, n - 1, lv);
    if (!inner || inner.value < 2 || inner.value > 15) return null;
    return { node: sq(inner.node), value: inner.value ** 2 };
  }
  const left = rng.int(0, n - 1);
  const right = n - 1 - left;
  const op = rng.pick(OPS);
  let a = grow(rng, left, lv);
  if (!a) return null;
  // No step comes to 0 or 1: nothing like 7 − 6 or 8 ÷ 8 that wastes a move.
  if (op === '÷') {
    // The divisor is a small number or a small bracket that divides exactly.
    for (let i = 0; i < 12; i++) {
      const b = grow(rng, right, lv);
      if (b && b.value <= 12 && a.value % b.value === 0 && a.value >= 2 * b.value) return { node: bin('÷', a.node, b.node), value: a.value / b.value };
    }
    return null;
  }
  let b = grow(rng, right, lv);
  if (!b) return null;
  if (op === '×') {
    if (Math.min(a.value, b.value) > 12) return null;
    return { node: bin('×', a.node, b.node), value: a.value * b.value };
  }
  if (op === '−') {
    if (Math.abs(a.value - b.value) < 2) return null;
    return a.value > b.value ? { node: bin('−', a.node, b.node), value: a.value - b.value } : { node: bin('−', b.node, a.node), value: b.value - a.value };
  }
  // Keep a sum on the left of a +, so no brackets appear that change nothing: (a − b) + c, not c + (a − b).
  if (isSum(b)) {
    if (isSum(a)) return null;
    [a, b] = [b, a];
  }
  return { node: bin('+', a.node, b.node), value: a.value + b.value };
}

/** Operations in a tree (a square counts as one). */
function countOps(n: Node): number {
  if (n.kind === 'num') return 0;
  if (n.kind === 'neg') return 1 + countOps(n.arg);
  return 1 + countOps(n.left) + (n.op === '^' ? 0 : countOps(n.right));
}

/** Pairs of brackets in the printed text, and how deep they nest. */
function brackets(text: string): { pairs: number; depth: number } {
  let depth = 0, max = 0, pairs = 0;
  for (const c of text) {
    if (c === '(') {
      pairs++;
      max = Math.max(max, ++depth);
    } else if (c === ')') depth--;
  }
  return { pairs, depth: max };
}

export interface Chain {
  node: Node;
  text: string;
  value: number;
  ops: number;
  maxIntermediate: number;
}

/** Strict evaluation: integer intermediates, exact division, 0 ≤ value ≤ cap. Returns null if any fails. */
export function audit(node: Node, cap: number): { value: number; max: number } | null {
  let max = 0, ok = true;
  try {
    const value = evaluate(node, {
      strict: true,
      onStep: (v) => {
        if (v < 0 || v > cap) ok = false;
        max = Math.max(max, v);
      },
    });
    return ok ? { value, max } : null;
  } catch {
    return null;
  }
}

export function generateChain(rng: Rng, level: Level): Chain {
  const lv = CHAIN_LEVELS[level];
  for (;;) {
    const part = grow(rng, rng.int(lv.ops[0], lv.ops[1]), lv);
    if (!part || part.value < 3) continue;
    const ops = countOps(part.node);
    if (ops < lv.ops[0] || ops > lv.ops[1]) continue;
    const text = print(part.node);
    // The order of operations must matter: both kinds of operation, and the level's brackets.
    if (!/[+−]/.test(text) || !/[×÷²]/.test(text)) continue;
    const { pairs, depth } = brackets(text);
    if (pairs < lv.groups || (lv.nested && depth < 2)) continue;
    const checked = audit(part.node, lv.cap);
    if (!checked) continue;
    return { node: part.node, text, value: checked.value, ops, maxIntermediate: checked.max };
  }
}

const nodes = new WeakMap<Problem, Node>();

function toProblem(c: Chain, level: Level): Problem {
  const p: Problem = {
    technique: 'chain',
    level,
    text: c.text,
    answer: String(c.value),
    data: { ops: c.ops, max: c.maxIntermediate },
  };
  nodes.set(p, c.node);
  return p;
}

export function chainSteps(p: Problem): Step[] {
  const node = nodes.get(p);
  if (!node) return [{ op: '', expr: p.text }, { expr: p.answer }];
  // One line per step: the whole expression, one operation done each time.
  return [{ op: '', expr: p.text, inline: true }, ...traceSteps(node).map((s) => ({ expr: s.expr, note: s.did, inline: true }))];
}

export const chainSource: ProblemSource = {
  id: 'chain',
  name: 'Chains',
  generate: (rng, level) => toProblem(generateChain(rng, level), level),
  steps: chainSteps,
};

/** Fixed example for the Chains page: (8 + 4) × 3 − 18 ÷ (2 + 4). */
export const chainExampleNode = (): Node =>
  bin('−', bin('×', bin('+', num(8), num(4)), num(3)), bin('÷', num(18), bin('+', num(2), num(4))));

export function chainExample(): Problem {
  const node = chainExampleNode();
  const a = audit(node, 1000)!;
  return toProblem({ node, text: print(node), value: a.value, ops: countOps(node), maxIntermediate: a.max }, 2);
}
