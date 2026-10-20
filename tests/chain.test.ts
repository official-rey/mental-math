import { describe, expect, it } from 'vitest';
import { bin, EvalError, evaluate, evaluateString, num, parse, print, traceSteps } from '../src/chain/evaluator';
import { CHAIN_LEVEL_IDS, CHAIN_LEVELS, MAX_OPERAND, chainExample, chainSource, generateChain, leaves } from '../src/chain/generator';
import { makeRng, normalize } from '../src/techniques/util';

describe('precedence', () => {
  it.each([
    ['2 + 3 × 4', 14],
    ['20 − 6 ÷ 2', 17],
    ['2 × 3²', 18],
    ['10 − 2 − 3', 5],
    ['48 ÷ 4 ÷ 2', 6],
    ['2 ^ 3 ^ 2', 512],
    ['5 + 4² × 2 − 1', 36],
    ['7 × 6 − 38 ÷ 2 + 15²', 248],
    ['−3²', -9],
    ['17 mod 5 + 1', 3],
  ])('%s = %d', (src, value) => {
    expect(evaluateString(src)).toBe(value);
  });

  it('accepts ASCII operators and thousands commas', () => {
    expect(evaluateString('1,000 - 372')).toBe(628);
    expect(evaluateString('6*7/3')).toBe(14);
  });
});

describe('parentheses', () => {
  it.each([
    ['(2 + 3) × 4', 20],
    ['((1 + 2) × (3 + 4))', 21],
    ['10 − (5 − 2)', 7],
    ['(47 × 6 − 38) ÷ 4 + 15²', 286],
    ['(2 + 3)²', 25],
    ['48 ÷ (4 ÷ 2)', 24],
    ['√49 + 3 × √(16 + 9)', 22],
  ])('%s = %d', (src, value) => {
    expect(evaluateString(src)).toBe(value);
  });

  it('printing adds exactly the parentheses the tree needs', () => {
    expect(print(bin('×', bin('+', num(2), num(3)), num(4)))).toBe('(2 + 3) × 4');
    expect(print(bin('+', num(2), bin('×', num(3), num(4))))).toBe('2 + 3 × 4');
    expect(print(bin('−', num(10), bin('−', num(5), num(2))))).toBe('10 − (5 − 2)');
    expect(print(bin('−', bin('−', num(10), num(5)), num(2)))).toBe('10 − 5 − 2');
    expect(print(bin('^', bin('+', num(2), num(3)), num(2)))).toBe('(2 + 3)²');
  });

  it('rejects unbalanced input', () => {
    expect(() => parse('(2 + 3')).toThrow(EvalError);
    expect(() => parse('2 + 3)')).toThrow(EvalError);
  });
});

describe('exact division and integer intermediates', () => {
  it('strict mode refuses inexact division', () => {
    expect(() => evaluateString('7 ÷ 2', { strict: true })).toThrow(EvalError);
    expect(() => evaluateString('(9 + 6) ÷ 4 × 4', { strict: true })).toThrow(EvalError);
    expect(evaluateString('(9 + 7) ÷ 4', { strict: true })).toBe(4);
  });

  it('lenient mode allows fractions', () => {
    expect(evaluateString('7 ÷ 2')).toBe(3.5);
  });

  it('reports every intermediate in evaluation order', () => {
    const seen: number[] = [];
    evaluateString('(47 × 6 − 38) ÷ 4 + 15²', { onStep: (v) => seen.push(v) });
    expect(seen).toEqual([282, 244, 61, 225, 286]);
  });

  it('trace reduces one operation at a time', () => {
    const steps = traceSteps(parse('(47 × 6 − 38) ÷ 4 + 15²'));
    expect(steps.map((s) => s.expr)).toEqual([
      '(282 − 38) ÷ 4 + 15²',
      '244 ÷ 4 + 15²',
      '61 + 15²',
      '61 + 225',
      '286',
    ]);
    expect(steps[0].did).toBe('47×6');
  });
});

/** Pairs of brackets and how deep they nest. */
function brackets(text: string): { pairs: number; depth: number } {
  let d = 0, max = 0, pairs = 0;
  for (const c of text) {
    if (c === '(') (pairs++, (max = Math.max(max, ++d)));
    if (c === ')') d--;
  }
  return { pairs, depth: max };
}

describe('chain generator', () => {
  for (const level of CHAIN_LEVEL_IDS) {
    it(`level ${level}: 500 chains are well-formed PEMDAS practice`, () => {
      const rng = makeRng(31 + level);
      const { ops, cap, groups, nested, big } = CHAIN_LEVELS[level];
      const texts = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const c = generateChain(rng, level);
        texts.add(c.text);
        // Integer intermediates within bounds, exact divisions.
        const seen: number[] = [];
        const v = evaluate(c.node, { strict: true, onStep: (x) => seen.push(x) });
        expect(v).toBe(c.value);
        for (const x of seen) {
          expect(Number.isInteger(x)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(cap);
        }
        expect(c.value).toBeGreaterThan(0);
        // Length grows with level; operands stay small.
        expect(c.ops).toBeGreaterThanOrEqual(ops[0]);
        expect(c.ops).toBeLessThanOrEqual(ops[1]);
        for (const x of leaves(c.node)) expect(x).toBeLessThanOrEqual(MAX_OPERAND);
        // The printed text parses back to the same value under standard precedence.
        expect(evaluateString(c.text, { strict: true })).toBe(c.value);
        // The order of operations matters: both kinds of operation, and the level's brackets.
        expect(c.text).toMatch(/[+−]/);
        expect(c.text).toMatch(/[×÷²√]/);
        const b = brackets(c.text);
        expect(b.pairs).toBeGreaterThanOrEqual(groups);
        if (nested) expect(b.depth).toBeGreaterThanOrEqual(2);
        // Each level uses numbers of its own size.
        expect(Math.max(...leaves(c.node))).toBeGreaterThanOrEqual(big);
      }
      expect(texts.size).toBeGreaterThan(level <= 2 ? 150 : 400);
    });
  }

  it('problem steps end on the answer', () => {
    const rng = makeRng(5);
    for (let i = 0; i < 200; i++) {
      const p = chainSource.generate(rng, 3);
      const steps = chainSource.steps(p);
      expect(normalize(steps[steps.length - 1].expr)).toBe(p.answer);
    }
  });

  it('the example works brackets first, then ×, ÷, then −', () => {
    const p = chainExample();
    expect(p.text).toBe('(8 + 4) × 3 − 18 ÷ (2 + 4)');
    expect(p.answer).toBe('33');
    expect(chainSource.steps(p).map((s) => s.expr)).toEqual([
      '(8 + 4) × 3 − 18 ÷ (2 + 4)',
      '12 × 3 − 18 ÷ (2 + 4)',
      '36 − 18 ÷ (2 + 4)',
      '36 − 18 ÷ 6',
      '36 − 3',
      '33',
    ]);
  });
});
