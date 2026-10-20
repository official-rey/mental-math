import { chainSource } from '../chain/generator';
import { getTechnique } from '../techniques/registry';
import type { Level, Problem, Rng, Step } from '../techniques/types';
import { betterTechnique } from '../techniques/route';
import { isCorrect, makeRng } from '../techniques/util';
import { drillKey, drillName } from './spec';
import type { DrillSpec, ProblemSource, RunEntry, RunRecord } from './types';

export const SPRINT_MS = 60_000;
/** Endless: lives, and the clock on each problem (it shrinks by a share of the start per solve, down to a floor). */
export const LIVES = 3;
export const ENDLESS_START_MS = 15_000;
export const ENDLESS_CHAIN_MS = 40_000;
const ENDLESS_SHRINK = 0.02;
const ENDLESS_FLOOR = 0.35;
export const TWENTY = 20;
/** Correct answers in a row at a level before the drill steps up toward the chosen level. */
export const RAMP_STREAK = 3;
/** Fewer are needed to pass a level already reached before. */
export const KNOWN_STREAK = 2;
/**
 * Sprint clock, in the spirit of Lichess Puzzle Storm: every first-try answer adds a little
 * time, a growing combo adds more at milestones, and a mistake takes time away (and resets the
 * combo). Chains take longer, so their base bonus is bigger.
 */
export const BONUS_MS = 1_000;
export const CHAIN_BONUS_MS = 3_000;
export const PENALTY_MS = 5_000;
/** Combo lengths that pay out, and what they pay. After the last, every 10 more pays the last amount. */
export const COMBO: readonly [number, number][] = [[5, 3_000], [12, 5_000], [20, 7_000], [30, 10_000]];

/** Extra time for reaching combo 
, or 0. */
export function comboBonus(n: number): number {
  const hit = COMBO.find(([k]) => k === n);
  if (hit) return hit[1];
  const [lastK, lastMs] = COMBO[COMBO.length - 1];
  return n > lastK && (n - lastK) % 10 === 0 ? lastMs : 0;
}

/** The next combo milestone after 
. */
export function nextCombo(n: number): number {
  const k = COMBO.find(([c]) => c > n);
  if (k) return k[0];
  const lastK = COMBO[COMBO.length - 1][0];
  return lastK + Math.ceil((n + 1 - lastK) / 10) * 10;
}

/** Challenge ladder: level 1–10 maps onto technique levels 1–6, blending the two nearest. */
export function ladderToTechnique(rng: Rng, level: number): Level {
  const x = 1 + ((Math.min(10, Math.max(1, level)) - 1) * 5) / 9;
  const lo = Math.floor(x);
  return (rng.next() < x - lo ? lo + 1 : lo) as Level;
}
/** How many recent problems a run avoids repeating. */
const RECENT = 30;

export function sourcesFor(spec: DrillSpec): ProblemSource[] {
  if (spec.kind === 'chain') return [chainSource];
  return spec.ids.map((id) => {
    const t = getTechnique(id)!;
    // Challenge runs climb a 10-rung ladder; Train uses the technique's own six levels.
    const generate = spec.ladder ? (rng: Rng, level: number) => t.generate(rng, ladderToTechnique(rng, level)) : (rng: Rng, level: number) => t.generate(rng, level as Level);
    return { id, name: t.meta.name, generate, steps: t.steps };
  });
}

export interface Attempt {
  ok: boolean;
  problem: Problem;
  input: string;
  ms: number;
  /** Sprint time this answer added (or took away, when negative). */
  bonusMs: number;
  /** Sprint: the combo milestone this answer reached, if any. */
  combo?: number;
  /** Set when this answer moved the drill up a level. */
  levelUp?: number;
  /** True once the problem is over (solved or skipped); a wrong answer leaves it open to retry. */
  done: boolean;
  /** Right answers in a row after this one (first tries only). */
  streak: number;
  /** Endless: this answer (or skip, or timeout) cost a life. */
  lifeLost?: boolean;
}

/**
 * One drill run, independent of the DOM. Time comes from `now()` so tests can drive it.
 */
