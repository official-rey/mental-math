import { describe, expect, it } from 'vitest';
import { BONUS_MS, DrillSession, RAMP_STREAK, SPRINT_MS } from '../src/drill/engine';
import type { DrillSpec, RunRecord } from '../src/drill/types';
import { LocalStore } from '../src/storage/store';
import { betterTechnique } from '../src/techniques/route';
import { techniques } from '../src/techniques/registry';
import { LEVELS } from '../src/techniques/types';
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
      // Every fifth problem takes a second try.
      if (i % 5 === 0) expect(s.submit('wrong')).toMatchObject({ ok: false, done: false });
      s.submit(s.current.answer);
      if (!s.isFinished()) s.advance();
    }
    expect(s.isFinished()).toBe(true);
    const r = s.result();
    expect(r.attempted).toBe(20);
    expect(r.correct).toBe(20);
    expect(r.accuracy).toBeCloseTo(0.8);
    expect(r.log.filter((e) => e.misses === 1)).toHaveLength(4);
    expect(r.avgMs).toBe(1500);
    expect(r.totalMs).toBe(30000);
  });

  it('a sprint with no correct answers ends at 60 seconds', () => {
    const c = clock();
    const s = new DrillSession(spec({ mode: 'sprint' }), makeRng(2), c.now);
    s.start();
    let n = 0;
    for (;;) {
      c.tick(2500);
      if (s.isFinished()) break;
      s.skip();
      s.advance();
      n++;
    }
    s.finish();
    expect(n).toBe(Math.floor((SPRINT_MS - 1) / 2500));
    expect(s.result().totalMs).toBe(SPRINT_MS);
  });

  it('each correct sprint answer adds time to the clock', () => {
    const c = clock();
    const s = new DrillSession(spec({ mode: 'sprint' }), makeRng(9), c.now);
    s.start();
    for (let i = 0; i < 5; i++) {
      c.tick(1000);
      const a = s.submit(s.current.answer);
      expect(a.bonusMs).toBe(BONUS_MS);
      s.advance();
    }
    s.submit('wrong');
    expect(s.timeLimit()).toBe(SPRINT_MS + 5 * BONUS_MS);
    expect(s.remaining()).toBe(SPRINT_MS + 5 * BONUS_MS - 5000);
    c.tick(SPRINT_MS);
    expect(s.isFinished()).toBe(false);
    c.tick(5 * BONUS_MS);
    expect(s.isFinished()).toBe(true);
  });

  it('a higher level starts at Level I and climbs after streaks of correct answers', () => {
    const c = clock();
    const s = new DrillSession(spec({ level: 3, mode: 'training' }), makeRng(10), c.now);
    const levels: number[] = [s.start().level];
    const answer = (ok: boolean) => {
      const a = s.submit(ok ? s.current.answer : 'wrong');
      levels.push(s.advance().level);
      return a;
    };
    for (let i = 0; i < RAMP_STREAK - 1; i++) answer(true);
    expect(answer(true).levelUp).toBe(2);
    answer(true);
    answer(false); // a miss restarts the streak
    for (let i = 0; i < RAMP_STREAK - 1; i++) answer(true);
    expect(s.level).toBe(2);
    expect(answer(true).levelUp).toBe(3);
    for (let i = 0; i < 6; i++) expect(answer(true).levelUp).toBeUndefined();
    expect(levels.slice(0, RAMP_STREAK)).toEqual([1, 1, 1]);
    expect(levels[levels.length - 1]).toBe(3);
    expect(s.result().level).toBe(3);
  });

  it('Level I drills start at Level I with no ramp', () => {
    const s = new DrillSession(spec({ level: 1 }), makeRng(11), clock().now);
    expect(s.start().level).toBe(1);
  });

  it('pausing stops the sprint clock and the problem timer', () => {
    const c = clock();
    const s = new DrillSession(spec({ mode: 'sprint' }), makeRng(5), c.now);
    s.start();
    c.tick(10_000);
    s.pause();
    c.tick(50_000);
    expect(s.isFinished()).toBe(false);
    expect(s.remaining()).toBe(50_000);
    s.resume();
    c.tick(2_000);
    s.submit(s.current.answer);
    expect(s.log[0].ms).toBe(12_000);
    expect(s.remaining()).toBe(48_000 + BONUS_MS);
  });

  it('a wrong answer keeps the problem up to retry; streaks count first tries', () => {
    const s = new DrillSession(spec({ mode: 'training' }), makeRng(12), clock().now);
    const first = s.start();
    for (let i = 0; i < 4; i++) {
      expect(s.submit(s.current.answer).streak).toBe(i + 1);
      s.advance();
    }
    const miss = s.submit('wrong');
    expect(miss).toMatchObject({ ok: false, done: false, streak: 0 });
    expect(s.log).toHaveLength(4);
    const p = s.current;
    s.submit('still wrong');
    const right = s.submit(p.answer);
    expect(right).toMatchObject({ ok: true, done: true, streak: 0 });
    expect(s.log[4]).toMatchObject({ text: p.text, ok: true, misses: 2, input: 'wrong' });
    s.advance();
    expect(s.submit(s.current.answer).streak).toBe(1);
    expect(s.result()).toMatchObject({ correct: 6, attempted: 6, bestStreak: 4 });
    expect(first.text).toBeTruthy();
  });

  it('skips are logged as misses with the technique id', () => {
    const s = new DrillSession(spec({}), makeRng(6), clock().now);
    s.start();
    const a = s.skip();
    expect(a.ok).toBe(false);
    expect(s.log[0]).toMatchObject({ technique: 'mul-2x1', ok: false, skipped: true, input: '' });
    expect(s.result().spec).toEqual(spec({}));
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
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
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

  it('keeps history of every run, an index of bests, and can erase runs', async () => {
    const st = new LocalStore(mem());
    await st.saveRun({ ...run(5, 1, 't1'), mode: 'training', drillKey: 'a' });
    await st.saveRun({ ...run(12, 30000, 'b1'), drillKey: 'b', date: 5 });
    await st.saveRun({ ...run(14, 30000, 'c1'), drillKey: 'c', date: 9 });
    expect((await st.history()).map((r) => r.id)).toEqual(['c1', 'b1', 't1']);
    expect((await st.bests()).map((r) => r.id)).toEqual(['c1', 'b1']);
    expect((await st.getRun('t1'))!.mode).toBe('training');
    await st.setPrefs({ level: 2 });
    await st.clearRuns();
    expect(await st.history()).toEqual([]);
    expect(await st.bests()).toEqual([]);
    expect(await st.topRuns('b', 'twenty')).toEqual([]);
    expect((await st.getPrefs()).level).toBe(2);
  });

  it('training runs are not ranked; prefs persist', async () => {
    const st = new LocalStore(mem());
    expect(await st.saveRun({ ...run(5, 1, 't'), mode: 'training' })).toEqual({ rank: null, isBest: false });
    await st.setPrefs({ muted: true, level: 3 });
    expect(await st.getPrefs()).toMatchObject({ muted: true, level: 3, mode: 'training' });
  });
});

