import type { DrillSpec, Mode, RunRecord } from '../drill/types';
import type { Level } from '../techniques/types';

export interface Prefs {
  level: Level;
  mode: Mode;
  muted: boolean;
  /** Technique ids picked for the Mixed drill. */
  mixed: string[];
  /** Last drill started, used by the home screen's one-tap start. */
  last?: DrillSpec;
}

export interface SaveResult {
  /** 1-based position on the board, or null if it did not make the top 10. */
  rank: number | null;
  /** True when this run beats every earlier run on the board. */
  isBest: boolean;
}

/**
 * Persistence boundary. Everything is async so a backend can replace the local
 * implementation without touching callers.
 */
export interface Store {
  getPrefs(): Promise<Prefs>;
  setPrefs(patch: Partial<Prefs>): Promise<Prefs>;
  saveRun(run: RunRecord): Promise<SaveResult>;
  topRuns(drillKey: string, mode: Mode, limit?: number): Promise<RunRecord[]>;
  best(drillKey: string, mode: Mode): Promise<RunRecord | null>;
}

export const BOARD_SIZE = 10;

export const DEFAULT_PREFS: Prefs = { level: 1, mode: 'training', muted: false, mixed: [] };

/** Higher is better first. Sprint: most correct, then accuracy. Twenty: most correct, then fastest. */
export function compareRuns(a: RunRecord, b: RunRecord): number {
  if (a.mode === 'twenty') return b.correct - a.correct || a.totalMs - b.totalMs || a.date - b.date;
  return b.correct - a.correct || b.accuracy - a.accuracy || a.avgMs - b.avgMs || a.date - b.date;
}

/** Synchronous key-value backend; localStorage in the browser, a Map in tests. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalStore implements Store {
  private prefix = 'mm:v1:';
  constructor(private kv: KV = safeLocalStorage()) {}

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = this.kv.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown) {
    try {
      this.kv.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: keep going without persistence */
    }
  }

  async getPrefs(): Promise<Prefs> {
    return { ...DEFAULT_PREFS, ...this.read<Partial<Prefs>>('prefs', {}) };
  }

  async setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
    const next = { ...(await this.getPrefs()), ...patch };
    this.write('prefs', next);
    return next;
  }

  private boardKey(drillKey: string, mode: Mode) {
    return `board:${mode}:${drillKey}`;
  }

  async saveRun(run: RunRecord): Promise<SaveResult> {
    if (run.mode === 'training') return { rank: null, isBest: false };
    const key = this.boardKey(run.drillKey, run.mode);
    const board = this.read<RunRecord[]>(key, []);
    const isBest = board.length === 0 || compareRuns(run, board[0]) < 0;
    const next = [...board, run].sort(compareRuns).slice(0, BOARD_SIZE);
    this.write(key, next);
    const idx = next.findIndex((r) => r.id === run.id);
    return { rank: idx < 0 ? null : idx + 1, isBest };
  }

  async topRuns(drillKey: string, mode: Mode, limit = BOARD_SIZE): Promise<RunRecord[]> {
    return this.read<RunRecord[]>(this.boardKey(drillKey, mode), []).slice(0, limit);
  }

  async best(drillKey: string, mode: Mode): Promise<RunRecord | null> {
    return (await this.topRuns(drillKey, mode, 1))[0] ?? null;
  }
}

function safeLocalStorage(): KV {
  try {
    const ls = globalThis.localStorage;
    const probe = '__mm_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}

export const store: Store = new LocalStore();