export class DrillSession {
  readonly sources: ProblemSource[];
  readonly log: RunEntry[] = [];
  current!: Problem;
  private source!: ProblemSource;
  private shownAt = 0;
  private startedAt = 0;
  private endedAt: number | null = null;
  private pausedAt: number | null = null;
  private pausedTotal = 0;
  private bonusTotal = 0;
  private penaltyTotal = 0;
  /** Texts of the last few problems, to avoid repeats within a run. */
  private recent: string[] = [];
  /** Correct answers in a row toward the next level. */
  private rampStreak = 0;
  /** Right first time, in a row, for rewards. */
  streak = 0;
  bestStreak = 0;
  /** Endless: lives left. */
  lives = LIVES;
  /** Wrong tries on the current problem, and the first wrong input. */
  private misses = 0;
  private firstWrong = '';
  /**
   * Level problems are generated at. Starts at I and climbs one level after every
   * RAMP_STREAK correct answers in a row, until it reaches the level the player chose.
   */
  level = 1;
  /** Highest level reached in this run. */
  peak = 1;

  constructor(
    readonly spec: DrillSpec,
    private rng: Rng = makeRng(),
    private now: () => number = () => performance.now(),
  ) {
    this.sources = sourcesFor(spec);
  }

  start(): Problem {
    this.startedAt = this.now();
    return this.advance();
  }

  /**
   * Pick the next problem: a different technique than last time (in mixed drills), nothing
   * seen recently in this run, and nothing another technique handles better.
   */
  advance(): Problem {
    const pool = this.sources.length > 1 && this.source ? this.sources.filter((s) => s !== this.source) : this.sources;
    this.source = this.rng.pick(pool);
    let p = this.source.generate(this.rng, this.level);
    const gen = () => this.source.generate(this.rng, this.level);
    // Prefer fresh problems; small levels may run out, so repeats are only avoided when possible.
    for (let i = 0; i < 24 && (this.recent.includes(p.text) || betterTechnique(p)); i++) p = gen();
    for (let i = 0; i < 40 && betterTechnique(p); i++) p = gen();
    this.recent.push(p.text);
    if (this.recent.length > RECENT) this.recent.shift();
    this.current = p;
    this.shownAt = this.now();
    this.misses = 0;
    this.firstWrong = '';
    return p;
  }

  /**
   * Check an answer. A wrong one is forgiven: the problem stays up to try again, and only
   * counts against first-try accuracy and the streak.
   */
  submit(input: string): Attempt {
    const ok = isCorrect(this.current, input);
    if (ok) return this.record(input, true, false);
    if (!this.misses) this.firstWrong = input;
    this.misses++;
    this.streak = 0;
    this.rampStreak = 0;
    // Endless: a wrong answer costs a life; losing the last one ends the run on this problem.
    if (this.spec.mode === 'endless' && --this.lives <= 0) return { ...this.record(input, false, false), lifeLost: true };
    // Sprint: a mistake costs time.
    let bonusMs = 0;
    if (this.spec.mode === 'sprint' && this.remaining() > 0) {
      bonusMs = -Math.min(PENALTY_MS, this.remaining());
      this.penaltyTotal -= bonusMs;
      if (this.isFinished()) this.endedAt = this.now();
    }
    const ms = Math.max(0, Math.round(this.now() - this.shownAt));
    return { ok: false, problem: this.current, input, ms, bonusMs, done: this.isFinished(), streak: 0, ...(this.spec.mode === 'endless' ? { lifeLost: true } : {}) };
  }

  /** Give up on the current problem: logged as unsolved. In Endless it costs a life. */
  skip(): Attempt {
    if (this.spec.mode === 'endless') {
      this.lives--;
      return { ...this.record('', false, true), lifeLost: true };
    }
    return this.record('', false, true);
  }

  /** Endless: time allowed for the current problem; it tightens as you solve more. */
  problemLimit(): number {
    const base = this.spec.kind === 'chain' ? ENDLESS_CHAIN_MS : ENDLESS_START_MS;
    return Math.max(base * ENDLESS_FLOOR, base - this.correct * base * ENDLESS_SHRINK);
  }

  /** Endless: time left on the current problem (Infinity in other modes). */
  problemRemaining(): number {
    if (this.spec.mode !== 'endless') return Infinity;
    const at = this.pausedAt ?? this.now();
    return Math.max(0, this.problemLimit() - (at - this.shownAt));
  }

