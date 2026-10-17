import { chainSource } from '../chain/generator';
import { getTechnique } from '../techniques/registry';
import type { Level, Problem, Rng, Step } from '../techniques/types';
import { isCorrect, makeRng } from '../techniques/util';
import { drillKey, drillName } from './spec';
import type { DrillSpec, ProblemSource, RunEntry, RunRecord } from './types';

export const SPRINT_MS = 60_000;
export const TWENTY = 20;
/** Correct answers in a row at a level before the drill steps up toward the chosen level. */
export const RAMP_STREAK = 3;
/** Time a correct answer adds to a sprint; chains take longer, so they earn more. */
export const BONUS_MS = 2_000;
export const CHAIN_BONUS_MS = 4_000;

export function sourcesFor(spec: DrillSpec): ProblemSource[] {
  if (spec.kind === 'chain') return [chainSource];
  return spec.ids.map((id) => {
    const t = getTechnique(id)!;
    return { id, name: t.meta.name, generate: t.generate, steps: t.steps };
  });
}

export interface Attempt {
  ok: boolean;
  problem: Problem;
  input: string;
  ms: number;
  /** Sprint time this answer added. */
  bonusMs: number;
  /** Set when this answer moved the drill up a level. */
  levelUp?: Level;
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
  private streak = 0;
  /**
   * Level problems are generated at. Starts at I and climbs one level after every
   * RAMP_STREAK correct answers in a row, until it reaches the level the player chose.
   */
  level: Level = 1;

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

  /** Pick the next problem, avoiding an immediate repeat of the same text or technique. */
  advance(): Problem {
    const prev = this.current;
    const pool = this.sources.length > 1 && this.source ? this.sources.filter((s) => s !== this.source) : this.sources;
    this.source = this.rng.pick(pool);
    let p = this.source.generate(this.rng, this.level);
    for (let i = 0; i < 8 && prev && p.text === prev.text; i++) p = this.source.generate(this.rng, this.level);
    this.current = p;
    this.shownAt = this.now();
    return p;
  }

  submit(input: string): Attempt {
    return this.record(input, isCorrect(this.current, input), false);
  }

  /** Give up on the current problem: logged as a miss. */
  skip(): Attempt {
    return this.record('', false, true);
  }

  private record(input: string, ok: boolean, skipped: boolean): Attempt {
    const ms = Math.max(0, Math.round(this.now() - this.shownAt));
    const p = this.current;
    this.log.push({ technique: p.technique, text: p.text, answer: p.answer, input, ok, ms, ...(skipped ? { skipped } : {}) });
    let bonusMs = 0;
    if (ok && this.spec.mode === 'sprint' && this.remaining() > 0) {
      bonusMs = p.technique === 'chain' ? CHAIN_BONUS_MS : BONUS_MS;
      this.bonusTotal += bonusMs;
    }
    let levelUp: Level | undefined;
    this.streak = ok ? this.streak + 1 : 0;
    if (this.streak >= RAMP_STREAK && this.level < this.spec.level) {
      this.level = (this.level + 1) as Level;
      this.streak = 0;
      levelUp = this.level;
    }
    if (this.isFinished()) this.endedAt = this.now();
    return { ok, problem: p, input, ms, bonusMs, ...(levelUp ? { levelUp } : {}) };
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
    return SPRINT_MS + this.bonusTotal;
  }

  /** Milliseconds left in a sprint (0 when over); Infinity for other modes. */
  remaining(): number {
    return this.spec.mode === 'sprint' ? Math.max(0, this.timeLimit() - this.elapsed()) : Infinity;
  }

  isFinished(): boolean {
    if (this.spec.mode === 'twenty') return this.log.length >= TWENTY;
    if (this.spec.mode === 'sprint') return this.elapsed() >= this.timeLimit();
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
      level: this.spec.level,
      correct,
      attempted,
      accuracy: attempted ? correct / attempted : 0,
      totalMs,
      avgMs: attempted ? Math.round(answeredMs / attempted) : 0,
      date: Date.now(),
      log: this.log.slice(),
      spec: this.spec,
    };
  }
}
