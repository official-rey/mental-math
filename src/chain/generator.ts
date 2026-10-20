import type { ProblemSource } from '../drill/types';
import type { Problem, Rng, Step } from '../techniques/types';
import { gcd } from '../techniques/util';
import { bin, evaluate, num, print, sq, traceSteps, type BinOp, type Node } from './evaluator';

/**
 * Chains: one whole expression with brackets, solved in the right order (brackets, then
 * × and ÷, then + and −) as fast as possible.
 *
 * The ten levels grow mainly in the size of the numbers: ones, then round tens, then any two
 * digits, round hundreds, three digits. Spotting the size of each part (ones, tens, hundreds)
 * is half the skill. Higher levels add a few factors worth knowing by heart (11, 12, 15, 25
 * and squares), and only the last level nests brackets. Every intermediate is a whole number
 * from 0 to the level's cap, every division is exact, and no step comes to 0 or 1.
 */

/** Numbers of one size: from lo to hi in steps of `step` (10 gives round tens). */
type Tier = readonly [lo: number, hi: number, step: number];

const ONES: Tier = [2, 9, 1];
const TENS: Tier = [10, 90, 10];
const TWO: Tier = [11, 99, 1];
const HUNDREDS: Tier = [100, 900, 100];
const ROUND3: Tier = [110, 990, 10];
const THREE: Tier = [101, 999, 1];
const TEENS: Tier = [11, 19, 1];
/** Factors worth knowing by heart: × 11, × 12, × 15, × 25. */
const KEY = [11, 12, 15, 25] as const;

export interface ChainLevel {
  label: string;
  /** Operations in an expression, inclusive. */
  ops: readonly [number, number];
  /** Sizes of the numbers being added, taken away and divided. */
  terms: readonly Tier[];
  /** Sizes of multipliers and divisors. */
  factors: readonly Tier[];
  /** Also use the key factors 11, 12, 15, 25. */
  key?: boolean;
  /** Squares of numbers up to this. */
  squares?: number;
  /** Operations allowed. */
  allowed: readonly BinOp[];
  /** Largest value any step may reach. */
  cap: number;
  /** At least this many pairs of brackets. */
  groups: number;
  nested?: boolean;
  /** At least one number this big, so each level really uses its size. */
  big: number;
}

const ALL: BinOp[] = ['+', '−', '×', '÷'];

export const CHAIN_LEVELS: Record<number, ChainLevel> = {
  1: { label: 'ones · + − ×', ops: [2, 2], terms: [ONES], factors: [ONES], allowed: ['+', '−', '×'], cap: 90, groups: 0, big: 2 },
  2: { label: 'ones · all four', ops: [2, 3], terms: [ONES], factors: [ONES], allowed: ALL, cap: 90, groups: 0, big: 2 },
  3: { label: 'ones · brackets', ops: [3, 3], terms: [ONES], factors: [ONES], allowed: ALL, cap: 100, groups: 1, big: 2 },
  4: { label: 'round tens', ops: [3, 3], terms: [TENS, ONES], factors: [ONES], allowed: ALL, cap: 900, groups: 1, big: 10 },
  5: { label: 'tens and ones', ops: [3, 3], terms: [TWO], factors: [ONES], allowed: ALL, cap: 999, groups: 1, big: 11 },
  6: { label: 'round hundreds', ops: [3, 4], terms: [HUNDREDS, TENS], factors: [ONES], allowed: ALL, cap: 9000, groups: 1, big: 100 },
  7: { label: 'teens and squares', ops: [3, 4], terms: [TWO], factors: [ONES, TEENS], squares: 15, allowed: ALL, cap: 3000, groups: 1, big: 11 },
  8: { label: 'three digits', ops: [4, 4], terms: [THREE, ROUND3], factors: [ONES], allowed: ALL, cap: 9999, groups: 1, big: 101 },
  9: { label: '× 11, 12, 15, 25', ops: [4, 4], terms: [TWO, ROUND3], factors: [ONES], key: true, squares: 25, allowed: ALL, cap: 20000, groups: 2, big: 11 },
  10: { label: 'everything · nested brackets', ops: [5, 5], terms: [THREE, TWO], factors: [ONES, TEENS], key: true, squares: 25, allowed: ALL, cap: 50000, groups: 2, nested: true, big: 101 },
};

export const CHAIN_MAX = 10;
export const CHAIN_LEVEL_IDS = Array.from({ length: CHAIN_MAX }, (_, i) => i + 1);

/** Largest number written in any chain. */
export const MAX_OPERAND = 999;

interface Part {
  node: Node;
  value: number;
}

const isSum = (p: Part) => p.node.kind === 'bin' && (p.node.op === '+' || p.node.op === '−');
const leaf = (v: number): Part => ({ node: num(v), value: v });

function fromTier(rng: Rng, [lo, hi, step]: Tier): number {
  return step * rng.int(Math.ceil(lo / step), Math.floor(hi / step));
}