  private record(input: string, ok: boolean, skipped: boolean): Attempt {
    const ms = Math.max(0, Math.round(this.now() - this.shownAt));
    const p = this.current;
    const misses = this.misses;
    this.log.push({
      technique: p.technique,
      text: p.text,
      answer: p.answer,
      input: misses ? this.firstWrong : input,
      ok,
      ms,
      level: this.level,
      ...(misses ? { misses } : {}),
      ...(skipped ? { skipped } : {}),
    });
    const clean = ok && !misses;
    this.streak = clean ? this.streak + 1 : 0;
    let bonusMs = 0, combo: number | undefined;
    if (clean && this.spec.mode === 'sprint' && this.remaining() > 0) {
      const extra = comboBonus(this.streak);
      if (extra) combo = this.streak;
      bonusMs = (p.technique.startsWith('chain') ? CHAIN_BONUS_MS : BONUS_MS) + extra;
      this.bonusTotal += bonusMs;
    }
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    let levelUp: number | undefined;
    this.rampStreak = clean ? this.rampStreak + 1 : 0;
    // Levels already reached in an earlier run (chains) go by faster.
    const need = this.level < (this.spec.known ?? 0) ? KNOWN_STREAK : RAMP_STREAK;
    if (this.rampStreak >= need && this.level < this.spec.level) {
      this.level++;
      this.peak = Math.max(this.peak, this.level);
      this.rampStreak = 0;
      levelUp = this.level;
    }
    if (this.isFinished()) this.endedAt = this.now();
    return { ok, problem: p, input, ms, bonusMs, done: true, streak: this.streak, ...(combo ? { combo } : {}), ...(levelUp ? { levelUp } : {}) };
  }

  /** Problems answered right the first time. */
  get firstTry() {
    return this.log.filter((e) => e.ok && !e.misses).length;
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  /** Stop the clock (timed modes). The current problem's time stops too. */
  pause() {
    if (this.pausedAt === null && this.endedAt === null) this.pausedAt = this.now();
  }

  resume() {
    if (this.pausedAt === null) return;
    const gap = this.now() - this.pausedAt;
    this.pausedTotal += gap;
    this.shownAt += gap;
    this.pausedAt = null;
  }

  steps(p: Problem = this.current): Step[] {
    const src = this.sources.find((s) => s.id === p.technique) ?? this.source;
    return src.steps(p);
  }

  sourceName(p: Problem = this.current): string {
    return this.sources.find((s) => s.id === p.technique)?.name ?? '';
  }

  /** Active time since the start, excluding pauses. */
  elapsed(): number {
    const end = this.endedAt ?? this.pausedAt ?? this.now();
    return end - this.startedAt - this.pausedTotal;
  }

  /** Sprint clock: 60 s plus the bonus earned so far. */
  timeLimit(): number {
    return SPRINT_MS + this.bonusTotal - this.penaltyTotal;
  }

  /** Milliseconds left in a sprint (0 when over); Infinity for other modes. */
  remaining(): number {
    return this.spec.mode === 'sprint' ? Math.max(0, this.timeLimit() - this.elapsed()) : Infinity;
  }

  isFinished(): boolean {
    if (this.spec.mode === 'twenty') return this.log.length >= TWENTY;
    if (this.spec.mode === 'sprint') return this.elapsed() >= this.timeLimit();
    if (this.spec.mode === 'endless') return this.lives <= 0;
    return false;
  }

  /** End now (sprint timeout or training "Done"). */
  finish() {
    this.resume();
    this.endedAt ??= this.now();
  }

  get correct() {
    return this.log.filter((e) => e.ok).length;
  }

  result(): RunRecord {
    const attempted = this.log.length;
    const correct = this.correct;
    const answeredMs = this.log.reduce((a, e) => a + e.ms, 0);
    const totalMs = this.spec.mode === 'sprint' ? Math.round(Math.min(this.timeLimit(), this.elapsed())) : answeredMs;
    return {
      id: `${Date.now().toString(36)}-${Math.floor(this.rng.next() * 1e9).toString(36)}`,
      drillKey: drillKey(this.spec),
      drillName: drillName(this.spec),
      mode: this.spec.mode,
      // Chains record the level reached; techniques the level chosen.
      level: this.spec.kind === 'chain' || this.spec.ladder ? this.peak : this.spec.level,
      correct,
      attempted,
      accuracy: attempted ? this.firstTry / attempted : 0,
      bestStreak: this.bestStreak,
      totalMs,
      avgMs: attempted ? Math.round(answeredMs / attempted) : 0,
      date: Date.now(),
      log: this.log.slice(),
      spec: this.spec,
    };
  }
}
