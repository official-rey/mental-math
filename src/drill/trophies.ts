import type { RunRecord } from './types';

/** What a trophy check can see: the run just finished and lifetime totals including it. */
export interface TrophyContext {
  run: RunRecord;
  /** Problems solved on this device, all time. */
  solved: number;
  /** Agility rating after the run. */
  rating: number;
}

export interface Trophy {
  id: string;
  name: string;
  /** How to earn it, in a few words. */
  how: string;
  earned(c: TrophyContext): boolean;
}

const timed = (r: RunRecord) => r.mode !== 'training';
const isChain = (r: RunRecord) => r.drillKey.startsWith('chain');

export const TROPHIES: Trophy[] = [
  { id: 'first', name: 'First run', how: 'Finish a run', earned: () => true },
  { id: 'streak10', name: 'Ten in a row', how: '10 right in a row', earned: (c) => (c.run.bestStreak ?? 0) >= 10 },
  { id: 'streak25', name: 'On fire', how: '25 right in a row', earned: (c) => (c.run.bestStreak ?? 0) >= 25 },
  {
    id: 'clean',
    name: 'Clean sheet',
    how: '20 problems, no mistakes',
    earned: (c) => c.run.mode === 'twenty' && c.run.log.length >= 20 && c.run.log.every((e) => e.ok && !e.misses),
  },
  { id: 'minute', name: 'Under a minute', how: '20 problems in under 60 s', earned: (c) => c.run.mode === 'twenty' && c.run.correct === 20 && c.run.totalMs < 60_000 },
  { id: 'sprint20', name: 'Quick hands', how: '20 right in one sprint', earned: (c) => c.run.mode === 'sprint' && c.run.correct >= 20 },
  { id: 'sprint40', name: 'Lightning', how: '40 right in one sprint', earned: (c) => c.run.mode === 'sprint' && c.run.correct >= 40 },
  { id: 'chains', name: 'In the right order', how: 'Reach Chains Level V', earned: (c) => isChain(c.run) && c.run.level >= 5 },
  { id: 'chainsTop', name: 'Order master', how: 'Reach Chains Level X', earned: (c) => isChain(c.run) && c.run.level >= 10 },
  { id: 'top', name: 'Top level', how: 'A timed run at Level VI', earned: (c) => timed(c.run) && !isChain(c.run) && c.run.level === 6 && c.run.correct >= 5 },
  { id: 'endless25', name: 'Survivor', how: '25 solved in Endless', earned: (c) => c.run.mode === 'endless' && c.run.correct >= 25 },
  { id: 'cm', name: 'Candidate Master', how: 'Agility rating 1400', earned: (c) => c.rating >= 1400 },
  { id: 'gm', name: 'Grandmaster', how: 'Agility rating 2000', earned: (c) => c.rating >= 2000 },
  { id: 'hundred', name: 'Hundred', how: '100 problems solved', earned: (c) => c.solved >= 100 },
  { id: 'thousand', name: 'Thousand', how: '1,000 problems solved', earned: (c) => c.solved >= 1000 },
];

/** Trophies this run earns that were not held before, in list order. */
export function newTrophies(c: TrophyContext, held: string[]): Trophy[] {
  return TROPHIES.filter((t) => !held.includes(t.id) && t.earned(c));
}
