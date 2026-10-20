import { techniques, getTechnique } from '../techniques/registry';
import { CHAIN_MAX } from '../chain/generator';
import type { Level } from '../techniques/types';
import type { DrillSpec, Mode } from './types';
import { MODES } from './types';

export { ROMAN } from '../techniques/types';
import { LEVELS, ROMAN } from '../techniques/types';

export function specToHash(s: DrillSpec): string {
  const q = new URLSearchParams({ k: s.kind, l: String(s.level), m: s.mode });
  if (s.ids.length) q.set('ids', s.ids.join(','));
  if (s.known) q.set('f', String(s.known));
  if (s.ladder) q.set('z', '1');
  if (s.from) q.set('s', String(s.from));
  return `#/drill?${q.toString().replace(/%2C/g, ',')}`;
}

export function parseSpec(q: URLSearchParams): DrillSpec | null {
  const kind = q.get('k');
  if (kind !== 'technique' && kind !== 'mixed' && kind !== 'chain') return null;
  const level = Number(q.get('l'));
  const mode = q.get('m') as Mode;
  const ids = (q.get('ids') ?? '').split(',').filter((id) => getTechnique(id));
  if (!MODES.some((m) => m.id === mode)) return null;
  // Chains climb on their own from Level I; the highest level reached before goes by faster.
  if (kind === 'chain') {
    // A picked level: play there. Otherwise Auto: climb from I.
    const from = Number(q.get('s'));
    if (from >= 1 && from <= CHAIN_MAX) return { kind, ids: [], level: from, mode, from };
    return { kind, ids: [], level: CHAIN_MAX, mode, known: Math.min(CHAIN_MAX, Math.max(1, Number(q.get('f')) || 1)) };
  }
  // Challenge: a ladder from Level I to X, climbing on its own.
  if (q.get('z') && (kind === 'technique' ? ids.length === 1 : ids.length > 0)) return { kind, ids, level: 10, mode, ladder: true, known: Math.min(10, Math.max(1, Number(q.get('f')) || 1)) };
  if (!LEVELS.includes(level as Level)) return null;
  if (kind === 'technique' && ids.length !== 1) return null;
  if (kind === 'mixed' && ids.length === 0) return null;
  return { kind, ids, level, mode };
}

export function drillName(s: DrillSpec): string {
  if (s.kind === 'chain') return 'Chains';
  if (s.kind === 'technique') return getTechnique(s.ids[0])!.meta.name;
  return `Mixed · ${s.ids.length} technique${s.ids.length === 1 ? '' : 's'}`;
}

/** Leaderboard bucket for a drill: what is drilled and at which level, independent of mode. */
export function drillKey(s: DrillSpec): string {
  const what =
    s.kind === 'chain' ? 'chain-pemdas' : s.kind === 'technique' ? `t:${s.ids[0]}` : `mixed:${[...s.ids].sort().join('+')}`;
  return `${what}:L${s.level}`;
}

export function describe(s: DrillSpec): string {
  return `${drillName(s)} · Level ${ROMAN[s.level]} · ${MODES.find((m) => m.id === s.mode)!.label}`;
}

/** The drill the home screen's one-tap start launches when nothing has been played yet. */
export function defaultSpec(): DrillSpec {
  const ids = techniques.filter((t) => t.meta.tier === 'Foundation').map((t) => t.meta.id);
  return { kind: 'mixed', ids: ids.length ? ids : techniques.map((t) => t.meta.id), level: 1, mode: 'training' };
}
