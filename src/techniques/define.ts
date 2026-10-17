import type { Technique } from './types';

/** Identity helper that gives technique modules full type checking. */
export function defineTechnique(t: Technique): Technique {
  return t;
}
