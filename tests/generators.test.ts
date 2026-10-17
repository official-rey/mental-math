import { describe, expect, it } from 'vitest';
import { evaluateString } from '../src/chain/evaluator';
import { techniques } from '../src/techniques/registry';
import { LEVELS, type Problem, type Technique } from '../src/techniques/types';
import { isCorrect, makeRng, normalize } from '../src/techniques/util';

const SAMPLES = 500;

function fail(t: Technique, p: Problem, msg: string): never {
  throw new Error(`[${t.meta.id} L${p.level}] ${p.text} → ${msg}`);
}

/** The answer matches an independent evaluation, and the worked steps end on it. */
function checkProblem(t: Technique, p: Problem) {
  if (!/^\d+(\.\d+)?$/.test(p.answer)) fail(t, p, `answer "${p.answer}" is not a plain non-negative number`);
  if (!p.text || /NaN|undefined|Infinity/.test(p.text)) fail(t, p, 'bad text');

  const ref = t.reference ? t.reference(p) : evaluateString(p.expr ?? p.text);
  const tol = p.tolerance ?? 1e-9;
  if (!(Math.abs(Number(p.answer) - ref) <= tol)) fail(t, p, `answer ${p.answer} but reference ${ref} (tolerance ${tol})`);
  if (!isCorrect(p, p.answer)) fail(t, p, 'answer does not accept itself');

  const steps = t.steps(p);
  if (steps.length < 2) fail(t, p, 'fewer than 2 steps');
  for (const s of steps) {
    if (/NaN|undefined|Infinity|\[object/.test(s.expr + (s.note ?? ''))) fail(t, p, `bad step "${s.expr}"`);
  }
  const last = steps[steps.length - 1].expr;
  if (normalize(last) !== normalize(p.answer)) fail(t, p, `last step "${last}" ≠ answer ${p.answer}`);
}

it('registry has techniques in every category with unique ids', () => {
  const ids = techniques.map((t) => t.meta.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(techniques.map((t) => [t.meta.id, t] as const))('%s', (_id, t) => {
  it('card: idea, ≤3 lines of prose, example with steps, graphic', () => {
    expect(t.meta.idea.length).toBeGreaterThan(10);
    expect(t.card.prose.length).toBeGreaterThan(0);
    expect(t.card.prose.length).toBeLessThanOrEqual(3);
    expect(t.card.caption.length).toBeGreaterThan(0);
    const svg = t.card.graphic();
    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(svg).toContain('aria-label=');
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/); // colors come from theme classes
    expect(t.card.example.technique).toBe(t.meta.id);
    checkProblem(t, t.card.example);
  });

  for (const level of LEVELS) {
    it(`level ${level}: ${SAMPLES} samples are correct and within bounds`, () => {
      const rng = makeRng(9000 + level * 77);
      const bounds = Object.entries(t.levels[level].bounds);
      expect(bounds.length).toBeGreaterThan(0);
      const seen = new Set<string>();
      for (let i = 0; i < SAMPLES; i++) {
        const p = t.generate(rng, level);
        if (p.level !== level) fail(t, p, `level ${p.level}`);
        if (p.technique !== t.meta.id) fail(t, p, `technique ${p.technique}`);
        for (const [key, [lo, hi]] of bounds) {
          const v = p.data[key];
          if (v === undefined || !(v >= lo && v <= hi)) fail(t, p, `${key} = ${v} outside [${lo}, ${hi}]`);
        }
        checkProblem(t, p);
        seen.add(p.text);
      }
      expect(seen.size, 'problem variety').toBeGreaterThanOrEqual(5);
    });
  }
});
