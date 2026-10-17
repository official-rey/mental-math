import type { ProblemSource } from '../drill/types';
import type { Level, Problem, Rng, Step } from '../techniques/types';
import { bin, evaluate, num, print, sq, traceSteps, type Node } from './evaluator';

/**
 * Chain drills: one expression, several operations, one typed answer.
 * Difficulty raises the number of operations and the size of intermediate values,
 * never the digit count of individual operands (every operand stays ≤ 2 digits).
 */
export const CHAIN_LEVELS: Record<Level, { label: string; ops: [number, number]; cap: number }> = {
  1: { label: '2–3 operations · values up to 200', ops: [2, 3], cap: 200 },
  2: { label: '3–4 operations · values up to 600', ops: [3, 4], cap: 600 },
  3: { label: '5–6 operations · values up to 2,000', ops: [5, 6], cap: 2000 },
};

export const MAX_OPERAND = 99;

interface Part {
  node: Node;
  value: number;
  ops: number;
  /** Last × or ÷ factor, so the next move does not simply undo it. */
  k?: number;
}

const leaf = (n: number): Part => ({ node: num(n), value: n, ops: 0 });

/** A small self-contained term: a number, a product, or a square. */
function term(rng: Rng, cap: number, maxOps: number): Part {
  const kind = maxOps < 1 ? 0 : rng.int(0, 2);
  if (kind === 1) {
    const a = rng.int(2, 19), b = rng.int(2, 9);
    if (a * b <= cap) return { node: bin('×', num(a), num(b)), value: a * b, ops: 1 };
  }
  if (kind === 2) {
    const k = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15, 25]);
    if (k * k <= cap) return { node: sq(num(k)), value: k * k, ops: 1 };
  }
  return leaf(rng.int(2, Math.min(MAX_OPERAND, cap)));
}

/** Opening sub-expression: 2-digit × 1-digit, a square, or a two-number sum or difference. */
function opening(rng: Rng, cap: number): Part {
  for (;;) {
    const kind = rng.int(0, 3);
    if (kind === 0) {
      const a = rng.int(12, 99), b = rng.int(2, 9);
      if (a * b <= cap) return { node: bin('×', num(a), num(b)), value: a * b, ops: 1 };
    } else if (kind === 1) {
      const k = rng.pick([11, 12, 13, 14, 15, 16, 21, 25, 35, 45]);
      if (k * k <= cap) return { node: sq(num(k)), value: k * k, ops: 1 };
    } else if (kind === 2) {
      const a = rng.int(12, 99), b = rng.int(12, 99);
      if (a + b <= cap) return { node: bin('+', num(a), num(b)), value: a + b, ops: 1 };
    } else {
      const a = rng.int(30, 99), b = rng.int(11, a - 5);
      return { node: bin('−', num(a), num(b)), value: a - b, ops: 1 };
    }
  }
}

function divisors(v: number): number[] {
  const out: number[] = [];
  for (let k = 2; k <= 12; k++) if (v % k === 0 && v / k >= 2) out.push(k);
  return out;
}

/** Extend `cur` by one operation (plus whatever the attached term contains). */
function extend(rng: Rng, cur: Part, cap: number, budget: number): Part | null {
  const moves: (() => Part | null)[] = [];
  const divs = divisors(cur.value).filter((k) => k !== cur.k);
  if (divs.length) {
    const k = rng.pick(divs);
    const move = () => ({ node: bin('÷', cur.node, num(k)), value: cur.value / k, ops: cur.ops + 1, k });
    moves.push(move, move); // division is the interesting move; weight it up
  }
  if (cur.value * 2 <= cap) {
    moves.push(() => {
      const k = rng.int(2, Math.max(2, Math.min(9, Math.floor(cap / cur.value))));
      if (k === cur.k) return null;
      const node = rng.chance(0.3) ? bin('×', num(k), cur.node) : bin('×', cur.node, num(k));
      return { node, value: cur.value * k, ops: cur.ops + 1, k };
    });
  }
  moves.push(() => {
    const t = term(rng, cap - cur.value, budget - 1);
    if (t.value < 1 || cur.value + t.value > cap) return null;
    return { node: bin('+', cur.node, t.node), value: cur.value + t.value, ops: cur.ops + 1 + t.ops };
  });
  if (cur.value > 4) {
    moves.push(() => {
      const t = term(rng, cur.value - 1, budget - 1);
      if (t.value >= cur.value) return null;
      return { node: bin('−', cur.node, t.node), value: cur.value - t.value, ops: cur.ops + 1 + t.ops };
    });
  }
  return rng.pick(moves)();
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
  const { ops, cap } = CHAIN_LEVELS[level];
  for (;;) {
    const target = rng.int(ops[0], ops[1]);
    let cur: Part | null = opening(rng, cap);
    let guard = 0;
    while (cur && cur.ops < target && guard++ < 20) {
      cur = extend(rng, cur, cap, target - cur.ops) ?? cur;
    }
    if (!cur || cur.ops < ops[0] || cur.ops > ops[1]) continue;
    const checked = audit(cur.node, cap);
    if (!checked || checked.value !== cur.value || cur.value < 1) continue;
    return { node: cur.node, text: print(cur.node), value: cur.value, ops: cur.ops, maxIntermediate: checked.max };
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
  return [{ op: '', expr: p.text }, ...traceSteps(node).map((s) => ({ expr: s.expr, note: s.did }))];
}

export const chainSource: ProblemSource = {
  id: 'chain',
  name: 'Chain drill',
  generate: (rng, level) => toProblem(generateChain(rng, level), level),
  steps: chainSteps,
};

/** Fixed example for the Chain card: (47 × 6 − 38) ÷ 4 + 15². */
export const chainExampleNode = (): Node =>
  bin('+', bin('÷', bin('−', bin('×', num(47), num(6)), num(38)), num(4)), sq(num(15)));

export function chainExample(): Problem {
  const node = chainExampleNode();
  const a = audit(node, 1000)!;
  return toProblem({ node, text: print(node), value: a.value, ops: 5, maxIntermediate: a.max }, 2);
}
