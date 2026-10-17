import type { ProblemSource } from '../drill/types';
import type { Level, Problem, Rng, Step } from '../techniques/types';
import { fmt } from '../techniques/util';

/**
 * Running-total chains: a start number, then one operation at a time ("+ 5", "× 3", "− 4"),
 * each shown briefly and then gone. The arithmetic stays easy; the work is holding the
 * running total in your head. Operations apply in the order shown, left to right.
 */
type Op = '+' | '−' | '×' | '÷';

export const FLASH_LEVELS: Record<Level, { label: string; steps: number; max: number; cap: number; ops: Op[]; flashMs: number }> = {
  1: { label: '3 steps · add and take away, 1–9', steps: 3, max: 9, cap: 30, ops: ['+', '−'], flashMs: 1800 },
  2: { label: '4 steps · add and take away', steps: 4, max: 9, cap: 50, ops: ['+', '−'], flashMs: 1600 },
  3: { label: '5 steps · with ×', steps: 5, max: 12, cap: 100, ops: ['+', '−', '×'], flashMs: 1500 },
  4: { label: '6 steps · all four operations', steps: 6, max: 12, cap: 150, ops: ['+', '−', '×', '÷'], flashMs: 1400 },
  5: { label: '8 steps · numbers to 20', steps: 8, max: 20, cap: 250, ops: ['+', '−', '×', '÷'], flashMs: 1200 },
  6: { label: '10 steps · numbers to 25', steps: 10, max: 25, cap: 400, ops: ['+', '−', '×', '÷'], flashMs: 1000 },
};

const apply = (v: number, op: Op, n: number) => (op === '+' ? v + n : op === '−' ? v - n : op === '×' ? v * n : v / n);

/** One legal move from `v`, or null if this op cannot be used here. */
function move(rng: Rng, v: number, op: Op, max: number, cap: number): number | null {
  if (op === '+') {
    const n = rng.int(1, Math.min(max, cap - v));
    return n >= 1 && v + n <= cap ? n : null;
  }
  if (op === '−') return v >= 2 ? rng.int(1, Math.min(max, v - 1)) : null;
  if (op === '×') {
    const top = Math.min(max >= 20 ? 6 : 4, Math.floor(cap / Math.max(v, 1)));
    return v >= 2 && top >= 2 ? rng.int(2, top) : null;
  }
  const divs = [2, 3, 4, 5, 6, 7, 8, 9].filter((k) => v % k === 0 && v / k >= 2);
  return divs.length ? rng.pick(divs) : null;
}

export interface FlashChain {
  start: number;
  moves: [Op, number][];
  value: number;
}

export function generateFlash(rng: Rng, level: Level): FlashChain {
  const { steps, max, cap, ops } = FLASH_LEVELS[level];
  for (;;) {
    let v = rng.int(2, max);
    const start = v;
    const moves: [Op, number][] = [];
    let guard = 0;
    while (moves.length < steps && guard++ < 200) {
      const op = rng.pick(ops);
      // Do not undo the previous move straight away (× 3 then ÷ 3, + 4 then − 4).
      const last = moves[moves.length - 1];
      const n = move(rng, v, op, max, cap);
      if (n === null) continue;
      if (last && ((last[0] === '×' && op === '÷') || (last[0] === '÷' && op === '×') || (last[0] === '+' && op === '−') || (last[0] === '−' && op === '+')) && last[1] === n) continue;
      v = apply(v, op, n);
      moves.push([op, n]);
    }
    if (moves.length === steps && v >= 1) return { start, moves, value: v };
  }
}

const chains = new WeakMap<Problem, FlashChain>();

function toProblem(c: FlashChain, level: Level): Problem {
  const sequence = [String(c.start), ...c.moves.map(([op, n]) => `${op} ${n}`)];
  const p: Problem = {
    technique: 'chain-flash',
    level,
    // Arrows make the order explicit: this is a running total, not normal precedence.
    text: sequence.join(' → '),
    answer: String(c.value),
    data: { steps: c.moves.length, start: c.start },
    sequence,
    hint: 'running total',
  };
  chains.set(p, c);
  return p;
}

/** The running total, one operation per step. */
export function flashSteps(p: Problem): Step[] {
  const c = chains.get(p);
  if (!c) return [{ op: '', expr: p.text }, { expr: fmt(p.answer) }];
  const steps: Step[] = [{ op: '', expr: p.text }];
  let v = c.start;
  c.moves.forEach(([op, n], i) => {
    const next = apply(v, op, n);
    steps.push({ op: '', expr: `${fmt(v)} ${op} ${n} = ${fmt(next)}`, note: i === 0 ? 'start, then each step in order' : undefined });
    v = next;
  });
  steps.push({ expr: fmt(v) });
  return steps;
}

export function flashMs(level: Level): number {
  return FLASH_LEVELS[level].flashMs;
}

export const flashSource: ProblemSource = {
  id: 'chain-flash',
  name: 'Running total chains',
  generate: (rng, level) => toProblem(generateFlash(rng, level), level),
  steps: flashSteps,
};

/** Fixed example for the Chains page: 7, + 5, × 3, − 4 → 32. */
export function flashExample(): Problem {
  return toProblem({ start: 7, moves: [['+', 5], ['×', 3], ['−', 4]], value: 32 }, 1);
}
