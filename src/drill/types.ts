import type { Level, Problem, Rng, Step } from '../techniques/types';

export type Mode = 'training' | 'sprint' | 'twenty';

export const MODES: { id: Mode; label: string; short: string }[] = [
  { id: 'training', label: 'Training', short: 'Train' },
  { id: 'sprint', label: '60-second sprint', short: '60 s' },
  { id: 'twenty', label: '20 problems', short: '20 ×' },
];

export type DrillKind = 'technique' | 'mixed' | 'chain';

export interface DrillSpec {
  kind: DrillKind;
  /** Technique ids (one for kind "technique", several for "mixed", none for "chain"). */
  ids: string[];
  level: Level;
  mode: Mode;
}

/** Anything that can produce problems and explain them. */
export interface ProblemSource {
  id: string;
  name: string;
  generate(rng: Rng, level: Level): Problem;
  steps(p: Problem): Step[];
}

export interface RunEntry {
  /** Technique id, or 'chain'. */
  technique: string;
  text: string;
  answer: string;
  input: string;
  ok: boolean;
  /** True when the player skipped or asked to see the solution. */
  skipped?: boolean;
  ms: number;
}

export interface RunRecord {
  id: string;
  /** Leaderboard bucket: drill identity + level. */
  drillKey: string;
  drillName: string;
  mode: Mode;
  level: Level;
  correct: number;
  attempted: number;
  accuracy: number;
  totalMs: number;
  avgMs: number;
  date: number;
  log: RunEntry[];
  /** What was drilled, so the run can be replayed from history. */
  spec?: DrillSpec;
}