describe('problem routing', () => {
  it('no card example is better served by another technique', () => {
    for (const t of techniques) expect(betterTechnique(t.card.example), t.meta.id).toBeNull();
  });

  it('drills avoid problems another technique handles better, and avoid repeats', () => {
    for (const t of techniques) {
      for (const level of LEVELS) {
        const s = new DrillSession(spec({ ids: [t.meta.id], level, mode: 'training' }), makeRng(level * 101), clock().now);
        s.level = level;
        const texts: string[] = [];
        let routed = 0;
        for (let i = 0; i < 120; i++) {
          const p = i === 0 ? s.start() : s.advance();
          if (betterTechnique(p)) routed++;
          texts.push(p.text);
        }
        expect(routed, `${t.meta.id} L${level}`).toBeLessThanOrEqual(2);
        // Any window of 30 consecutive problems has no repeats, unless the level has very few problems.
        const window = new Set(texts.slice(0, 30));
        if (window.size < 30) expect(window.size, `${t.meta.id} L${level} variety`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe('leaderboard names', () => {
  it('names earlier unnamed runs and keeps existing names', async () => {
    const m = new Map<string, string>();
    const st = new LocalStore({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) });
    const base = { drillKey: 'k', drillName: 'K', mode: 'twenty' as const, level: 1 as const, attempted: 20, accuracy: 1, totalMs: 1, avgMs: 1, date: 1, log: [] };
    await st.saveRun({ ...base, id: 'a', correct: 20 });
    await st.saveRun({ ...base, id: 'b', correct: 19, player: 'Ana' });
    await st.nameRuns('Rey');
    expect((await st.topRuns('k', 'twenty')).map((r) => r.player)).toEqual(['Rey', 'Ana']);
    expect((await st.history()).map((r) => r.player)).toEqual(['Ana', 'Rey']);
  });
});
