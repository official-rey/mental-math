import type { CategoryId, Technique } from './types';
import { CATEGORIES } from './types';

/** Every file in ./catalog default-exports one Technique. Adding a technique = adding a file. */
const modules = import.meta.glob<{ default: Technique }>('./catalog/*.ts', { eager: true });

export const techniques: Technique[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => {
    const ca = CATEGORIES.findIndex((c) => c.id === a.meta.category);
    const cb = CATEGORIES.findIndex((c) => c.id === b.meta.category);
    return ca - cb || a.meta.order - b.meta.order;
  });

const byId = new Map(techniques.map((t) => [t.meta.id, t]));

export function getTechnique(id: string): Technique | undefined {
  return byId.get(id);
}

export function byCategory(): { id: CategoryId; name: string; items: Technique[] }[] {
  return CATEGORIES.map((c) => ({ ...c, items: techniques.filter((t) => t.meta.category === c.id) })).filter(
    (c) => c.items.length > 0,
  );
}