/** A number of one of the level's term sizes that `d` divides, or null if none fits. */
function multipleOf(rng: Rng, d: number, lv: ChainLevel): number | null {
  const [lo, hi, step] = rng.pick(lv.terms);
  const m = (d * step) / gcd(d, step);
  const k0 = Math.max(2, Math.ceil(lo / m)), k1 = Math.floor(hi / m);
  return k0 > k1 ? null : m * rng.int(k0, k1);
}

function factorLeaf(rng: Rng, lv: ChainLevel): number {
  if (lv.key && rng.chance(0.35)) return rng.pick(KEY);
  return fromTier(rng, rng.pick(lv.factors));
}

const factorMax = (lv: ChainLevel) => Math.max(lv.key ? 25 : 0, ...lv.factors.map((t) => t[1]));

/** A random expression with exactly `n` operations; `factor` asks for a small multiplier or divisor. */
function grow(rng: Rng, n: number, lv: ChainLevel, factor = false): Part | null {
  if (n === 0) return leaf(factor ? factorLeaf(rng, lv) : fromTier(rng, rng.pick(lv.terms)));
  // The square of a number or a bracket, small enough to know by heart.
  if (lv.squares && rng.chance(0.25)) {
    const inner = n === 1 ? leaf(rng.int(11, lv.squares)) : grow(rng, n - 1, lv, true);
    if (!inner || inner.value < 2 || inner.value > lv.squares) return null;
    return { node: sq(inner.node), value: inner.value ** 2 };
  }
  const left = rng.int(0, n - 1);
  const right = n - 1 - left;
  const op = rng.pick(lv.allowed);
  // No step comes to 0 or 1: nothing like 7 − 6 or 8 ÷ 8 that wastes a move.
  if (op === '÷') {
    const b = grow(rng, right, lv, true);
    if (!b || b.value < 2 || b.value > factorMax(lv)) return null;
    for (let i = 0; i < 12; i++) {
      const a = left === 0 ? (() => { const v = multipleOf(rng, b.value, lv); return v === null ? null : leaf(v); })() : grow(rng, left, lv);
      if (a && a.value % b.value === 0 && a.value >= 2 * b.value) return { node: bin('÷', a.node, b.node), value: a.value / b.value };
    }
    return null;
  }
  if (op === '×') {
    const a = grow(rng, left, lv), b = grow(rng, right, lv, true);
    if (!a || !b || b.value < 2 || b.value > factorMax(lv)) return null;
    // Sometimes the small factor comes first: 6 × 47.
    return rng.chance(0.3) && b.node.kind === 'num'
      ? { node: bin('×', b.node, a.node), value: a.value * b.value }
      : { node: bin('×', a.node, b.node), value: a.value * b.value };
  }
  let a = grow(rng, left, lv), b = grow(rng, right, lv);
  if (!a || !b) return null;
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

/** The numbers written in a tree (not the 2 of a square). */
export function leaves(n: Node): number[] {
  if (n.kind === 'num') return [n.value];
  if (n.kind === 'neg') return leaves(n.arg);
  if (n.op === '^') return leaves(n.left);
  return [...leaves(n.left), ...leaves(n.right)];
}

/** True when a division takes back a multiplication by the same number: (a × 8) ÷ 8. */
function undoes(n: Node): boolean {
  if (n.kind !== 'bin') return n.kind === 'neg' && undoes(n.arg);
  if (n.op === '÷' && n.left.kind === 'bin' && n.left.op === '×' && n.right.kind === 'num') {
    const k = n.right.value;
    if ((n.left.left.kind === 'num' && n.left.left.value === k) || (n.left.right.kind === 'num' && n.left.right.value === k)) return true;
  }
  return undoes(n.left) || undoes(n.right);
}

/** Pairs of brackets in the printed text, and how deep they nest. */
export function brackets(text: string): { pairs: number; depth: number } {
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

export function generateChain(rng: Rng, level: number): Chain {
  const lv = CHAIN_LEVELS[Math.min(CHAIN_MAX, Math.max(1, level))];
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
    const written = leaves(part.node);
    if (Math.max(...written) < lv.big) continue;
    // A number of two digits or more written twice usually means one move undoes another
    // (900 − (900 − 80), 95 ÷ (95 ÷ 5)).
    const big = written.filter((v) => v >= 10);
    if (new Set(big).size < big.length) continue;
    if (undoes(part.node)) continue;
    const checked = audit(part.node, lv.cap);
    if (!checked) continue;
    return { node: part.node, text, value: checked.value, ops, maxIntermediate: checked.max };
  }
}

const nodes = new WeakMap<Problem, Node>();

function toProblem(c: Chain, level: number): Problem {
  const p: Problem = {
    technique: 'chain',
    level: Math.min(6, level) as Problem['level'],
    text: c.text,
    answer: String(c.value),
    data: { ops: c.ops, max: c.maxIntermediate, level },
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
  return toProblem({ node, text: print(node), value: a.value, ops: countOps(node), maxIntermediate: a.max }, 3);
}
