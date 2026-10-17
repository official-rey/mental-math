import { describe, expect, it } from 'vitest';
import { DrillSession, SPRINT_MS } from '../src/drill/engine';
import type { DrillSpec, RunRecord } from '../src/drill/types';
import { LocalStore } from '../src/storage/store';
import { techniques } from '../src/techniques/registry';
import { makeRng } from '../src/techniques/util';

function clock() {
  let t = 0;
  return { now: () => t, tick: (ms: number) => (t += ms) };
}

const spec = (over: Partial<DrillSpec>): DrillSpec => ({ kind: 'technique', ids: ['mul-2x1'], level: 1, mode: 'twenty', ...over });

describe('drill session', () => {
  it('a 20-problem run ends after 20 answers and scores them', () => {
    const c = clock();
    const s = new DrillSession(spec({}), makeRng(1), c.now);
    s.start();
    for (let i = 0; i < 20; i++) {
      c.tick(1500);
      s.submit(i % 5 === 0 ? 'wrong' : s.current.answer);
      if (!s.isFinished()) s.advance();
    }
    expect(s.isFinished()).toBe(true);
    const r = s.result();
    expect(r.attempted).toBe(20);
    expect(r.correct).toBe(16);
    expect(r.accuracy).toBeCloseTo(0.8);
    expect(r.avgMs).toBe(1500);
    expect(r.totalMs).toBe(30000);
  });

  it('a sprint ends at 60 seconds', () => {
    const c = clock();
    const s = new DrillSession(spec({ mode: 'sprint' }), makeRng(2), c.now);
    s.start();
    let n = 0;
    while (!s.isFinished()) {
      c.tick(2500);
      if (s.isFinished()) break;
      s.submit(s.current.answer);
      s.advance();
      n++;
    }
    s.finish();
    expect(n).toBe(Math.floor((SPRINT_MS - 1) / 2500));
    expect(s.result().totalMs).toBe(SPRINT_MS);
  });

  it('mixed drills rotate between the chosen techniques', () => {
    const ids = techniques.slice(0, 3).map((t) => t.meta.id);
    const s = new DrillSession(spec({ kind: 'mixed', ids, mode: 'training' }), makeRng(3), clock().now);
    let prev = s.start().technique;
    const seen = new Set([prev]);
    for (let i = 0; i < 60; i++) {
      const p = s.advance();
      expect(p.technique).not.toBe(prev);
      expect(ids).toContain(p.technique);
      seen.add(p.technique);
      prev = p.technique;
    }
    expect(seen.size).toBe(3);
  });

  it('chain drills produce steps for the exact problem', () => {
    const s = new DrillSession(spec({ kind: 'chain', ids: [] }), makeRng(4), clock().now);
    const p = s.start();
    const steps = s.steps(p);
    expect(steps[0].expr).toBe(p.text);
    expect(steps[steps.length - 1].expr.replace(/,/g, '')).toBe(p.answer);
  });
});

describe('local store', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  const run = (correct: number, totalMs: number, id: string): RunRecord => ({
    id, drillKey: 'k', drillName: 'K', mode: 'twenty', level: 1, correct, attempted: 20,
    accuracy: correct / 20, totalMs, avgMs: totalMs / 20, date: 1, log: [],
  });

  it('keeps the top 10 per drill and mode, best first', async () => {
    const st = new LocalStore(mem());
    for (let i = 0; i < 14; i++) await st.saveRun(run(10 + (i % 7), 30000 + i * 100, `r${i}`));
    const top = await st.topRuns('k', 'twenty');
    expect(top).toHaveLength(10);
    expect(top[0].correct).toBe(16);
    expect(top[0].totalMs).toBeLessThan(top[1].totalMs);
    const res = await st.saveRun(run(20, 1000, 'best'));
    expect(res).toEqual({ rank: 1, isBest: true });
    expect((await st.best('k', 'twenty'))!.id).toBe('best');
    expect((await st.saveRun(run(1, 99999, 'worst'))).rank).toBeNull();
  });

  it('training runs are not ranked; prefs persist', async () => {
    const st = new LocalStore(mem());
    expect(await st.saveRun({ ...run(5, 1, 't'), mode: 'training' })).toEqual({ rank: null, isBest: false });
    await st.setPrefs({ muted: true, level: 3 });
    expect(await st.getPrefs()).toMatchObject({ muted: true, level: 3, mode: 'training' });
  });
});
